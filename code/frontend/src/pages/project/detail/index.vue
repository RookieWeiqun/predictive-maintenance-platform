<!-- 项目详情页 -->
<template>
  <div class="project-detail-page">
    <IxContentHeader :header-title="headerTitle">
      <IxButton variant="secondary" @click="goBack">返回列表</IxButton>
      <IxButton variant="secondary" :disabled="!projectDto" @click="goToReport">查看报告</IxButton>
      <template v-if="projectDto && !isEditMode">
        <IxButton variant="primary" @click="enterEdit">编辑</IxButton>
      </template>
      <template v-if="projectDto && isEditMode">
        <IxButton variant="secondary" :disabled="saving" @click="cancelEdit">取消</IxButton>
        <IxButton variant="primary" :disabled="saving" @click="saveProject">
          {{ saving ? '保存中…' : '保存' }}
        </IxButton>
      </template>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <div v-if="loadError" class="empty-hint">{{ loadError }}</div>

        <div v-else-if="loading" class="empty-hint">加载中…</div>

        <!-- 项目基本信息 -->
        <div v-else-if="projectDto" class="project-basic-info">
          <IxInput :model-value="projectNoDisplay" label="项目编号" readonly style="flex: 1" />

          <template v-if="!isEditMode">
            <IxInput :model-value="projectDto.projectname ?? ''" label="项目名称" readonly style="flex: 1" />
            <IxInput :model-value="customerName" label="客户" readonly style="flex: 1" />
            <IxInput model-value="—" label="工厂" readonly style="flex: 1" />
            <IxInput :model-value="managerDisplayName" label="项目经理" readonly style="flex: 1" />
            <IxInput :model-value="assignedDisplayName" label="指派用户" readonly style="flex: 1" />
            <IxInput :model-value="statusText" label="状态" readonly style="flex: 1" />
            <IxInput :model-value="projectDto.createdate ?? '—'" label="创建日期" readonly style="flex: 1" />
          </template>

          <template v-else>
            <IxInput v-model="editDraft.projectname" label="项目名称" style="flex: 1" />
            <IxSelect v-model="editDraft.companyid" label="客户" placeholder="请选择客户" style="flex: 1">
              <IxSelectItem
                v-for="opt in customerOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </IxSelect>
            <IxInput model-value="—" label="工厂（后端暂无字段）" readonly style="flex: 1" />
            <IxSelect v-model="editDraft.managerid" label="项目经理" placeholder="请选择" style="flex: 1">
              <IxSelectItem
                v-for="opt in projectManagerOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </IxSelect>
            <IxSelect v-model="editDraft.assigneduserid" label="指派用户" placeholder="请选择" style="flex: 1">
              <IxSelectItem
                v-for="opt in chiefEngineerOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </IxSelect>
            <IxSelect v-model="editDraft.projectstatus" label="状态" placeholder="状态" style="flex: 1">
              <IxSelectItem label="草稿" value="0" />
              <IxSelectItem label="进行中" value="1" />
              <IxSelectItem label="已完成" value="2" />
              <IxSelectItem label="已关闭" value="3" />
            </IxSelect>
            <IxInput :model-value="projectDto.createdate ?? '—'" label="创建日期" readonly style="flex: 1" />
          </template>
        </div>

        <div v-else class="empty-hint">未找到该项目（id={{ projectIdParam }}）</div>

        <!-- 检测方案：优先从项目 InspectionTasks 的 templateid 还原；无任务时回退本地方案快照 -->
        <div v-if="projectDto" class="project-scheme-panel">
          <div class="table-header">
            <div class="table-title">
              已选检测方案
              <span v-if="schemeFromTasks" class="table-title__sub">
                （数据来自 {{ schemeFromTasks.taskCount }} 条巡检任务）
              </span>
              <span v-else-if="schemeSelection?.savedAt" class="table-title__sub">
                （本地记录时间 {{ formatSchemeSavedAt(schemeSelection.savedAt) }}）
              </span>
            </div>
          </div>
          <div v-if="hasSchemePanelContent" class="scheme-detail-body">
            <div class="detail-schemes-header">
              <h3 class="detail-schemes-title">匹配到的方案</h3>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">设备总数</span>
                  <span class="stat-value">{{ schemeDeviceTotalQuantity }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">设备型号数</span>
                  <span class="stat-value">{{ schemeUniqueModelCount }}</span>
                </div>
              </div>
            </div>

            <h4 class="subsection-title">设备检测方案（按型号）</h4>
            <div v-if="detailEquipmentSchemeRows.length > 0" class="equipment-table-wrap">
              <table class="equipment-scheme-table">
                <thead>
                  <tr>
                    <th>产品型号 / 分类</th>
                    <th>设备数量</th>
                    <th>已选方案</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailEquipmentSchemeRows" :key="row.key">
                    <td>{{ row.label }}</td>
                    <td>{{ row.deviceCount > 0 ? row.deviceCount : '—' }}</td>
                    <td>
                      <span v-if="maintenanceSchemeCard">
                        {{ maintenanceSchemeCard.name }}
                      </span>
                      <span v-else class="muted">未记录</span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <span class="muted">{{ schemeEquipmentSourceLabel }}</span>
                        <button
                          type="button"
                          class="link-btn"
                          :disabled="!maintenanceSchemeCard"
                          @click="openSchemeDetailModal(maintenanceSchemeCard, 'equipment')"
                        >
                          查看详情
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="scheme-empty-hint muted">暂无设备型号数据（需先关联设备档案）</p>

            <div v-if="displayPeripheralRows.length > 0" class="peripheral-by-workshop">
              <h4 class="subsection-title">各车间外围检测方案</h4>
              <p class="peripheral-hint">{{ peripheralSectionHint }}</p>
              <div class="peripheral-table-wrap">
                <table class="peripheral-scheme-table">
                  <thead>
                    <tr>
                      <th>工厂 / 车间</th>
                      <th>候选数</th>
                      <th>已选外围方案</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in displayPeripheralRows" :key="idx">
                      <td>{{ row.workshopLabel }}</td>
                      <td>—</td>
                      <td>
                        <span v-if="row.schemeName">{{ row.schemeName }}</span>
                        <span v-else class="muted">—</span>
                      </td>
                      <td>
                        <div class="row-actions">
                          <span class="muted">{{ schemePeripheralSourceLabel }}</span>
                          <button
                            type="button"
                            class="link-btn"
                            :disabled="!row.templateId"
                            @click="openSchemeDetailModal(peripheralSchemeLite(row), 'peripheral')"
                          >
                            查看详情
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p v-else class="placeholder-hint scheme-placeholder">
            暂无方案数据：当前项目下无巡检任务，且本机未保存向导方案快照。保存项目并同步任务后，将自动从任务中的模板 id 展示方案。
          </p>
        </div>

        <!-- 项目关联设备（与设备管理列表字段一致，首列展开查看序列号等详情） -->
        <div v-if="projectDto" class="project-table-container project-table-container--devices">
          <div class="table-header">
            <div class="table-title">
              项目设备清单
              <span class="table-title__sub">（共 {{ devices.length }} 台设备档案，点击首列 ▶ 展开详情）</span>
            </div>
          </div>
          <p v-if="devicesError" class="devices-error">{{ devicesError }}</p>
          <div v-else-if="devicesLoading" class="empty-hint devices-loading">设备列表加载中…</div>
          <AgGridVue
            v-else-if="gridOptions"
            class="project-device-grid"
            :gridOptions="gridOptions"
            :components="deviceGridComponents"
          />
          <p v-if="!devicesLoading && !devicesError && devices.length === 0" class="placeholder-hint devices-empty">
            暂无关联设备。新建项目并选择设备档案后会写入
            <code>ProjectEquipments</code>
            关联表；列表数据来自接口
            <code>GET /api/ProjectEquipments/ByProject/{projectid}</code>
            与设备详情接口。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import { ModuleRegistry, AllCommunityModule, GridApi, GridOptions } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  IxSelect,
  IxSelectItem,
  showToast,
} from '@siemens/ix-vue';
import statusData from '@/mockdata/common/projectStatus.json';
import usersData from '@/mockdata/common/users.json';
import DeviceSerialFullWidthRenderer from '@/pages/device/components/DeviceSerialFullWidthRenderer.vue';
import { matchEquipmentCategoryFromApi } from '@/pages/project/utils/equipmentCategoryMatch';
import { loadCustomerSelectOptions } from '@/pages/project/utils/loadCustomerSelectOptions';
import { openProjectSchemeDetailModal } from '@/pages/project/utils/openProjectSchemeDetailModal';
import {
  equipmentsApi,
  inspectionTasksApi,
  inspectionTemplatesApi,
  productsApi,
  projectsApi,
  taskitemsApi,
} from '@/api';
import type { ProjectDto } from '@/api/modules/projects';
import {
  loadProjectSchemeSelection,
  type ProjectSchemePeripheralRowV1,
  type ProjectSchemeSelectionV1,
} from '@/pages/project/utils/projectSchemeSelectionStorage';
import {
  resolveProjectSchemesFromInspectionTasks,
  type SchemeSummaryFromInspectionTasks,
} from '@/pages/project/utils/resolveProjectSchemesFromInspectionTasks';
import type { EquipmentProjectDto } from '@/api/modules/equipments';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import { isDetectionItem, type SchemeItem } from '@/pages/scheme/utils/schemeUtils';

