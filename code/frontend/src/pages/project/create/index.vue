<!-- 新建项目页 -->
<template>
  <div>
    <IxContentHeader :header-title="isEditMode ? '编辑项目' : '新建项目'">
      <IxButton variant="secondary" @click="saveDraft">保存草稿</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 流程步骤指示器 -->
        <div class="workflow-steps-container">
          <IxWorkflowSteps>
            <IxWorkflowStep 
              v-for="(step, index) in workflowSteps" 
              :key="index"
              :status="getStepStatus(index) as 'done' | 'open' | undefined"
              :disabled="index > currentStep"
              @click="handleStepClick(index)"
            >
              {{ step.title }}
            </IxWorkflowStep>
          </IxWorkflowSteps>
        </div>

        <!-- 表单内容区域 -->
        <div class="form-container">
          <!-- 第一步：基本信息 -->
          <BasicInfoStep 
            v-if="currentStep === 0" 
            :form-data="formData"
            :customer-options="customerOptions"
            @update:project-name="formData.projectName = $event"
            @update:customer-id="formData.customerId = $event"
            @update:factory="formData.factory = $event"
            @update:project-manager-id="formData.projectManagerId = $event"
            @update:chief-engineer-id="formData.chiefEngineerId = $event"
            @update:execution-engineers="formData.executionEngineers = $event"
          />

          <!-- 第二步：选择设备 -->
          <DeviceSelectionStep
            v-if="currentStep === 1"
            :customer-id="formData.customerId"
            :factory="formData.factory"
            :project-devices="deviceList"
            :get-category-name="getCategoryName"
            :get-sub-category-name="getSubCategoryName"
            @add-devices="handleAddDevices"
            @show-add-modal="showAddDeviceModal = true"
            @edit-device="editDevice"
            @remove-device="removeDevice"
            @clear-devices="clearDeviceList"
          />

          <!-- 第三步：匹配方案 -->
          <SchemeMatchingStep
            v-if="currentStep === 2"
            :devices="deviceList"
            :matched-scheme-cards="matchedSchemeCards"
            :equipment-scheme-rows="equipmentSchemeRows"
            :peripheral-workshop-rows="peripheralWorkshopRows"
            :loading-matched="loadingMatchedTemplates"
            :selected-scheme-id="formData.maintenanceSchemeId"
            :scheme-tree-model="schemeTreeModel"
            :scheme-tree-context="schemeTreeContext"
            @select-scheme="handleSelectScheme"
            @update-equipment-scheme="handleUpdateEquipmentScheme"
            @update-peripheral="handleUpdatePeripheralScheme"
            @update-tree-context="schemeTreeContext = $event"
          />

          <!-- 第四步：调整方案 -->
          <SchemeAdjustmentStep
            v-if="currentStep === 3"
            :adjusted-scheme-tree-model="adjustedSchemeTreeModel"
            :adjusted-scheme-tree-context="adjustedSchemeTreeContext"
            :original-scheme-items="originalSchemeItems"
            :devices="deviceList"
            :matched-scheme-cards="matchedSchemeCards"
            :peripheral-scheme-cards="peripheralSelectedSchemeCards"
            :selected-scheme-id="formData.maintenanceSchemeId"
            @update-tree-context="adjustedSchemeTreeContext = $event"
            @reset-scheme="resetScheme"
            @add-custom-item="addCustomItem"
            @update-items="adjustedSchemeItems = $event"
            @select-scheme="handleSelectScheme"
          />

          <!-- 第五步：确认方案 -->
          <SchemeConfirmationStep
            v-if="currentStep === 4"
            :form-data="formData"
            :devices="deviceList"
            :adjusted-scheme-items="adjustedSchemeItems"
            :checked-items="checkedItems"
            :equipment-scheme-rows="equipmentSchemeRows"
            :peripheral-workshop-rows="peripheralWorkshopRows"
            :customer-options="customerOptions"
          />

          <!-- 操作按钮 -->
          <div class="form-actions">
            <IxButton 
              variant="secondary" 
              @click="handlePrevious"
              :disabled="currentStep === 0"
            >
              上一步
            </IxButton>
            <IxButton 
              variant="primary" 
              :disabled="isSubmittingProject"
              @click="handleNext"
            >
              {{ currentStep === 4 ? (isSubmittingProject ? '提交中…' : (isEditMode ? '保存修改' : '创建项目')) : '下一步' }}
            </IxButton>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 手动创建设备模态框 -->
    <AddDeviceModal
      v-model="showAddDeviceModal"
      :editing-device="editingDevice"
      @submit="handleDeviceSubmit"
    />

    <div v-if="submitProgress.visible" class="submit-progress-mask">
      <div class="submit-progress-card">
        <div class="submit-progress-title">正在{{ isEditMode ? '保存修改' : '创建项目' }}</div>
        <div class="submit-progress-message">{{ submitProgress.message }}</div>
        <div class="submit-progress-track">
          <div class="submit-progress-fill" :style="{ width: `${submitProgress.percent}%` }"></div>
        </div>
        <div class="submit-progress-percent">{{ submitProgress.percent }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TreeModel, TreeContext } from '@siemens/ix';
