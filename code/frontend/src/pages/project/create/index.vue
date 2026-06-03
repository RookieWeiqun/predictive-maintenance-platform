<!-- 新建项目页 -->
<template>
  <div>
    <IxContentHeader :header-title="isEditMode ? '编辑项目' : '新建项目'">
      <IxButton
        v-if="showBasicInfoSaveButton"
        variant="secondary"
        @click="saveBasicInfo"
      >
        保存
      </IxButton>
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
            :user-options="userOptions"
            @update:project-name="formData.projectName = $event"
            @update:service-id="formData.serviceId = $event"
            @update:customer-id="formData.customerId = $event"
            @update:factory="formData.factory = $event"
            @update:city="formData.city = $event"
            @update:customer-contact="formData.customerContact = $event"
            @update:project-manager-id="formData.projectManagerId = $event"
            @update:chief-engineer-id="formData.chiefEngineerId = $event"
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
            :peripheral-template-options="peripheralTemplateOptions"
            :selected-peripheral-template-id="peripheralSchemeId"
            :electric-room-count="peripheralElectricRoomCount"
            :loading-matched="loadingMatchedTemplates"
            :selected-scheme-id="formData.maintenanceSchemeId"
            :scheme-tree-model="schemeTreeModel"
            :scheme-tree-context="schemeTreeContext"
            @select-scheme="handleSelectScheme"
            @update-equipment-scheme="handleUpdateEquipmentScheme"
            @update-peripheral-scheme="handleUpdatePeripheralScheme"
            @update-electric-room-count="peripheralElectricRoomCount = $event"
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
            :selected-peripheral-scheme="selectedPeripheralTemplate"
            :peripheral-electric-room-count="peripheralElectricRoomCount"
            :customer-options="customerOptions"
            :user-options="userOptions"
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
  inspectionTasksApi,
  inspectionTemplatesApi,
  projectEquipmentsApi,
  projectsApi,
  productsApi,
  reportsApi,
  usersApi,
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
  searchEquipmentTemplatesWithDiagnostics,
  INSPECTION_TYPE_PERIPHERAL,
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
const showBasicInfoSaveButton = computed(() => isEditMode.value && currentStep.value === 0);

const loadedProject = ref<ProjectDto | null>(null);

// 流程步骤定义
const workflowSteps = [
  { title: '基本信息', description: '填写项目基本信息' },
  { title: '选择设备', description: '手动创建或批量导入设备' },
  { title: '匹配方案', description: '根据设备信息匹配维护方案' },
  { title: '调整方案', description: '调整维护方案' },
  { title: '确认方案', description: '预览并确认最终方案' },
];

const PERIPHERAL_ELECTRIC_ROOM_UNKNOWN = '暂时未知';
const peripheralElectricRoomCountOptions = [
  PERIPHERAL_ELECTRIC_ROOM_UNKNOWN,
  '1',
  '2',
  '3',
  '4',
  '5',
] as const;

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
const userOptions = ref<{ label: string; value: string }[]>([]);

async function loadCustomerOptions() {
  customerOptions.value = await loadCustomerSelectOptions();
}