ModuleRegistry.registerModules([AllCommunityModule]);

const deviceGridComponents = {
  DeviceSerialFullWidthRenderer,
};

type MaintenanceInfo = {
  schemeName: string;
  intervalMonths: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  remarks: string;
};

type DeviceRow = {
  id: string;
  customerId: string;
  customerName: string;
  factoryName: string;
  workshopName: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  model: string;
  quantity: number;
  serialNumbers: string[];
  maintenance: MaintenanceInfo;
  taskEntries: DeviceTaskEntry[];
  fallbackTemplateName: string;
  fallbackTaskItems: DeviceTaskItem[];
};

type DeviceTaskItem = {
  name: string;
  categorypath: string;
  result: string;
};

type DeviceTaskEntry = {
  taskid: number;
  taskNo: string;
  statusText: string;
  templateName: string;
  productid: number;
  serialno: string;
  items: DeviceTaskItem[];
};

type DeviceFlatParent = DeviceRow & {
  level: 0;
  hasChildren: true;
  rowKind: 'device';
};

type DeviceSerialStripRow = {
  id: string;
  rowKind: 'serialStrip';
  __fullWidth: true;
  parent: DeviceRow;
};

type DeviceFlatRow = DeviceFlatParent | DeviceSerialStripRow;

const route = useRoute();
const router = useRouter();