import {
  IxContentHeader,
  IxButton,
  IxWorkflowStep,
  IxWorkflowSteps,
  showToast,
} from '@siemens/ix-vue';
import {
  equipmentsApi,
  inspectionTemplatesApi,
  projectEquipmentsApi,
  projectsApi,
} from '@/api';
import type { InspectionTemplateDto } from '@/api/modules/inspectionTemplates';
import type { ProjectDto } from '@/api/modules/projects';
import {
  isTemplateApiId,
  templateDtoToFormAndAtomic,
} from '@/pages/scheme/utils/schemeInspectionTemplate';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import {
  searchTemplatesForProjectDevices,
  searchPeripheralTemplatesByWorkshop,
  INSPECTION_TYPE_EQUIPMENT,
  workshopKey,
  workshopLabel,
} from './utils/matchInspectionTemplates';
import { mapEquipmentToSelectable } from './utils/equipmentSelection';
import {
  saveProjectSchemeSelection,
  loadProjectSchemeSelection,
  type ProjectSchemeSelectionV1,
} from '@/pages/project/utils/projectSchemeSelectionStorage';
import { loadCustomerSelectOptions } from '@/pages/project/utils/loadCustomerSelectOptions';
import {
  convertSchemeItemsToTreeModel,
  getAllRequiredItemIdsFromSchemeTree,
} from '@/pages/project/utils/schemeTreeModel';
import { syncProjectInspectionTasksFromWizard } from './utils/syncProjectInspectionTasks';
import type { SchemeItem } from '@/pages/scheme/utils/schemeUtils';
import BasicInfoStep from './components/BasicInfoStep.vue';
import DeviceSelectionStep from './components/DeviceSelectionStep.vue';
import SchemeMatchingStep from './components/SchemeMatchingStep.vue';
import SchemeAdjustmentStep from './components/SchemeAdjustmentStep.vue';
import SchemeConfirmationStep from './components/SchemeConfirmationStepV3.vue';
import AddDeviceModal from './components/AddDeviceModal.vue';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';

const router = useRouter();
const route = useRoute();

const editProjectId = computed<number | null>(() => {
  const raw = route.query.id ?? route.query.projectId;
  if (raw == null) return null;
  const n = Number.parseInt(String(raw), 10);
  return Number.isNaN(n) ? null : n;
});

const isEditMode = computed(() => String(route.query.mode ?? '') === 'edit' && editProjectId.value != null);

const loadedProject = ref<ProjectDto | null>(null);

// 流程步骤定义
const workflowSteps = [
  { title: '基本信息', description: '填写项目基本信息' },
  { title: '选择设备', description: '手动创建或批量导入设备' },
  { title: '匹配方案', description: '根据设备信息匹配维护方案' },
  { title: '调整方案', description: '调整维护方案' },
  { title: '确认方案', description: '预览并确认最终方案' },
];

const currentStep = ref(0);
const isSubmittingProject = ref(false);
const submitProgress = ref({ visible: false, percent: 0, message: '' });

function setSubmitProgress(percent: number, message: string) {
  submitProgress.value = {
    visible: true,
    percent: Math.max(0, Math.min(100, Math.floor(percent))),
    message,
  };
}

const customerOptions = ref<{ label: string; value: string }[]>([]);

async function loadCustomerOptions() {
  customerOptions.value = await loadCustomerSelectOptions();
}

// 表单数据
const formData = ref({
  projectName: '',
  customerId: '',
  factory: '',
  projectManagerId: '',
  chiefEngineerId: '',
  executionEngineers: [] as string[],
  maintenanceSchemeId: '',
});

// 设备列表
interface Device {
  id: string;
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  assignedEngineerId?: string;
  factoryName?: string;
  workshopName?: string;
}

const deviceList = ref<Device[]>([]);
const showAddDeviceModal = ref(false);
const editingDeviceIndex = ref<number | null>(null);

async function loadProjectDevicesForWizard(projectId: number, companyid: number) {
  try {
    const list = await equipmentsApi.listEquipmentsByProject(projectId);
    const cid = String(companyid);
    deviceList.value = list.map((e) => {
      const s = mapEquipmentToSelectable(e, cid);
      return {
        id: s.id,
        categoryId: s.categoryId,
        subCategoryId: s.subCategoryId,
        model: s.model,
        quantity: s.quantity,
        factoryName: s.factoryName,
        workshopName: s.workshopName,
      };
    });
    const fac = deviceList.value.find((d) => (d.factoryName ?? '').trim())?.factoryName?.trim();
    if (fac && !(formData.value.factory ?? '').trim()) {
      formData.value.factory = fac;
    }
  } catch (e) {
    deviceList.value = [];
    showToast({ message: e instanceof Error ? e.message : '项目设备列表加载失败' });
  }
}

async function loadProjectForEdit() {
  if (!isEditMode.value || editProjectId.value == null) return;
  try {
    const dto = await projectsApi.getProject(editProjectId.value);
    loadedProject.value = dto;
    formData.value.projectName = dto.projectname ?? '';
    formData.value.customerId = String(dto.companyid ?? '');
    formData.value.projectManagerId = dto.managerid != null ? String(dto.managerid) : '';
    formData.value.chiefEngineerId = dto.assigneduserid != null ? String(dto.assigneduserid) : '';
    await loadProjectDevicesForWizard(editProjectId.value, dto.companyid);
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '项目数据加载失败' });
  }
}