async function loadUserOptions() {
  try {
    const users = await usersApi.listUsers();
    userOptions.value = users
      .filter((item) => item.userid > 0)
      .map((item) => ({
        label: item.username?.trim() || `用户#${item.userid}`,
        value: String(item.userid),
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
  } catch (error) {
    userOptions.value = [];
    showToast({ message: error instanceof Error ? error.message : '用户列表加载失败' });
  }
}

// 表单数据
const formData = ref({
  projectName: '',
  serviceId: '',
  customerId: '',
  factory: '',
  city: '',
  customerContact: '',
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
  electricRoom?: string;
}

const deviceList = ref<Device[]>([]);
const showAddDeviceModal = ref(false);
const editingDeviceIndex = ref<number | null>(null);
const matchedPeripheralTemplates = ref<InspectionTemplateDto[]>([]);
const peripheralSchemeId = ref('');
const peripheralElectricRoomCount = ref<string>(PERIPHERAL_ELECTRIC_ROOM_UNKNOWN);

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
        electricRoom: s.electricRoom,
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
    formData.value.serviceId = dto.serviceid ?? '';
    formData.value.customerId = String(dto.companyid ?? '');
    formData.value.city = dto.city ?? '';
    formData.value.customerContact = dto.customercontact ?? '';
    formData.value.projectManagerId = dto.managerid != null ? String(dto.managerid) : '';
    formData.value.chiefEngineerId = dto.assigneduserid != null ? String(dto.assigneduserid) : '';
    await loadProjectDevicesForWizard(editProjectId.value, dto.companyid);
    await loadEquipmentSchemeSelectionForEdit(editProjectId.value);
    await loadPeripheralSelectionForEdit(editProjectId.value);
    await refreshMatchedTemplates();
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '项目数据加载失败' });
  }
}