const projectIdParam = computed(() => String(route.params.id ?? ''));
const projectNumericId = computed(() => {
  const n = Number.parseInt(projectIdParam.value, 10);
  return Number.isNaN(n) ? null : n;
});

const isEditMode = computed(() => {
  const e = route.query.edit;
  return e === '1' || e === 'true';
});

const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const projectDto = ref<ProjectDto | null>(null);

const customerOptions = ref<{ label: string; value: string }[]>([]);
const customerNameById = computed(() => new Map(customerOptions.value.map((o) => [o.value, o.label])));

const projectManagerOptions = usersData.users
  .filter((u) => u.role === 'project_manager')
  .map((u) => ({ label: u.name, value: String(u.id) }));

const chiefEngineerOptions = usersData.users
  .filter((u) => u.role === 'chief_engineer')
  .map((u) => ({ label: u.name, value: String(u.id) }));

/** 维护信息待接入真实接口；勿使用占位假数据 */
const EMPTY_MAINTENANCE: MaintenanceInfo = {
  schemeName: '',
  intervalMonths: 0,
  lastMaintenanceDate: '',
  nextMaintenanceDate: '',
  remarks: '',
};

function mapEquipmentProjectToRow(
  e: EquipmentProjectDto,
  customerNameLabel: string,
  index: number,
): DeviceRow {
  const { categoryId, subCategoryId, categoryName, subCategoryName } = matchEquipmentCategoryFromApi(
    e.productcategory,
    e.productgroup,
  );
  const rawSerials = e.serialNumbers?.length ? [...e.serialNumbers] : [];
  return {
    id: String(e.equipid ?? index),
    customerId: String(e.companyid),
    customerName: customerNameLabel,
    factoryName: e.factory ?? '',
    workshopName: e.workshop ?? '',
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName,
    model: e.mlfb?.trim() || (e.equipmentname ?? ''),
    quantity: e.number ?? 0,
    serialNumbers: rawSerials.length ? rawSerials : ['—'],
    maintenance: { ...EMPTY_MAINTENANCE },
    taskEntries: [],
    fallbackTemplateName: '',
    fallbackTaskItems: [],
  };
}

const schemeSelection = ref<ProjectSchemeSelectionV1 | null>(null);
/** 从 InspectionTasks 解析的方案摘要（有任务时优先于本机快照展示） */
const schemeFromTasks = ref<SchemeSummaryFromInspectionTasks | null>(null);

const hasSchemePanelContent = computed(
  () => !!schemeSelection.value || schemeFromTasks.value != null,
);

const displayPeripheralRows = computed((): ProjectSchemePeripheralRowV1[] => {
  const fromT = schemeFromTasks.value?.peripheralRows;
  if (fromT && fromT.length > 0) return fromT;
  return schemeSelection.value?.peripheralRows ?? [];
});

const schemeEquipmentSourceLabel = computed(() =>
  schemeFromTasks.value?.maintenanceTemplateId ? '来自巡检任务' : '已保存快照',
);

const schemePeripheralSourceLabel = computed(() =>
  schemeFromTasks.value?.peripheralRows?.length ? '来自巡检任务' : '已保存快照',
);

const peripheralSectionHint = computed(() => {
  if (schemeFromTasks.value?.peripheralRows?.length) {
    return '以下车间与模板由外围类巡检任务（任务号后缀 -P2）汇总；候选数未在任务中体现时显示为 —。';
  }
  return '以下为保存项目时记录的外围模板；本地快照未保存候选数量时显示为 —。';
});