onMounted(() => {
  void (async () => {
    await loadCustomerOptions();
    await loadProjectForEdit();
  })();
});

watch(
  () => [String(route.query.mode ?? ''), String(route.query.id ?? ''), String(route.query.projectId ?? '')] as const,
  () => {
    if (isEditMode.value && editProjectId.value != null) {
      void loadProjectForEdit();
    }
  },
);

// 方案相关
const schemeTreeModel = ref<TreeModel<any> | undefined>();
const schemeTreeContext = ref<TreeContext | undefined>();
const adjustedSchemeTreeModel = ref<TreeModel<any> | undefined>();
const adjustedSchemeTreeContext = ref<TreeContext | undefined>();
const checkedItems = ref<string[]>([]);
const originalSchemeItems = ref<any[]>([]);
const adjustedSchemeItems = ref<any[]>([]);

/** 设备检测模板（全项目设备合并匹配） */
const matchedEquipmentTemplates = ref<InspectionTemplateDto[]>([]);
/** 设备检测模板：按“产品型号（含分类）”分组匹配结果 */
const equipmentTemplatesByModel = ref<Record<string, InspectionTemplateDto[]>>({});
/** 每个型号行当前选中的设备模板 id */
const equipmentSchemeIdByModel = ref<Record<string, string>>({});
/** 外围检测模板：按车间 key（factory\\tworkshop）分组 */
const peripheralTemplatesByWorkshop = ref<Record<string, InspectionTemplateDto[]>>({});
/** 各车间选中的外围模板 id */
const peripheralSchemeIdByWorkshop = ref<Record<string, string>>({});
const loadingMatchedTemplates = ref(false);

const matchedSchemeCards = computed(() =>
  (() => {
    const picked = new Map<number, InspectionTemplateDto>();
    for (const [k, selectedId] of Object.entries(equipmentSchemeIdByModel.value)) {
      const id = String(selectedId ?? '').trim();
      if (!id) continue;
      const opts = equipmentTemplatesByModel.value[k] ?? [];
      const hit = opts.find((t) => String(t.templateid) === id);
      if (hit) picked.set(hit.templateid, hit);
    }
    if (picked.size === 0) {
      for (const t of matchedEquipmentTemplates.value) {
        picked.set(t.templateid, t);
      }
    }
    return [...picked.values()].map((t) => ({
      id: String(t.templateid),
      name: t.name?.trim() ? (t.name as string) : `模板 #${t.templateid}`,
      model: t.mlfb?.trim() ? (t.mlfb as string) : '-',
      schemeKind: 'equipment' as const,
    }));
  })(),
);

function equipmentModelKey(d: Device): string {
  return `${d.categoryId}\t${d.subCategoryId}\t${(d.model ?? '').trim()}`;
}

function equipmentModelLabel(d: Device): string {
  const model = (d.model ?? '').trim() || '未填写型号';
  const cat = getCategoryName(d.categoryId);
  const sub = getSubCategoryName(d.categoryId, d.subCategoryId);
  return `${model}（${cat} / ${sub}）`;
}