onMounted(() => {
  void (async () => {
    await Promise.all([loadCustomerOptions(), loadUserOptions()]);
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
const equipmentMatchDiagnosticsByModel = ref<Record<string, { series: string; size: string; message: string }>>({});
/** 每个型号行当前选中的设备模板 id */
const equipmentSchemeIdByModel = ref<Record<string, string>>({});
const persistedEquipmentSchemeIdByModel = ref<Record<string, string>>({});
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
      series: equipmentMatchDiagnosticsByModel.value[key]?.series ?? '',
      size: equipmentMatchDiagnosticsByModel.value[key]?.size ?? '',
      matchMessage: equipmentMatchDiagnosticsByModel.value[key]?.message ?? '',
      options: v.options.map((t) => ({
        id: String(t.templateid),
        name: t.name?.trim() ? (t.name as string) : `模板 #${t.templateid}`,
        model: t.mlfb?.trim() ? (t.mlfb as string) : '-',
        series: t.series?.trim() ? (t.series as string) : '-',
        size: t.size?.trim() ? (t.size as string) : '-',
      })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
});

const peripheralTemplateOptions = computed(() =>
  matchedPeripheralTemplates.value
    .map((template) => ({
      id: String(template.templateid),
      name: template.name?.trim() ? (template.name as string) : `模板 #${template.templateid}`,
      model: template.mlfb?.trim() ? (template.mlfb as string) : '-',
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
);

const selectedPeripheralTemplate = computed(() => {
  const selectedId = String(peripheralSchemeId.value ?? '').trim();
  if (!selectedId) return null;
  return peripheralTemplateOptions.value.find((item) => item.id === selectedId) ?? null;
});

const peripheralSelectedSchemeCards = computed(() => {
  if (!selectedPeripheralTemplate.value) return [];
  return [{
    ...selectedPeripheralTemplate.value,
    schemeKind: 'peripheral' as const,
    workshopLabel: `电气室数量：${peripheralElectricRoomCount.value}`,
  }];
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
 */
function syncPrimarySchemeFromPeripheralOnly() {
  if (matchedEquipmentTemplates.value.length > 0) return;

  const pickedId = String(peripheralSchemeId.value ?? '').trim();
  const isValid = matchedPeripheralTemplates.value.some(
    (template) => String(template.templateid) === pickedId,
  );
  if (!pickedId || !isValid) {
    formData.value.maintenanceSchemeId = '';
    return;
  }
  formData.value.maintenanceSchemeId = pickedId;
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
    equipmentMatchDiagnosticsByModel.value = {};
    equipmentSchemeIdByModel.value = {};
    persistedEquipmentSchemeIdByModel.value = {};
    matchedPeripheralTemplates.value = [];
    peripheralSchemeId.value = '';
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
    const [equipByModelEntries, peripheralTemplates] = await Promise.all([
      Promise.all(
        [...modelGroups.entries()].map(async ([key, list]) => {
          const result = await searchEquipmentTemplatesWithDiagnostics(list);
          return [key, result] as const;
        }),
      ),
      searchTemplatesForProjectDevices(deviceList.value, INSPECTION_TYPE_PERIPHERAL),
    ]);
    if (seq !== refreshMatchedSeq) return;

    equipmentTemplatesByModel.value = Object.fromEntries(
      equipByModelEntries.map(([key, result]) => [key, result.options]),
    );
    equipmentMatchDiagnosticsByModel.value = Object.fromEntries(
      equipByModelEntries.map(([key, result]) => [
        key,
        {
          series: result.series,
          size: result.size,
          message: result.message,
        },
      ]),
    );
    const mergedEquip = new Map<number, InspectionTemplateDto>();
    for (const [, result] of equipByModelEntries) {
      for (const t of result.options) mergedEquip.set(t.templateid, t);
    }
    matchedEquipmentTemplates.value = [...mergedEquip.values()];
    matchedPeripheralTemplates.value = peripheralTemplates;

    const prevEquipment = { ...equipmentSchemeIdByModel.value };
    const persistedEquipment = { ...persistedEquipmentSchemeIdByModel.value };
    const nextEquipment: Record<string, string> = {};
    for (const [key, result] of equipByModelEntries) {
      const opts = result.options;
      if (!opts || opts.length === 0) continue;
      const prev = prevEquipment[key];
      const prevValid = prev && opts.some((t) => String(t.templateid) === prev);
      const persisted = persistedEquipment[key];
      const persistedValid = persisted && opts.some((t) => String(t.templateid) === persisted);
      if (opts.length === 1) {
        nextEquipment[key] = String(opts[0].templateid);
      } else if (prevValid) {
        nextEquipment[key] = prev;
      } else if (isEditMode.value && persistedValid) {
        nextEquipment[key] = persisted;
      } else {
        nextEquipment[key] = '';
      }
    }
    equipmentSchemeIdByModel.value = nextEquipment;

    const currentPeripheralId = String(peripheralSchemeId.value ?? '').trim();
    const currentPeripheralValid = currentPeripheralId && peripheralTemplates.some(
      (template) => String(template.templateid) === currentPeripheralId,
    );
    let nextPeripheralId = '';
    if (peripheralTemplates.length === 1) {
      nextPeripheralId = String(peripheralTemplates[0].templateid);
    } else if (currentPeripheralValid) {
      nextPeripheralId = currentPeripheralId;
    }

    if (isEditMode.value && editProjectId.value != null) {
      const stored = loadProjectSchemeSelection(editProjectId.value);
      const storedPeripheralId = String(stored?.peripheralTemplateId ?? '').trim();
      if (
        !nextPeripheralId
        && storedPeripheralId
        && peripheralTemplates.some((template) => String(template.templateid) === storedPeripheralId)
      ) {
        nextPeripheralId = storedPeripheralId;
      }
      const currentCount = String(peripheralElectricRoomCount.value ?? '').trim();
      if (
        !currentCount
        || !peripheralElectricRoomCountOptions.includes(
          currentCount as (typeof peripheralElectricRoomCountOptions)[number],
        )
      ) {
        const storedCount = String(stored?.peripheralElectricRoomCount ?? '').trim();
        if (
          storedCount
          && peripheralElectricRoomCountOptions.includes(
            storedCount as (typeof peripheralElectricRoomCountOptions)[number],
          )
        ) {
          peripheralElectricRoomCount.value = storedCount;
        }
      }
    }

    peripheralSchemeId.value = nextPeripheralId;

    if (!peripheralSchemeId.value && peripheralTemplates.length === 0 && !isEditMode.value) {
      peripheralElectricRoomCount.value = PERIPHERAL_ELECTRIC_ROOM_UNKNOWN;
    }

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

function handleUpdatePeripheralScheme(templateId: string) {
  peripheralSchemeId.value = String(templateId ?? '').trim();
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

async function loadPeripheralSelectionForEdit(projectId: number): Promise<void> {
  const stored = loadProjectSchemeSelection(projectId);
  const storedCount = String(stored?.peripheralElectricRoomCount ?? '').trim();
  if (
    storedCount
    && peripheralElectricRoomCountOptions.includes(
      storedCount as (typeof peripheralElectricRoomCountOptions)[number],
    )
  ) {
    peripheralElectricRoomCount.value = storedCount;
  } else {
    peripheralElectricRoomCount.value = PERIPHERAL_ELECTRIC_ROOM_UNKNOWN;
  }

  const storedTemplateId = String(stored?.peripheralTemplateId ?? '').trim();
  if (storedTemplateId) {
    peripheralSchemeId.value = storedTemplateId;
  }

  try {
    const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId, productid: 0 });
    const activeTasks = tasks.filter((task) => !task.ifdel);
    if (activeTasks.length > 0) {
      peripheralElectricRoomCount.value =
        activeTasks.length <= 5 ? String(activeTasks.length) : PERIPHERAL_ELECTRIC_ROOM_UNKNOWN;
      const templateId = activeTasks[0]?.templateid;
      peripheralSchemeId.value = templateId != null ? String(templateId) : peripheralSchemeId.value;
    }
  } catch {
    // ignore: edit fallback remains local storage
  }
}

async function loadEquipmentSchemeSelectionForEdit(projectId: number): Promise<void> {
  persistedEquipmentSchemeIdByModel.value = {};

  if (deviceList.value.length === 0) {
    return;
  }

  try {
    const links = await projectEquipmentsApi.listByProject(projectId);
    const templateIdByEquipmentId = new Map<number, string>();
    for (const link of links) {
      if (link.ifdel || link.equipmentid <= 0 || (link.templateid ?? 0) <= 0) {
        continue;
      }
      templateIdByEquipmentId.set(link.equipmentid, String(link.templateid));
    }

    const nextSelections: Record<string, string> = {};
    for (const device of deviceList.value) {
      const equipmentId = Number.parseInt(String(device.id ?? '').trim(), 10);
      if (!Number.isFinite(equipmentId) || equipmentId <= 0) {
        continue;
      }
      const templateId = templateIdByEquipmentId.get(equipmentId);
      if (!templateId) {
        continue;
      }
      const modelKey = equipmentModelKey(device);
      if (!nextSelections[modelKey]) {
        nextSelections[modelKey] = templateId;
      }
    }

    persistedEquipmentSchemeIdByModel.value = nextSelections;
    if (Object.keys(nextSelections).length > 0) {
      equipmentSchemeIdByModel.value = {
        ...equipmentSchemeIdByModel.value,
        ...nextSelections,
      };
    }
  } catch {
    persistedEquipmentSchemeIdByModel.value = {};
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
    if (
      !formData.value.projectName.trim() ||
      !formData.value.customerId ||
      !formData.value.factory.trim()
    ) {
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
        alert('当前未匹配到设备检测模板。请先选择外围检测方案。');
      }
      return;
    }
    if (peripheralTemplateOptions.value.length > 0 && !String(peripheralSchemeId.value ?? '').trim()) {
      alert('请选择外围检测方案');
      return;
    }
    if (
      peripheralElectricRoomCount.value !== PERIPHERAL_ELECTRIC_ROOM_UNKNOWN
      && !String(peripheralSchemeId.value ?? '').trim()
    ) {
      alert('已选择电气室数量时，必须同时选择外围检测方案');
      return;
    }
  }
  
  if (currentStep.value < workflowSteps.length - 1) {
    currentStep.value++;
  } else {
    submitProject();
  }
};

async function saveBasicInfo(): Promise<void> {
  if (!isEditMode.value || editProjectId.value == null) {
    return;
  }

  const name = formData.value.projectName.trim();
  if (!name) {
    alert('请填写项目名称');
    return;
  }

  const companyid = Number.parseInt(formData.value.customerId, 10);
  if (Number.isNaN(companyid)) {
    alert('请选择客户名称');
    return;
  }

  const factory = formData.value.factory.trim();
  if (!factory) {
    alert('请填写工厂信息');
    return;
  }

  try {
    await projectsApi.updateProject({
      projectid: editProjectId.value,
      projectname: name,
      companyid,
      managerid: parseOptionalUserId(formData.value.projectManagerId),
      assigneduserid:
        parseOptionalUserId(formData.value.chiefEngineerId) ??
        parseOptionalUserId(formData.value.executionEngineers[0]),
      projectstatus: loadedProject.value?.projectstatus ?? PROJECT_STATUS_IN_PROGRESS,
      createdate: loadedProject.value?.createdate?.trim() || new Date().toISOString().slice(0, 10),
      ifdel: loadedProject.value?.ifdel ?? false,
      serviceid: formData.value.serviceId.trim() || null,
      city: formData.value.city.trim() || null,
      customercontact: formData.value.customerContact.trim() || null,
      enddate: loadedProject.value?.enddate?.trim() || null,
    });

    loadedProject.value = {
      ...(loadedProject.value ?? {}),
      projectid: editProjectId.value,
      projectname: name,
      companyid,
      managerid: parseOptionalUserId(formData.value.projectManagerId),
      assigneduserid:
        parseOptionalUserId(formData.value.chiefEngineerId) ??
        parseOptionalUserId(formData.value.executionEngineers[0]),
      projectstatus: loadedProject.value?.projectstatus ?? PROJECT_STATUS_IN_PROGRESS,
      createdate: loadedProject.value?.createdate?.trim() || new Date().toISOString().slice(0, 10),
      ifdel: loadedProject.value?.ifdel ?? false,
      serviceid: formData.value.serviceId.trim() || null,
      city: formData.value.city.trim() || null,
      customercontact: formData.value.customerContact.trim() || null,
      enddate: loadedProject.value?.enddate?.trim() || null,
    };

    showToast({ message: '项目基本信息已保存' });
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '项目基本信息保存失败' });
  }
}

function parseOptionalUserId(id: string | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number.parseInt(String(id), 10);
  return Number.isNaN(n) ? null : n;
}

type PersistedEquipmentBinding = {
  equipmentId: number;
  device: Device;
};

async function resolvePersistedEquipmentBindings(): Promise<PersistedEquipmentBinding[]> {
  const companyid = Number.parseInt(formData.value.customerId, 10);
  if (Number.isNaN(companyid)) return [];

  const result: PersistedEquipmentBinding[] = [];
  for (const d of deviceList.value) {
    const idStr = String(d.id ?? '').trim();
    const numeric = /^(\d+)$/.exec(idStr)?.[1];
    if (numeric) {
      result.push({ equipmentId: Number(numeric), device: d });
      continue;
    }
    const cat = productCategoriesData.categories.find((c) => c.id === d.categoryId);
    const sub = cat?.subCategories.find((s) => s.id === d.subCategoryId);
    const created = await equipmentsApi.createEquipment({
      companyid,
      factory: (d.factoryName ?? formData.value.factory ?? '').trim() || null,
      workshop: (d.workshopName ?? '').trim() || null,
      mlfb: d.model || null,
      equipmentname: null,
      productcategory: cat?.name ?? null,
      productgroup: sub?.name ?? null,
      number: d.quantity,
    });
    const eqId = created.equipid;
    if (eqId == null || Number.isNaN(Number(eqId)) || Number(eqId) <= 0) {
      throw new Error('新建设备档案失败：未返回有效 equipid');
    }
    d.id = String(eqId);
    result.push({ equipmentId: Number(eqId), device: d });
  }
  return result;
}

function clipProjectText(text: string): string {
  const normalized = text.trim();
  return normalized.length <= 100 ? normalized : normalized.slice(0, 100);
}

async function ensureProductsForEquipment(binding: PersistedEquipmentBinding): Promise<void> {
  const { equipmentId, device } = binding;
  const existing = await productsApi.searchProducts({ equipmentid: equipmentId });
  const existingIds = existing
    .map((product) => product.productid)
    .filter((id): id is number => id != null && id > 0);
  const requiredCount = Math.max(1, device.quantity);
  if (existingIds.length >= requiredCount) {
    return;
  }

  let createdCount = existingIds.length;
  while (createdCount < requiredCount) {
    const serial =
      createdCount === 0 && device.serialNumber?.trim()
        ? device.serialNumber.trim()
        : `EQ${equipmentId}-U${createdCount + 1}`;
    await productsApi.createProduct({
      productid: 0,
      equipid: equipmentId,
      mlfb: device.model?.trim() ? device.model.trim() : null,
      serialno: clipProjectText(serial),
    });
    createdCount += 1;
  }
}

function buildProjectEquipmentTemplateBindings(
  persistedBindings: PersistedEquipmentBinding[],
): Array<{ equipmentid: number; templateid: number }> {
  const bindings: Array<{ equipmentid: number; templateid: number }> = [];
  const maintenanceTemplateId = Number.parseInt(formData.value.maintenanceSchemeId ?? '', 10);
  const matchedEquipmentTemplateIds = new Set(
    matchedEquipmentTemplates.value.map((template) => template.templateid),
  );

  for (const binding of persistedBindings) {
    const modelKey = equipmentModelKey(binding.device);
    const selectedTemplateId = Number.parseInt(
      String(equipmentSchemeIdByModel.value[modelKey] ?? '').trim(),
      10,
    );
    const resolvedTemplateId =
      Number.isFinite(selectedTemplateId) && selectedTemplateId > 0
        ? selectedTemplateId
        : maintenanceTemplateId;
    if (!Number.isFinite(resolvedTemplateId) || resolvedTemplateId <= 0) {
      continue;
    }
    if (!matchedEquipmentTemplateIds.has(resolvedTemplateId)) {
      continue;
    }
    bindings.push({
      equipmentid: binding.equipmentId,
      templateid: resolvedTemplateId,
    });
  }

  return bindings;
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
  } else if (selectedPeripheralTemplate.value && selectedPeripheralTemplate.value.id === mid) {
    maintenanceSchemeName = selectedPeripheralTemplate.value.name;
    maintenanceModel = selectedPeripheralTemplate.value.model || '-';
  } else {
    if (!maintenanceSchemeName && mid) {
      maintenanceSchemeName = `模板 #${mid}`;
      maintenanceModel = '-';
    }
  }
  const peripheralTemplate = selectedPeripheralTemplate.value;
  return {
    savedAt: new Date().toISOString(),
    maintenanceSchemeId: mid,
    maintenanceSchemeName,
    maintenanceModel,
    peripheralRows: [],
    peripheralTemplateId: peripheralTemplate?.id,
    peripheralTemplateName: peripheralTemplate?.name,
    peripheralElectricRoomCount: peripheralElectricRoomCount.value,
  };
}

function getDesiredPeripheralCount(): number {
  const value = String(peripheralElectricRoomCount.value ?? '').trim();
  if (!value || value === PERIPHERAL_ELECTRIC_ROOM_UNKNOWN) return 0;
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function createPeripheralBindings(projectId: number, templateId: number, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await projectEquipmentsApi.createProjectEquipment({
      peid: 0,
      projectid: projectId,
      equipmentid: 0,
      templateid: templateId,
      ifdel: false,
    });
  }
}

async function syncPeripheralTasks(projectId: number): Promise<void> {
  const desiredCount = getDesiredPeripheralCount();
  const templateId = Number.parseInt(String(peripheralSchemeId.value ?? '').trim(), 10);
  const existingTasks = (await inspectionTasksApi.searchInspectionTasks({ projectid: projectId, productid: 0 }))
    .filter((task) => !task.ifdel)
    .sort((left, right) => Number(left.taskid ?? 0) - Number(right.taskid ?? 0));

  if (desiredCount <= 0) {
    await Promise.all(existingTasks.map(async (task) => {
      if (task.taskid != null) {
        await inspectionTasksApi.deleteInspectionTask(task.taskid);
      }
    }));
    return;
  }

  if (!Number.isFinite(templateId) || templateId <= 0) {
    throw new Error('已选择电气室数量，但外围检测方案无效');
  }

  await Promise.all(existingTasks.map(async (task) => {
    if (task.templateid === templateId) return;
    await inspectionTasksApi.updateInspectionTask({
      ...task,
      projectid: projectId,
      templateid: templateId,
      status: task.status ?? 1,
      productid: task.productid ?? 0,
      inspectiontype: task.inspectiontype ?? INSPECTION_TYPE_PERIPHERAL,
      ifdel: false,
    });
  }));

  if (existingTasks.length > desiredCount) {
    const tasksToDelete = existingTasks.slice(desiredCount);
    await Promise.all(tasksToDelete.map(async (task) => {
      if (task.taskid != null) {
        await inspectionTasksApi.deleteInspectionTask(task.taskid);
      }
    }));
    return;
  }

  if (existingTasks.length < desiredCount) {
    await createPeripheralBindings(projectId, templateId, desiredCount - existingTasks.length);
  }
}

async function listEquipmentProductIds(equipmentId: number): Promise<number[]> {
  const products = await productsApi.searchProducts({ equipmentid: equipmentId });
  return products
    .map((product) => product.productid)
    .filter((productId): productId is number => productId != null && productId > 0);
}

async function deleteInspectionTasksForProducts(projectId: number, productIds: number[]): Promise<void> {
  for (const productId of productIds) {
    const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId, productid: productId });
    const activeTasks = tasks.filter((task) => !task.ifdel);
    for (const task of activeTasks) {
      if (task.taskid != null) {
        await inspectionTasksApi.deleteInspectionTask(task.taskid);
      }
    }
  }
}

function isDuplicateEquipmentBindingError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('同一项目下该设备已存在');
}

async function syncEquipmentBindings(projectId: number, persistedBindings: PersistedEquipmentBinding[]): Promise<void> {
  const desiredBindings = buildProjectEquipmentTemplateBindings(persistedBindings);
  const desiredByEquipmentId = new Map<number, { equipmentid: number; templateid: number }>();
  for (const binding of desiredBindings) {
    if (binding.equipmentid > 0 && binding.templateid > 0) {
      desiredByEquipmentId.set(binding.equipmentid, binding);
    }
  }

  const existingLinks = (await projectEquipmentsApi.listByProject(projectId))
    .filter((link) => !link.ifdel && link.equipmentid > 0);
  const existingByEquipmentId = new Map<number, typeof existingLinks[number]>();
  for (const link of existingLinks) {
    if (!existingByEquipmentId.has(link.equipmentid)) {
      existingByEquipmentId.set(link.equipmentid, link);
    }
  }

  for (const link of existingLinks) {
    if (desiredByEquipmentId.has(link.equipmentid)) {
      continue;
    }
    if (link.peid != null && link.peid > 0) {
      await projectEquipmentsApi.deleteProjectEquipment(link.peid);
    }
    const productIds = await listEquipmentProductIds(link.equipmentid);
    await deleteInspectionTasksForProducts(projectId, productIds);
  }

  for (const binding of desiredBindings) {
    const existingLink = existingByEquipmentId.get(binding.equipmentid);
    const productIds = await listEquipmentProductIds(binding.equipmentid);
    const productTaskMatrix = await Promise.all(
      productIds.map(async (productId) => {
        const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId, productid: productId });
        return {
          productId,
          activeTasks: tasks.filter((task) => !task.ifdel),
        };
      }),
    );
    const everyProductHasTask =
      productTaskMatrix.length > 0 && productTaskMatrix.every((entry) => entry.activeTasks.length > 0);

    if (existingLink) {
      const existingTemplateId = Number(existingLink.templateid ?? 0);
      if (existingTemplateId === binding.templateid) {
        continue;
      }
      if (existingLink.peid != null && existingLink.peid > 0) {
        try {
          await projectEquipmentsApi.updateProjectEquipment({
            peid: existingLink.peid,
            projectid: projectId,
            equipmentid: binding.equipmentid,
            templateid: binding.templateid,
            ifdel: false,
          });
        } catch (error) {
          if (isDuplicateEquipmentBindingError(error)) {
            continue;
          }
          throw error;
        }
      }
      continue;
    }

    if (everyProductHasTask) {
      continue;
    }

    try {
      await projectEquipmentsApi.createProjectEquipment({
        peid: 0,
        projectid: projectId,
        equipmentid: binding.equipmentid,
        templateid: binding.templateid,
        ifdel: false,
      });
    } catch (error) {
      if (isDuplicateEquipmentBindingError(error)) {
        continue;
      }
      throw error;
    }
  }
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
          ifdel: loadedProject.value?.ifdel ?? false,
          serviceid: formData.value.serviceId.trim() || null,
          city: formData.value.city.trim() || null,
          customercontact: formData.value.customerContact.trim() || null,
          enddate: loadedProject.value?.enddate?.trim() || null,
        })
      : await projectsApi.createProject({
          projectid: 0,
          projectname: name,
          companyid,
          managerid,
          assigneduserid,
          projectstatus,
          createdate: baseCreatedate,
          ifdel: false,
          serviceid: formData.value.serviceId.trim() || null,
          city: formData.value.city.trim() || null,
          customercontact: formData.value.customerContact.trim() || null,
          enddate: null,
        });

    let reportInitializationError: string | null = null;

    if (!isEditMode.value) {
      try {
        await reportsApi.createReport({
          reportid: 0,
          path: '',
          projectid: savedId,
          createdate: baseCreatedate,
          ifdel: false,
          summarydescription: '',
          sparepartsrecommendation: '',
        });
      } catch (reportError) {
        reportInitializationError =
          reportError instanceof Error ? reportError.message : '报告初始化失败';
      }
    }

    setSubmitProgress(35, '项目基础信息已保存，正在写入方案选择...');

    saveProjectSchemeSelection(savedId, buildSchemeSelectionForStorage());

    setSubmitProgress(50, '正在同步项目设备与产品数据...');
    const persistedBindings = await resolvePersistedEquipmentBindings();
    for (const binding of persistedBindings) {
      await ensureProductsForEquipment(binding);
    }

    /** 新建：有设备才写关联；编辑：即使清空设备也要删光原有关联 */
    const needEquipmentSync = persistedBindings.length > 0 || isEditMode.value;
    if (needEquipmentSync) {
      try {
        await syncEquipmentBindings(savedId, persistedBindings);
      } catch (linkErr) {
        if (isDuplicateEquipmentBindingError(linkErr)) {
          // Duplicate equipment bindings are non-fatal: skip them and continue peripheral sync.
        } else {
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
    }

    setSubmitProgress(80, '正在同步外围检测任务...');
    await syncPeripheralTasks(savedId);

    const baseOk = isEditMode.value ? '项目更新成功' : '项目创建成功';
    setSubmitProgress(100, '全部保存成功');
    showToast({
      message: reportInitializationError ? `${baseOk}，但报告初始化失败：${reportInitializationError}` : baseOk,
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