/** 与向导「匹配方案」设备表一致：按型号（含分类）聚合设备行 */
const detailEquipmentSchemeRows = computed(() => {
  const map = new Map<string, { key: string; label: string; deviceCount: number }>();
  for (const d of devices.value) {
    const key = `${d.categoryId}\t${d.subCategoryId}\t${(d.model ?? '').trim()}`;
    const model = (d.model ?? '').trim() || '未填写型号';
    const label = `${model}（${d.categoryName} / ${d.subCategoryName}）`;
    const q = d.quantity || 0;
    const prev = map.get(key);
    if (prev) prev.deviceCount += q;
    else map.set(key, { key, label, deviceCount: q });
  }
  const rows = [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  if (rows.length > 0) return rows;
  const tasks = schemeFromTasks.value;
  if (tasks?.maintenanceTemplateId) {
    const mlfb = (tasks.maintenanceMlfb ?? '').trim();
    const name = (tasks.maintenanceTemplateName ?? '').trim();
    return [
      {
        key: '__from_tasks__',
        label: mlfb && mlfb !== '-' ? mlfb : name || '（任务未关联 MLFB）',
        deviceCount: 0,
      },
    ];
  }
  const snap = schemeSelection.value;
  if (snap?.maintenanceSchemeId?.trim()) {
    return [
      {
        key: '__from_snapshot__',
        label: snap.maintenanceModel?.trim() || '（本地快照未记录型号）',
        deviceCount: 0,
      },
    ];
  }
  return [];
});

const schemeDeviceTotalQuantity = computed(() =>
  devices.value.reduce((sum, d) => sum + (d.quantity || 0), 0),
);

const schemeUniqueModelCount = computed(() => {
  const trimmed = devices.value.map((d) => (d.model ?? '').trim()).filter(Boolean);
  if (trimmed.length > 0) return new Set(trimmed).size;
  return detailEquipmentSchemeRows.value.length > 0 ? 1 : 0;
});

const maintenanceSchemeCard = computed((): { id: string; name: string; model: string } | null => {
  const t = schemeFromTasks.value;
  if (t?.maintenanceTemplateId != null && t.maintenanceTemplateId > 0) {
    const id = String(t.maintenanceTemplateId);
    return {
      id,
      name: t.maintenanceTemplateName?.trim() || `模板 #${id}`,
      model: (t.maintenanceMlfb ?? '').trim() || '-',
    };
  }
  const s = schemeSelection.value;
  const id = String(s?.maintenanceSchemeId ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: (s?.maintenanceSchemeName ?? '').trim() || `模板 #${id}`,
    model: (s?.maintenanceModel ?? '').trim() || '-',
  };
});

function peripheralSchemeLite(
  row: ProjectSchemePeripheralRowV1,
): { id: string; name: string; model: string } | null {
  const id = String(row.templateId ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: (row.schemeName ?? '').trim() || `模板 #${id}`,
    model: '-',
  };
}

/** 模板内 @click 仍用此名，实现委托给共用工具 */
function openSchemeDetailModal(
  scheme: { id: string; name: string; model: string } | null,
  schemeKind: 'equipment' | 'peripheral',
) {
  void openProjectSchemeDetailModal(scheme, schemeKind);
}

const devices = ref<DeviceRow[]>([]);
const devicesLoading = ref(false);
const devicesError = ref('');
const expandedRows = ref<Set<string>>(new Set());

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<GridApi | null>(null);

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function convertToFlatRows(list: DeviceRow[], expanded: Set<string>): DeviceFlatRow[] {
  const flat: DeviceFlatRow[] = [];
  for (const d of list) {
    flat.push({
      ...d,
      level: 0,
      hasChildren: true,
      rowKind: 'device',
    });
    if (expanded.has(d.id)) {
      flat.push({
        id: `${d.id}__serial`,
        rowKind: 'serialStrip',
        __fullWidth: true,
        parent: d,
      });
    }
  }
  return flat;
}

function updateGridData() {
  const api = gridApi.value;
  if (!api || api.isDestroyed()) return;
  api.setGridOption('rowData', convertToFlatRows(devices.value, expandedRows.value));
}

function toggleDeviceRow(deviceId: string) {
  if (expandedRows.value.has(deviceId)) {
    expandedRows.value.delete(deviceId);
  } else {
    expandedRows.value.add(deviceId);
  }
  updateGridData();
}

async function loadProjectDevices(projectId: number) {
  devicesError.value = '';
  devicesLoading.value = true;
  expandedRows.value.clear();
  try {
    const list = await equipmentsApi.listEquipmentsByProject(projectId);
    const cust =
      customerNameById.value.get(String(projectDto.value?.companyid ?? '')) ??
      `客户#${projectDto.value?.companyid ?? ''}`;
    const templateNameById = new Map<number, string>();
    const statusText = (status: number) => {
      if (status === 1) return '进行中';
      if (status === 2) return '已完成';
      if (status === 3) return '未开始';
      return String(status);
    };
    const loadTemplateName = async (templateid: number) => {
      if (templateid <= 0 || Number.isNaN(templateid)) return `模板#${templateid}`;
      const cached = templateNameById.get(templateid);
      if (cached) return cached;
      try {
        const t = await inspectionTemplatesApi.getInspectionTemplate(templateid);
        const name = t.name?.trim() ? (t.name as string) : `模板#${templateid}`;
        templateNameById.set(templateid, name);
        return name;
      } catch {
        const name = `模板#${templateid}`;
        templateNameById.set(templateid, name);
        return name;
      }
    };
    const flattenDetectionItems = (nodes: SchemeItem[], path: string[] = []): DeviceTaskItem[] => {
      const out: DeviceTaskItem[] = [];
      for (const n of nodes) {
        if (isDetectionItem(n)) {
          out.push({
            name: (n.name ?? '').trim() || '未命名检测项',
            categorypath: path.join(' / '),
            result: '',
          });
          continue;
        }
        const nextPath = (n.name ?? '').trim() ? [...path, (n.name ?? '').trim()] : path;
        out.push(...flattenDetectionItems(n.children ?? [], nextPath));
      }
      return out;
    };
    let fallbackTemplateName = '';
    let fallbackTaskItems: DeviceTaskItem[] = [];
    const fromTasksId = schemeFromTasks.value?.maintenanceTemplateId;
    const snapId = Number.parseInt(String(schemeSelection.value?.maintenanceSchemeId ?? '').trim(), 10);
    const fallbackTemplateId =
      fromTasksId != null && fromTasksId > 0 ? fromTasksId : Number.isNaN(snapId) ? NaN : snapId;
    if (!Number.isNaN(fallbackTemplateId) && fallbackTemplateId > 0) {
      fallbackTemplateName = await loadTemplateName(fallbackTemplateId);
      try {
        const templateItems = await loadTemplateItemsByTemplateId(fallbackTemplateId);
        fallbackTaskItems = flattenDetectionItems(templateItems);
      } catch {
        fallbackTaskItems = [];
      }
    }
    function resolveDeviceSerialNumbers(
      equipmentSerials: string[],
      productSerials: string[],
      entries: DeviceTaskEntry[],
    ): string[] {
      const fromProducts = productSerials.map((s) => s.trim()).filter((s) => s.length > 0);
      if (fromProducts.length > 0) return fromProducts;
      const fromEquip = equipmentSerials.map((s) => s.trim()).filter((s) => s.length > 0 && s !== '—');
      if (fromEquip.length > 0) return fromEquip;
      const fromTasks = [
        ...new Set(
          entries
            .map((e) => (e.serialno ?? '').trim())
            .filter((s) => s.length > 0 && s !== '—'),
        ),
      ].sort((a, b) => a.localeCompare(b, 'zh-CN'));
      if (fromTasks.length > 0) return fromTasks;
      return ['—'];
    }

    const loadTasksForEquipment = async (
      equipid: number,
    ): Promise<{ entries: DeviceTaskEntry[]; productSerials: string[] }> => {
      if (!equipid || equipid <= 0 || Number.isNaN(equipid)) {
        return { entries: [], productSerials: [] };
      }
      const products = await productsApi.searchProducts({ equipmentid: equipid });
      const validProducts = products.filter((p) => p.productid != null && p.productid > 0);
      const productSerials = validProducts
        .map((p) => (p.serialno ?? '').trim())
        .filter((s) => s.length > 0);
      const rows = await Promise.all(
        validProducts.map(async (p) => {
          const productid = p.productid as number;
          const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId, productid });
          const taskRows = await Promise.all(
            tasks
              .filter((t) => t.taskid != null && t.taskid > 0)
              .map(async (t) => {
                const taskid = t.taskid as number;
                const [templateName, itemsRaw] = await Promise.all([
                  loadTemplateName(t.templateid),
                  taskitemsApi.listTaskitemsByTask(taskid),
                ]);
                const items: DeviceTaskItem[] = itemsRaw.map((it) => ({
                  name: (it.name ?? '').trim() || '未命名任务项',
                  categorypath: (it.categorypath ?? '').trim(),
                  result: (it.result ?? '').trim(),
                }));
                return {
                  taskid,
                  taskNo: (t.taskNo ?? '').trim() || `任务#${taskid}`,
                  statusText: statusText(t.status),
                  templateName,
                  productid,
                  serialno: (p.serialno ?? '').trim() || '—',
                  items,
                } as DeviceTaskEntry;
              }),
          );
          return taskRows;
        }),
      );
      const entries = rows.flat().sort((a, b) => a.taskid - b.taskid);
      return { entries, productSerials };
    };

    devices.value = await Promise.all(
      list.map(async (e, i) => {
        const base = mapEquipmentProjectToRow(e, cust, i);
        base.fallbackTemplateName = fallbackTemplateName;
        base.fallbackTaskItems = fallbackTaskItems;
        const equipSerialsFromApi = (e.serialNumbers ?? []).map((s) => String(s));
        try {
          const { entries, productSerials } = await loadTasksForEquipment(Number(e.equipid ?? 0));
          base.taskEntries = entries;
          base.serialNumbers = resolveDeviceSerialNumbers(equipSerialsFromApi, productSerials, entries);
        } catch {
          base.taskEntries = [];
          base.serialNumbers = resolveDeviceSerialNumbers(equipSerialsFromApi, [], []);
        }
        return base;
      }),
    );
    updateGridData();
  } catch (e) {
    devices.value = [];
    devicesError.value = e instanceof Error ? e.message : '设备列表加载失败';
    showToast({ message: devicesError.value });
    updateGridData();
  } finally {
    devicesLoading.value = false;
  }
}