const equipmentSchemeRows = computed(() => {
  const modelMap = new Map<
    string,
    { label: string; deviceCount: number; options: InspectionTemplateDto[]; selectedId: string }
  >();
  for (const d of deviceList.value) {
    const key = equipmentModelKey(d);
    const prev = modelMap.get(key);
    if (prev) {
      prev.deviceCount += d.quantity || 0;
      continue;
    }
    modelMap.set(key, {
      label: equipmentModelLabel(d),
      deviceCount: d.quantity || 0,
      options: equipmentTemplatesByModel.value[key] ?? [],
      selectedId: equipmentSchemeIdByModel.value[key] ?? '',
    });
  }
  return [...modelMap.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      deviceCount: v.deviceCount,
      selectedId: v.selectedId,
      options: v.options.map((t) => ({
        id: String(t.templateid),
        name: t.name?.trim() ? (t.name as string) : `模板 #${t.templateid}`,
        model: t.mlfb?.trim() ? (t.mlfb as string) : '-',
      })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
});

const peripheralWorkshopRows = computed(() => {
  const rec = peripheralTemplatesByWorkshop.value;
  return Object.keys(rec)
    .map((key) => {
      const opts = rec[key] ?? [];
      const d = deviceList.value.find((x) => workshopKey(x) === key);
      const label = d ? workshopLabel(d) : key.replace(/\t/g, ' / ');
      return {
        key,
        label,
        options: opts.map((t) => ({
          id: String(t.templateid),
          name: t.name?.trim() ? (t.name as string) : `模板 #${t.templateid}`,
          model: t.mlfb?.trim() ? (t.mlfb as string) : '-',
        })),
        selectedId: peripheralSchemeIdByWorkshop.value[key] ?? '',
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
});

const peripheralSelectedSchemeCards = computed(() => {
  const rows: { id: string; name: string; model: string; schemeKind: 'peripheral'; workshopLabel: string }[] = [];
  for (const [key, tid] of Object.entries(peripheralSchemeIdByWorkshop.value)) {
    const id = String(tid ?? '').trim();
    if (!id) continue;
    const opts = peripheralTemplatesByWorkshop.value[key] ?? [];
    const t = opts.find((x) => String(x.templateid) === id);
    if (!t) continue;
    const d = deviceList.value.find((x) => workshopKey(x) === key);
    rows.push({
      id,
      name: t.name?.trim() ? (t.name as string) : `模板 #${id}`,
      model: t.mlfb?.trim() ? (t.mlfb as string) : '-',
      schemeKind: 'peripheral',
      workshopLabel: d ? workshopLabel(d) : key.replace(/\t/g, ' / '),
    });
  }
  rows.sort((a, b) => a.workshopLabel.localeCompare(b.workshopLabel, 'zh-CN'));
  return rows;
});

/** 避免对 deviceList 使用 deep watch（易与异步方案加载叠加导致更新阶段异常） */
const deviceListMatchFingerprint = computed(
  () =>
    `${deviceList.value.length}:` +
    [...deviceList.value]
      .map(
        (d) =>
          `${d.categoryId}\t${d.subCategoryId}\t${(d.factoryName ?? '').trim()}\t${(d.workshopName ?? '').trim()}`,
      )
      .sort()
      .join('|'),
);

let refreshMatchedSeq = 0;

/**
 * 无设备检测模板候选时，用已选外围方案作为向导「主方案」id（树预览、调整、确认共用）。
 * 多车间且选了不同外围模板时，按车间 key 排序取第一个作为当前树（与确认页各车间摘要并存）。
 */
function syncPrimarySchemeFromPeripheralOnly() {
  if (matchedEquipmentTemplates.value.length > 0) return;

  const picked: { key: string; id: string }[] = [];
  for (const [key, tid] of Object.entries(peripheralSchemeIdByWorkshop.value)) {
    const id = String(tid ?? '').trim();
    if (!id) continue;
    const opts = peripheralTemplatesByWorkshop.value[key] ?? [];
    if (opts.some((t) => String(t.templateid) === id)) {
      picked.push({ key, id });
    }
  }
  if (picked.length === 0) {
    formData.value.maintenanceSchemeId = '';
    return;
  }
  const uniqueIds = [...new Set(picked.map((p) => p.id))];
  if (uniqueIds.length === 1) {
    formData.value.maintenanceSchemeId = uniqueIds[0];
    return;
  }
  picked.sort((a, b) => a.key.localeCompare(b.key));
  formData.value.maintenanceSchemeId = picked[0].id;
}

function syncPrimarySchemeFromEquipmentRows() {
  const picked: { key: string; id: string }[] = [];
  for (const [key, tid] of Object.entries(equipmentSchemeIdByModel.value)) {
    const id = String(tid ?? '').trim();
    if (!id) continue;
    const opts = equipmentTemplatesByModel.value[key] ?? [];
    if (opts.some((t) => String(t.templateid) === id)) {
      picked.push({ key, id });
    }
  }
  if (picked.length === 0) {
    formData.value.maintenanceSchemeId = '';
    return;
  }
  const uniqueIds = [...new Set(picked.map((x) => x.id))];
  if (uniqueIds.length === 1) {
    formData.value.maintenanceSchemeId = uniqueIds[0];
    return;
  }
  picked.sort((a, b) => a.key.localeCompare(b.key));
  formData.value.maintenanceSchemeId = picked[0].id;
}

async function refreshMatchedTemplates() {
  const seq = ++refreshMatchedSeq;

  if (deviceList.value.length === 0) {
    matchedEquipmentTemplates.value = [];
    equipmentTemplatesByModel.value = {};
    equipmentSchemeIdByModel.value = {};
    peripheralTemplatesByWorkshop.value = {};
    peripheralSchemeIdByWorkshop.value = {};
    formData.value.maintenanceSchemeId = '';
    loadingMatchedTemplates.value = false;
    return;
  }

  loadingMatchedTemplates.value = true;
  try {
    const modelGroups = new Map<string, Device[]>();
    for (const d of deviceList.value) {
      const key = equipmentModelKey(d);
      const list = modelGroups.get(key) ?? [];
      list.push(d);
      modelGroups.set(key, list);
    }
    const [equipByModelEntries, perMap] = await Promise.all([
      Promise.all(
        [...modelGroups.entries()].map(async ([key, list]) => [
          key,
          await searchTemplatesForProjectDevices(list, INSPECTION_TYPE_EQUIPMENT),
        ] as const),
      ),
      searchPeripheralTemplatesByWorkshop(deviceList.value),
    ]);
    if (seq !== refreshMatchedSeq) return;

    equipmentTemplatesByModel.value = Object.fromEntries(equipByModelEntries);
    const mergedEquip = new Map<number, InspectionTemplateDto>();
    for (const [, opts] of equipByModelEntries) {
      for (const t of opts) mergedEquip.set(t.templateid, t);
    }
    matchedEquipmentTemplates.value = [...mergedEquip.values()];
    peripheralTemplatesByWorkshop.value = Object.fromEntries(perMap);

    const prevEquipment = { ...equipmentSchemeIdByModel.value };
    const nextEquipment: Record<string, string> = {};
    for (const [key, opts] of equipByModelEntries) {
      if (!opts || opts.length === 0) continue;
      const prev = prevEquipment[key];
      const prevValid = prev && opts.some((t) => String(t.templateid) === prev);
      if (opts.length === 1) {
        nextEquipment[key] = String(opts[0].templateid);
      } else if (prevValid) {
        nextEquipment[key] = prev;
      } else {
        nextEquipment[key] = '';
      }
    }
    equipmentSchemeIdByModel.value = nextEquipment;

    const prevPeripheral = { ...peripheralSchemeIdByWorkshop.value };
    const nextPeripheral: Record<string, string> = {};
    for (const key of Object.keys(peripheralTemplatesByWorkshop.value)) {
      const opts = peripheralTemplatesByWorkshop.value[key] ?? [];
      if (opts.length === 0) continue;
      const prev = prevPeripheral[key];
      const prevValid = prev && opts.some((t) => String(t.templateid) === prev);
      if (opts.length === 1) {
        nextPeripheral[key] = String(opts[0].templateid);
      } else if (prevValid) {
        nextPeripheral[key] = prev;
      } else {
        nextPeripheral[key] = '';
      }
    }
    // 编辑模式：用本地快照补全「尚未有有效选中」的车间；不得覆盖用户在本轮向导里已选中的外围模板
    // （否则从步骤 2 进入 3 时 currentStep 触发刷新，会把刚改的外围方案写回旧快照）
    if (isEditMode.value && editProjectId.value != null) {
      const stored = loadProjectSchemeSelection(editProjectId.value);
      if (stored?.peripheralRows?.length) {
        for (const row of stored.peripheralRows) {
          const tid = String(row.templateId ?? '').trim();
          if (!tid) continue;
          let wk = String(row.workshopKey ?? '').trim();
          if (!wk) {
            const label = String(row.workshopLabel ?? '').trim();
            const d = deviceList.value.find((x) => workshopLabel(x) === label);
            if (d) wk = workshopKey(d);
          }
          if (!wk || !(wk in nextPeripheral)) continue;
          const opts = peripheralTemplatesByWorkshop.value[wk] ?? [];
          if (!opts.some((t) => String(t.templateid) === tid)) continue;
          const prevPick = String(prevPeripheral[wk] ?? '').trim();
          const userAlreadyHasValidPick =
            prevPick !== '' && opts.some((t) => String(t.templateid) === prevPick);
          if (userAlreadyHasValidPick) continue;
          nextPeripheral[wk] = tid;
        }
      }
    }
    peripheralSchemeIdByWorkshop.value = nextPeripheral;

    if (matchedEquipmentTemplates.value.length === 0) {
      syncPrimarySchemeFromPeripheralOnly();
    } else {
      syncPrimarySchemeFromEquipmentRows();
    }
  } catch (e) {
    if (seq !== refreshMatchedSeq) return;
    showToast({ message: e instanceof Error ? e.message : '方案匹配失败' });
  } finally {
    if (seq === refreshMatchedSeq) {
      loadingMatchedTemplates.value = false;
    }
  }
}

watch(
  () => [deviceListMatchFingerprint.value, currentStep.value] as const,
  () => {
    void refreshMatchedTemplates();
  },
);

// 辅助方法
const getCategoryName = (categoryId: string) => {
  const category = productCategoriesData.categories.find(c => c.id === categoryId);
  return category?.name || '-';
};

const getSubCategoryName = (categoryId: string, subCategoryId: string) => {
  const category = productCategoriesData.categories.find(c => c.id === categoryId);
  const subCategory = category?.subCategories.find(sc => sc.id === subCategoryId);
  return subCategory?.name || '-';
};

// 设备管理
const handleAddDevices = (devices: Device[]) => {
  devices.forEach(device => {
    const exists = deviceList.value.some(d => 
      d.model === device.model && 
      d.factoryName === device.factoryName &&
      d.workshopName === device.workshopName
    );
    if (!exists) {
      deviceList.value.push(device);
    }
  });
};

const editDevice = (index: number) => {
  editingDeviceIndex.value = index;
  showAddDeviceModal.value = true;
};

const removeDevice = (index: number) => {
  if (confirm('确定要删除这台设备吗？')) {
    deviceList.value.splice(index, 1);
  }
};

const clearDeviceList = () => {
  if (confirm('确定要清空所有设备吗？')) {
    deviceList.value = [];
  }
};

const handleDeviceSubmit = (deviceData: {
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
  quantity: number;
}) => {
  const keepId =
    editingDeviceIndex.value !== null
      ? deviceList.value[editingDeviceIndex.value]?.id
      : undefined;
  const device: Device = {
    id: keepId && String(keepId).trim() ? String(keepId) : `device-${Date.now()}`,
    ...deviceData,
  };

  if (editingDeviceIndex.value !== null) {
    deviceList.value[editingDeviceIndex.value] = device;
    editingDeviceIndex.value = null;
  } else {
    deviceList.value.push(device);
  }
  
  showAddDeviceModal.value = false;
};

const editingDevice = computed(() => {
  if (editingDeviceIndex.value === null) return null;
  return deviceList.value[editingDeviceIndex.value];
});

// 方案管理
const handleSelectScheme = (schemeId: string) => {
  const nextSchemeId = String(schemeId ?? '').trim();
  const currentSchemeId = String(formData.value.maintenanceSchemeId ?? '').trim();
  if (!nextSchemeId) return;
  if (currentSchemeId === nextSchemeId) {
    // 同一方案也允许手动强制刷新，避免“卡片点击无效”的体感
    void applySchemeTreeFromSchemeId(nextSchemeId);
    return;
  }
  // 切换方案时先清空旧树，避免“点了卡片但下方仍是旧检测项”的错觉
  schemeTreeModel.value = undefined;
  adjustedSchemeTreeModel.value = undefined;
  originalSchemeItems.value = [];
  adjustedSchemeItems.value = [];
  checkedItems.value = [];
  formData.value.maintenanceSchemeId = nextSchemeId;
  // 显式触发一次加载，不仅依赖 watch，避免切换时机导致漏刷新
  void applySchemeTreeFromSchemeId(nextSchemeId);
};

function handleUpdateEquipmentScheme(modelKey: string, templateId: string) {
  equipmentSchemeIdByModel.value = {
    ...equipmentSchemeIdByModel.value,
    [modelKey]: templateId,
  };
  syncPrimarySchemeFromEquipmentRows();
}

function handleUpdatePeripheralScheme(workshopKey: string, templateId: string) {
  peripheralSchemeIdByWorkshop.value = {
    ...peripheralSchemeIdByWorkshop.value,
    [workshopKey]: templateId,
  };
  syncPrimarySchemeFromPeripheralOnly();
}

const resetScheme = () => {
  void applySchemeTreeFromSchemeId(formData.value.maintenanceSchemeId);
};

const addCustomItem = () => {
  showToast({ message: '自定义检测项功能预留，当前请通过模板与调整步骤编辑方案树' });
};

let schemeApplySeq = 0;

async function applySchemeTreeFromSchemeId(newSchemeId: string) {
  const seq = ++schemeApplySeq;

  if (!newSchemeId) {
    schemeTreeModel.value = undefined;
    adjustedSchemeTreeModel.value = undefined;
    originalSchemeItems.value = [];
    adjustedSchemeItems.value = [];
    checkedItems.value = [];
    return;
  }
  if (isTemplateApiId(newSchemeId)) {
    const templateId = Number.parseInt(newSchemeId, 10);
    try {
      let items: any[] = [];

      // 1) 优先按 templateId 直接加载检测项（与方案查看页一致）
      try {
        const apiItems = await loadTemplateItemsByTemplateId(templateId);
        if (seq !== schemeApplySeq) return;
        if (apiItems.length > 0) {
          items = apiItems;
        }
      } catch {
        /* ignore，走后续兜底 */
      }

      // 2) 若无检测项，再尝试读模板详情中的嵌入结构
      if (items.length === 0) {
        try {
          const dto = await inspectionTemplatesApi.getInspectionTemplate(templateId);
          if (seq !== schemeApplySeq) return;
          const { atomic } = templateDtoToFormAndAtomic(dto);
          items = Array.isArray(atomic.items) ? atomic.items : [];
        } catch {
          /* ignore，走最终兜底 */
        }
      }

      // 3) 最终兜底：至少给出一个根节点，避免“匹配到了但无法预览”
      if (items.length === 0) {
        items = [
          {
            id: `tpl-${templateId}-root`,
            name: '检测项（模板暂无明细）',
            required: true,
            children: [],
          },
        ];
      }

      schemeTreeModel.value = convertSchemeItemsToTreeModel(items as SchemeItem[]);
      adjustedSchemeTreeModel.value = convertSchemeItemsToTreeModel(items as SchemeItem[]);
      checkedItems.value = getAllRequiredItemIdsFromSchemeTree(adjustedSchemeTreeModel.value);
      originalSchemeItems.value = JSON.parse(JSON.stringify(items));
      adjustedSchemeItems.value = JSON.parse(JSON.stringify(items));
    } catch (e) {
      if (seq !== schemeApplySeq) return;
      showToast({ message: e instanceof Error ? e.message : '方案内容加载失败' });
      schemeTreeModel.value = undefined;
      adjustedSchemeTreeModel.value = undefined;
      originalSchemeItems.value = [];
      adjustedSchemeItems.value = [];
      checkedItems.value = [];
    }
    return;
  }

  if (seq !== schemeApplySeq) return;

  const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
  const scheme = schemes.find((s) => s.id === newSchemeId);
  if (scheme && scheme.items) {
    schemeTreeModel.value = convertSchemeItemsToTreeModel(scheme.items as SchemeItem[]);
    adjustedSchemeTreeModel.value = convertSchemeItemsToTreeModel(scheme.items as SchemeItem[]);
    checkedItems.value = getAllRequiredItemIdsFromSchemeTree(adjustedSchemeTreeModel.value);
    originalSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
    adjustedSchemeItems.value = JSON.parse(JSON.stringify(scheme.items));
  } else {
    schemeTreeModel.value = undefined;
    adjustedSchemeTreeModel.value = undefined;
    originalSchemeItems.value = [];
    adjustedSchemeItems.value = [];
    checkedItems.value = [];
  }
}

watch(
  () => formData.value.maintenanceSchemeId,
  (newSchemeId) => {
    void applySchemeTreeFromSchemeId(newSchemeId ?? '');
  },
);

// 步骤管理
const getStepStatus = (index: number): 'done' | 'open' | undefined => {
  if (index < currentStep.value) {
    return 'done';
  } else if (index === currentStep.value) {
    return 'open';
  } else {
    return undefined;
  }
};

const handleStepClick = (index: number) => {
  if (index <= currentStep.value) {
    currentStep.value = index;
  }
};

const handlePrevious = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const handleNext = () => {
  // 表单验证
  if (currentStep.value === 0) {
    if (!formData.value.customerId) {
      alert('请填写完整的基本信息');
      return;
    }
  } else if (currentStep.value === 1) {
    if (deviceList.value.length === 0) {
      alert('请至少添加一台设备');
      return;
    }
  } else if (currentStep.value === 2) {
    syncPrimarySchemeFromPeripheralOnly();
    if (!formData.value.maintenanceSchemeId?.trim()) {
      if (matchedEquipmentTemplates.value.length > 0) {
        alert('请单击上方卡片选择「设备检测」维护方案。');
      } else {
        alert(
          '当前未匹配到设备检测模板。请在「各车间外围检测方案」中为每个有候选的车间选择外围方案；外围方案将用于本阶段的方案树预览与编辑。',
        );
      }
      return;
    }
    for (const row of peripheralWorkshopRows.value) {
      if (row.options.length > 0 && !String(row.selectedId ?? '').trim()) {
        alert(`请为「${row.label}」选择外围方案`);
        return;
      }
    }
  }
  
  if (currentStep.value < workflowSteps.length - 1) {
    currentStep.value++;
  } else {
    submitProject();
  }
};

const saveDraft = () => {
  showToast({ message: '草稿功能尚未接入后端，请使用「下一步」完成流程' });
};

function parseOptionalUserId(id: string | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number.parseInt(String(id), 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * 得到可写入 ProjectEquipments 的 equipmentid 列表。
 * - 档案选择的设备：id 为纯数字字符串（equipid）
 * - 手动创建等临时 id：先 POST /api/Equipments，再使用返回的 equipid
 */
async function resolvePersistedEquipmentIds(): Promise<number[]> {
  const companyid = Number.parseInt(formData.value.customerId, 10);
  if (Number.isNaN(companyid)) return [];

  const result: number[] = [];
  for (const d of deviceList.value) {
    const idStr = String(d.id ?? '').trim();
    const numeric = /^(\d+)$/.exec(idStr)?.[1];
    if (numeric) {
      result.push(Number(numeric));
      continue;
    }
    const cat = productCategoriesData.categories.find((c) => c.id === d.categoryId);
    const sub = cat?.subCategories.find((s) => s.id === d.subCategoryId);
    const created = await equipmentsApi.createEquipment({
      companyid,
      factory: (d.factoryName ?? formData.value.factory ?? '').trim() || null,
      workshop: (d.workshopName ?? '').trim() || null,
      equipmentname: d.model || null,
      productcategory: cat?.name ?? null,
      productgroup: sub?.name ?? null,
      number: d.quantity,
    });
    const eqId = created.equipid;
    if (eqId == null || Number.isNaN(Number(eqId)) || Number(eqId) <= 0) {
      throw new Error('新建设备档案失败：未返回有效 equipid');
    }
    d.id = String(eqId);
    result.push(Number(eqId));
  }
  return Array.from(new Set(result));
}

/** 后端 Project：1 进行中（与列表页 PROJECT_STATUS 映射一致） */
const PROJECT_STATUS_IN_PROGRESS = 1;

/** 供项目详情页展示；当前后端未存方案字段，先写入本机 localStorage */
function buildSchemeSelectionForStorage(): ProjectSchemeSelectionV1 {
  const mid = formData.value.maintenanceSchemeId?.trim() ?? '';
  let maintenanceSchemeName = '';
  let maintenanceModel = '';
  const card = matchedSchemeCards.value.find((c) => c.id === mid);
  if (card) {
    maintenanceSchemeName = card.name;
    maintenanceModel = card.model;
  } else {
    for (const opts of Object.values(peripheralTemplatesByWorkshop.value)) {
      const t = opts.find((x) => String(x.templateid) === mid);
      if (t) {
        maintenanceSchemeName = t.name?.trim() ? (t.name as string) : `模板 #${mid}`;
        maintenanceModel = t.mlfb?.trim() ? (t.mlfb as string) : '-';
        break;
      }
    }
    if (!maintenanceSchemeName && mid) {
      maintenanceSchemeName = `模板 #${mid}`;
      maintenanceModel = '-';
    }
  }
  const peripheralRows: ProjectSchemeSelectionV1['peripheralRows'] = [];
  for (const [key, tid] of Object.entries(peripheralSchemeIdByWorkshop.value)) {
    const id = String(tid ?? '').trim();
    if (!id) continue;
    const opts = peripheralTemplatesByWorkshop.value[key] ?? [];
    const t = opts.find((x) => String(x.templateid) === id);
    const d = deviceList.value.find((x) => workshopKey(x) === key);
    peripheralRows.push({
      workshopKey: key,
      workshopLabel: d ? workshopLabel(d) : key.replace(/\t/g, ' / '),
      templateId: id,
      schemeName: t?.name?.trim() || `模板 #${id}`,
    });
  }
  peripheralRows.sort((a, b) => a.workshopLabel.localeCompare(b.workshopLabel, 'zh-CN'));
  return {
    savedAt: new Date().toISOString(),
    maintenanceSchemeId: mid,
    maintenanceSchemeName,
    maintenanceModel,
    peripheralRows,
  };
}

const submitProject = async () => {
  const name = formData.value.projectName?.trim();
  if (!name) {
    alert('请填写项目名称');
    return;
  }
  const companyid = Number.parseInt(formData.value.customerId, 10);
  if (Number.isNaN(companyid)) {
    alert('客户信息无效，请返回第一步重新选择客户');
    return;
  }

  isSubmittingProject.value = true;
  setSubmitProgress(5, '正在校验提交数据...');
  try {
    const managerid = parseOptionalUserId(formData.value.projectManagerId);
    const assigneduserid =
      parseOptionalUserId(formData.value.chiefEngineerId) ??
      parseOptionalUserId(formData.value.executionEngineers[0]);

    const baseCreatedate =
      loadedProject.value?.createdate?.trim() ||
      new Date().toISOString().slice(0, 10);

    const projectid = isEditMode.value && editProjectId.value != null ? editProjectId.value : 0;
    const projectstatus =
      (isEditMode.value ? loadedProject.value?.projectstatus : null) ?? PROJECT_STATUS_IN_PROGRESS;

    const savedId = isEditMode.value
      ? await projectsApi.updateProject({
          projectid,
          projectname: name,
          companyid,
          managerid,
          assigneduserid,
          projectstatus,
          createdate: baseCreatedate,
        })
      : await projectsApi.createProject({
          projectid: 0,
          projectname: name,
          companyid,
          managerid,
          assigneduserid,
          projectstatus,
          createdate: baseCreatedate,
        });

    setSubmitProgress(35, '项目基础信息已保存，正在写入方案选择...');

    saveProjectSchemeSelection(savedId, buildSchemeSelectionForStorage());

    setSubmitProgress(50, '正在同步项目设备关联...');
    const equipIds = await resolvePersistedEquipmentIds();
    /** 新建：有设备才写关联；编辑：即使清空设备也要删光原有关联 */
    const needEquipmentSync = equipIds.length > 0 || isEditMode.value;
    if (needEquipmentSync) {
      try {
        await projectEquipmentsApi.syncProjectEquipmentLinks(savedId, equipIds);
      } catch (linkErr) {
        showToast({
          message:
            linkErr instanceof Error
              ? `${isEditMode.value ? '项目已更新' : '项目已创建'}，但关联设备未保存：${linkErr.message}`
              : `${isEditMode.value ? '项目已更新' : '项目已创建'}，但关联设备未保存`,
        });
        router.push('/project/list');
        return;
      }
    }

    let taskSyncWarning = '';
    try {
      setSubmitProgress(70, '正在生成并同步维护任务...');
      await syncProjectInspectionTasksFromWizard({
        projectId: savedId,
        maintenanceSchemeId: formData.value.maintenanceSchemeId?.trim() ?? '',
        peripheralSchemeIdByWorkshop: { ...peripheralSchemeIdByWorkshop.value },
        equipIds,
        deviceList: deviceList.value.map((d) => ({
          quantity: d.quantity,
          model: d.model,
          serialNumber: d.serialNumber,
          assignedEngineerId: d.assignedEngineerId,
          factoryName: d.factoryName,
          workshopName: d.workshopName,
        })),
        adjustedSchemeItems: adjustedSchemeItems.value as SchemeItem[],
        checkedItemIds: checkedItems.value,
      });
    } catch (taskErr) {
      taskSyncWarning =
        taskErr instanceof Error ? taskErr.message : '巡检任务同步失败';
    }

    const baseOk = isEditMode.value ? '项目更新成功' : '项目创建成功';
    setSubmitProgress(100, taskSyncWarning ? '项目已保存，任务同步部分失败' : '全部保存成功');
    showToast({
      message: taskSyncWarning ? `${baseOk}；但 ${taskSyncWarning}` : baseOk,
    });
    router.push('/project/list');
  } catch (e) {
    showToast({
      message:
        e instanceof Error
          ? e.message
          : isEditMode.value
            ? '更新项目失败'
            : '创建项目失败',
    });
  } finally {
    isSubmittingProject.value = false;
    setTimeout(() => {
      submitProgress.value.visible = false;
    }, 300);
  }
};
</script>

<style scoped>
.page-section {
  padding: 1rem;
}

.page-content {
  max-width: 1400px;
  margin: 0 auto;
}

.workflow-steps-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 0 1.25rem;
}

.form-container {
  padding: 0.5rem;
  background: var(--theme-color-background);
  border-radius: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.submit-progress-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-progress-card {
  width: min(520px, 92vw);
  background: var(--theme-color-background);
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 12px;
  padding: 20px;
}

.submit-progress-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.submit-progress-message {
  color: var(--theme-color-text-soft);
  margin-bottom: 12px;
}

.submit-progress-track {
  height: 8px;
  border-radius: 999px;
  background: var(--theme-color-soft);
  overflow: hidden;
}

.submit-progress-fill {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 200ms ease;
}

.submit-progress-percent {
  margin-top: 8px;
  text-align: right;
  font-size: 13px;
  color: var(--theme-color-text-soft);
}
</style>