/** 与列表页一致 */
const PROJECT_STATUS_CODE_MAP: Record<number, 'draft' | 'active' | 'completed' | 'closed'> = {
  0: 'draft',
  1: 'active',
  2: 'completed',
  3: 'closed',
};

function userDisplayName(id: number | null | undefined): string {
  if (id == null) return '—';
  const u = usersData.users.find((x) => x.id === String(id));
  return u?.name ?? `用户#${id}`;
}

function formatProjectNo(p: ProjectDto | null): string {
  if (!p || p.projectid == null) return '—';
  return `P-${String(p.projectid).padStart(4, '0')}`;
}

const projectNoDisplay = computed(() => formatProjectNo(projectDto.value));

const customerName = computed(() => {
  const p = projectDto.value;
  if (!p) return '—';
  return customerNameById.value.get(String(p.companyid)) ?? `客户#${p.companyid}`;
});

const managerDisplayName = computed(() => userDisplayName(projectDto.value?.managerid));
const assignedDisplayName = computed(() => userDisplayName(projectDto.value?.assigneduserid));

const statusText = computed(() => {
  const code = projectDto.value?.projectstatus;
  if (code == null) return '—';
  const key = PROJECT_STATUS_CODE_MAP[code] ?? 'draft';
  return statusData.statusMap[key as keyof typeof statusData.statusMap] ?? String(code);
});

const headerTitle = computed(() => {
  const name = projectDto.value?.projectname?.trim();
  if (name) return `项目详情：${name}`;
  return '项目详情';
});

const editDraft = reactive({
  projectname: '',
  companyid: '',
  managerid: '',
  assigneduserid: '',
  projectstatus: '1',
});

function syncEditDraftFromProject(p: ProjectDto) {
  editDraft.projectname = p.projectname ?? '';
  editDraft.companyid = String(p.companyid);
  editDraft.managerid = p.managerid != null ? String(p.managerid) : '';
  editDraft.assigneduserid = p.assigneduserid != null ? String(p.assigneduserid) : '';
  editDraft.projectstatus = String(p.projectstatus ?? 1);
}

async function loadCustomers() {
  customerOptions.value = await loadCustomerSelectOptions();
}

function formatSchemeSavedAt(iso: string): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim().slice(0, 19);
  return d.toLocaleString('zh-CN', { hour12: false });
}

/** 读取本地方案快照，并尝试用模板接口刷新名称（失败则保留缓存文案） */
async function loadProjectSchemeSelectionForView(projectId: number) {
  const raw = loadProjectSchemeSelection(projectId);
  schemeSelection.value = raw;
  if (!raw) return;

  const unique = new Set<string>();
  if (raw.maintenanceSchemeId) unique.add(raw.maintenanceSchemeId);
  for (const r of raw.peripheralRows) unique.add(r.templateId);

  const resolved = new Map<string, { name: string; mlfb: string }>();
  await Promise.all(
    [...unique].map(async (tid) => {
      const n = Number.parseInt(tid, 10);
      if (Number.isNaN(n)) return;
      try {
        const t = await inspectionTemplatesApi.getInspectionTemplate(n);
        resolved.set(tid, {
          name: t.name?.trim() || `模板 #${tid}`,
          mlfb: t.mlfb?.trim() || '-',
        });
      } catch {
        /* 忽略 */
      }
    }),
  );

  if (resolved.size === 0) return;

  const enriched: ProjectSchemeSelectionV1 = {
    ...raw,
    peripheralRows: raw.peripheralRows.map((r) => ({ ...r })),
  };
  const main = resolved.get(enriched.maintenanceSchemeId);
  if (main) {
    enriched.maintenanceSchemeName = main.name;
    enriched.maintenanceModel = main.mlfb;
  }
  for (const row of enriched.peripheralRows) {
    const t = resolved.get(row.templateId);
    if (t) row.schemeName = t.name;
  }
  schemeSelection.value = enriched;
}

async function loadProject() {
  loadError.value = '';
  const id = projectNumericId.value;
  if (id == null) {
    projectDto.value = null;
    devices.value = [];
    schemeSelection.value = null;
    schemeFromTasks.value = null;
    loadError.value = '无效的项目 id';
    updateGridData();
    return;
  }
  loading.value = true;
  try {
    await loadCustomers();
    const p = await projectsApi.getProject(id);
    projectDto.value = p;
    if (isEditMode.value) {
      syncEditDraftFromProject(p);
    }
    await loadProjectSchemeSelectionForView(id);
    try {
      schemeFromTasks.value = await resolveProjectSchemesFromInspectionTasks(id);
    } catch {
      schemeFromTasks.value = null;
    }
    await loadProjectDevices(id);
  } catch (e) {
    projectDto.value = null;
    devices.value = [];
    schemeSelection.value = null;
    schemeFromTasks.value = null;
    loadError.value = e instanceof Error ? e.message : '项目加载失败';
    showToast({ message: loadError.value });
    updateGridData();
  } finally {
    loading.value = false;
  }
}

watch(
  () => [route.params.id, route.query.edit] as const,
  () => {
    void loadProject();
  },
  { immediate: true },
);

watch(isEditMode, (edit) => {
  if (edit && projectDto.value) {
    syncEditDraftFromProject(projectDto.value);
  }
});

watch(projectNumericId, () => {
  expandedRows.value.clear();
});

watch(devices, () => {
  updateGridData();
});

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    embedFullWidthRows: false,
    isFullWidthRow: (p) =>
      !!(p.rowNode.data as DeviceSerialStripRow | undefined)?.__fullWidth,
    fullWidthCellRenderer: 'DeviceSerialFullWidthRenderer',
    getRowId: (p) => {
      const d = p.data as DeviceFlatRow | undefined;
      return d?.id ?? '';
    },
    getRowClass: (p) => {
      const d = p.data as DeviceFlatRow | undefined;
      if (d?.rowKind === 'serialStrip') return 'ag-row-device-serial-strip';
      if (d?.rowKind === 'device') return 'ag-row-device-parent';
      return '';
    },
    onGridPreDestroyed: () => {
      gridApi.value = null;
    },
    onGridReady: (e) => {
      gridApi.value = e.api;
      e.api.setGridOption('rowData', convertToFlatRows(devices.value, expandedRows.value));
    },
    columnDefs: [
      {
        field: 'customerName',
        headerName: '客户名称',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        minWidth: 160,
        cellRenderer: (params: { data?: DeviceFlatRow }) => {
          const row = params.data;
          if (!row || row.rowKind !== 'device') return '';
          const expanded = expandedRows.value.has(row.id);
          const expandIcon = row.hasChildren
            ? expanded
              ? '<span class="device-expand-icon">▼</span>'
              : '<span class="device-expand-icon">▶</span>'
            : '<span class="device-expand-icon device-expand-icon--placeholder"></span>';
          const name = escapeHtml(row.customerName);
          return `${expandIcon}<span class="device-customer-name">${name}</span>`;
        },
        onCellClicked: (params: { data?: DeviceFlatRow }) => {
          const row = params.data;
          if (row?.rowKind === 'device' && row.hasChildren) {
            toggleDeviceRow(row.id);
          }
        },
        cellStyle: (params: { data?: DeviceFlatRow }) => {
          const row = params.data;
          if (!row || row.rowKind !== 'device') {
            return { verticalAlign: 'middle', fontWeight: 400, color: 'inherit' };
          }
          return {
            fontWeight: 500,
            color: 'var(--theme-color-primary)',
            verticalAlign: 'middle',
          };
        },
      },
      {
        field: 'factoryName',
        headerName: '工厂',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        cellRenderer: (params: { data?: DeviceFlatRow; value?: string }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
      {
        field: 'workshopName',
        headerName: '车间',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        cellRenderer: (params: { data?: DeviceFlatRow; value?: string }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
      {
        field: 'categoryName',
        headerName: '产品大类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        cellRenderer: (params: { data?: DeviceFlatRow; value?: string }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
      {
        field: 'subCategoryName',
        headerName: '产品子类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        cellRenderer: (params: { data?: DeviceFlatRow; value?: string }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
      {
        field: 'model',
        headerName: '产品型号',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: { data?: DeviceFlatRow; value?: string }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
      {
        field: 'quantity',
        headerName: '数量',
        resizable: true,
        sortable: true,
        filter: true,
        width: 100,
        type: 'numericColumn',
        cellRenderer: (params: { data?: DeviceFlatRow; value?: number }) => {
          if (params.data?.rowKind !== 'device') return '';
          return params.value ?? '';
        },
      },
    ],
    rowData: convertToFlatRows(devices.value, expandedRows.value),
    suppressCellFocus: true,
  };
});

onBeforeUnmount(() => {
  gridApi.value = null;
});

function parseOptionalSelect(v: string): number | null {
  if (v == null || String(v).trim() === '') return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function goBack() {
  router.push('/project/list');
}

function goToReport() {
  const id = projectIdParam.value;
  if (!id) return;
  router.push(`/project/report/${id}`);
}

function enterEdit() {
  const id = projectIdParam.value;
  router.replace({ path: `/project/detail/${id}`, query: { edit: '1' } });
}

function cancelEdit() {
  const id = projectIdParam.value;
  router.replace({ path: `/project/detail/${id}` });
}

async function saveProject() {
  const base = projectDto.value;
  const id = projectNumericId.value;
  if (!base || id == null) return;

  const name = editDraft.projectname?.trim();
  if (!name) {
    showToast({ message: '请填写项目名称' });
    return;
  }
  const companyid = Number.parseInt(editDraft.companyid, 10);
  if (Number.isNaN(companyid)) {
    showToast({ message: '请选择客户' });
    return;
  }

  saving.value = true;
  try {
    const payload: ProjectDto = {
      ...base,
      projectid: id,
      projectname: name,
      companyid,
      managerid: parseOptionalSelect(editDraft.managerid),
      assigneduserid: parseOptionalSelect(editDraft.assigneduserid),
      projectstatus: Number.parseInt(editDraft.projectstatus, 10) || 1,
      createdate: base.createdate ?? null,
    };
    await projectsApi.updateProject(payload);
    showToast({ message: '保存成功' });
    cancelEdit();
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '保存失败' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.project-detail-page {
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-section {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--theme-color-weak-text);
}

.project-table-container {
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  min-height: 0;
}

/* 方案区块：不占满剩余高度，避免与设备表之间出现大块空白 */
.project-scheme-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.project-table-container--devices {
  flex: 1;
  min-height: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.table-title__sub {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--theme-color-weak-text);
}

.project-device-grid {
  height: min(480px, 50vh);
  width: 100%;
  min-height: 280px;
}

.devices-loading {
  padding: 0.5rem 0;
}

.devices-error {
  font-size: 0.875rem;
  color: var(--theme-color-alarm);
  margin: 0 0 0.5rem;
}

.devices-empty {
  margin-top: 0.5rem;
}

.placeholder-hint {
  font-size: 0.875rem;
  color: var(--theme-color-weak-text);
  line-height: 1.5;
  margin: 0;
}

.scheme-detail-body {
  padding: 0 0.25rem 0.25rem;
}

/* 与向导「匹配方案」matched-schemes 头部统计一致 */
.detail-schemes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.detail-schemes-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.summary-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--theme-color-weak-text);
  line-height: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--theme-color-primary, #0054a6);
  line-height: 1.2;
}

.subsection-title {
  margin: 1.25rem 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.scheme-empty-hint {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
}

.peripheral-by-workshop {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.peripheral-hint {
  font-size: 0.8125rem;
  color: var(--theme-color-weak-text);
  margin: 0 0 1rem 0;
}

.equipment-table-wrap {
  margin-top: 0.5rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.equipment-scheme-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.equipment-scheme-table th,
.equipment-scheme-table td {
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding: 0.625rem 0.75rem;
  vertical-align: middle;
  font-size: 0.875rem;
}

.equipment-scheme-table th {
  text-align: left;
  background: var(--theme-color-soft);
  font-weight: 600;
}

.equipment-scheme-table tbody tr:last-child td {
  border-bottom: none;
}

.peripheral-table-wrap {
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.peripheral-scheme-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.peripheral-scheme-table th,
.peripheral-scheme-table td {
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding: 0.625rem 0.75rem;
  vertical-align: middle;
  font-size: 0.875rem;
}

.peripheral-scheme-table th {
  text-align: left;
  background: var(--theme-color-soft);
  font-weight: 600;
}

.peripheral-scheme-table tbody tr:last-child td {
  border-bottom: none;
}

.row-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--theme-color-primary);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0;
}

.link-btn:disabled {
  color: var(--theme-color-weak-text);
  cursor: not-allowed;
}

.muted {
  color: var(--theme-color-weak-text);
}

.scheme-label {
  color: var(--theme-color-weak-text);
  flex-shrink: 0;
}

.scheme-value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.scheme-meta {
  font-size: 0.8125rem;
  color: var(--theme-color-weak-text);
  margin-left: 0.25rem;
}

.scheme-meta-inline {
  font-size: 0.8125rem;
  color: var(--theme-color-weak-text);
  margin-left: 0.25rem;
}

.scheme-placeholder {
  margin: 0.25rem 0 0;
}
</style>

<style>
.ag-row-device-parent .ag-cell {
  cursor: default;
}

.ag-row-device-serial-strip {
  background: var(--theme-color-soft-bg, rgba(0, 0, 0, 0.04)) !important;
}

.device-expand-icon {
  cursor: pointer;
  margin-right: 6px;
  user-select: none;
  display: inline-block;
  min-width: 1rem;
}

.device-expand-icon--placeholder {
  min-width: 1rem;
  margin-right: 6px;
  display: inline-block;
}

.device-customer-name {
  color: inherit;
}
</style>
