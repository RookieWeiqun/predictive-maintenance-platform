<!-- 设备管理页面 — 首列 ▶/▼ 展开；序列号使用全宽行横跨整表 -->
<template>
  <div>
    <IxContentHeader header-title="设备管理" />
    <section class="page-section">
      <div class="page-content">
        <div class="filter-section">
          <div class="filter-section__left">
            <IxInput
              v-model="searchText"
              placeholder="搜索客户、工厂或型号"
              style="flex: 1; max-width: 360px"
            />
            <IxSelect v-model="selectedCustomer" placeholder="全部客户" style="min-width: 200px">
              <IxSelectItem label="全部客户" value="" />
              <IxSelectItem
                v-for="customer in customerOptions"
                :key="customer.id"
                :label="customer.name"
                :value="customer.id"
              />
            </IxSelect>
            <IxButton variant="secondary" @click="handleSearch">搜索</IxButton>
          </div>
          <IxButton variant="primary" :icon="iconAdd" @click="openCreateModal">新建设备</IxButton>
        </div>

        <div class="table-container">
          <!-- AG Grid Vue：https://www.ag-grid.com/vue-data-grid/getting-started/ -->
          <AgGridVue
            v-if="gridOptions"
            style="height: 600px; width: 100%"
            :gridOptions="gridOptions"
            :components="deviceGridComponents"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, h } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
  GridApi,
  CellClickedEvent,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  IxSelect,
  IxSelectItem,
  showModal,
  showToast,
} from '@siemens/ix-vue';
import { iconAdd } from '@siemens/ix-icons/icons';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import DeviceFormModal, { type DeviceFormPayload } from '../components/DeviceFormModal.vue';
import DeviceSerialFullWidthRenderer from '../components/DeviceSerialFullWidthRenderer.vue';
import { companiesApi, equipmentsApi } from '@/api';
import type { CompanyDto } from '@/api/modules/companies';
import type { EquipmentDto } from '@/api/modules/equipments';

const deviceGridComponents = {
  DeviceSerialFullWidthRenderer,
};

ModuleRegistry.registerModules([AllCommunityModule]);

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
};

/** 与任务列表相同：父行 + 可选子行（详情） */
type DeviceFlatParent = DeviceRow & {
  level: 0;
  hasChildren: true;
  rowKind: 'device';
};

/** 序列号全宽行（横跨所有列含固定列，不占「客户名称」单格） */
type DeviceSerialStripRow = {
  id: string;
  rowKind: 'serialStrip';
  __fullWidth: true;
  parent: DeviceRow;
};

type DeviceFlatRow = DeviceFlatParent | DeviceSerialStripRow;

const MAINTENANCE_SAMPLES: MaintenanceInfo[] = [
  {
    schemeName: '年度预防性维护',
    intervalMonths: 12,
    lastMaintenanceDate: '2025-03-10',
    nextMaintenanceDate: '2026-03-10',
    remarks: '含断电检测、清灰与连接紧固。',
  },
  {
    schemeName: '半年巡检',
    intervalMonths: 6,
    lastMaintenanceDate: '2025-09-01',
    nextMaintenanceDate: '2026-03-01',
    remarks: '目视检查与运行参数记录。',
  },
  {
    schemeName: '季度点检',
    intervalMonths: 3,
    lastMaintenanceDate: '2025-12-05',
    nextMaintenanceDate: '2026-03-05',
    remarks: '易损件状态评估。',
  },
];

function maintenanceForIndex(i: number): MaintenanceInfo {
  return { ...MAINTENANCE_SAMPLES[i % MAINTENANCE_SAMPLES.length] };
}

function matchCategoryFromApi(
  productcategory: string | null | undefined,
  productgroup: string | null | undefined,
) {
  const catName = (productcategory ?? '').trim();
  const subName = (productgroup ?? '').trim();
  let categoryId = '';
  let subCategoryId = '';
  let categoryName = catName;
  let subCategoryName = subName;
  const cat = productCategoriesData.categories.find((c) => c.name === catName);
  if (cat) {
    categoryId = cat.id;
    categoryName = cat.name;
    const sub = cat.subCategories.find((s) => s.name === subName);
    if (sub) {
      subCategoryId = sub.id;
      subCategoryName = sub.name;
    }
  }
  return { categoryId, subCategoryId, categoryName, subCategoryName };
}

function mapEquipmentToRow(e: EquipmentDto, customerName: string, index: number): DeviceRow {
  const { categoryId, subCategoryId, categoryName, subCategoryName } = matchCategoryFromApi(
    e.productcategory,
    e.productgroup,
  );
  return {
    id: String(e.equipid ?? index),
    customerId: String(e.companyid),
    customerName,
    factoryName: e.factory ?? '',
    workshopName: e.workshop ?? '',
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName,
    model: e.equipmentname ?? '',
    quantity: e.number ?? 0,
    serialNumbers: [],
    maintenance: maintenanceForIndex(index),
  };
}

const companies = ref<CompanyDto[]>([]);
const devices = ref<DeviceRow[]>([]);

const customerOptions = computed(() =>
  [...companies.value]
    .filter((c) => c.companyname)
    .sort((a, b) => (a.companyname ?? '').localeCompare(b.companyname ?? ''))
    .map((c) => ({ id: String(c.companyid), name: c.companyname ?? '' })),
);

const searchText = ref('');
const selectedCustomer = ref('');

/** 展开中的设备 id（与任务列表 expandedRows 一致） */
const expandedRows = ref<Set<string>>(new Set());

const filteredDevices = computed(() => {
  let list = devices.value;

  if (selectedCustomer.value) {
    list = list.filter((d) => d.customerId === selectedCustomer.value);
  }

  const q = searchText.value.trim().toLowerCase();
  if (q) {
    list = list.filter((d) => {
      const hay = [d.customerName, d.factoryName, d.model, d.workshopName]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
});

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

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<GridApi | null>(null);

function updateGridData() {
  if (!gridApi.value) return;
  const flatRows = convertToFlatRows(filteredDevices.value, expandedRows.value);
  gridApi.value.setGridOption('rowData', flatRows);
}

function handleSearch() {
  updateGridData();
}

function toggleRow(deviceId: string) {
  if (expandedRows.value.has(deviceId)) {
    expandedRows.value.delete(deviceId);
  } else {
    expandedRows.value.add(deviceId);
  }
  updateGridData();
}

function resolveCategoryNames(categoryId: string, subCategoryId: string) {
  const cat = productCategoriesData.categories.find((c) => c.id === categoryId);
  const sub = cat?.subCategories.find((s) => s.id === subCategoryId);
  return {
    categoryName: cat?.name ?? '',
    subCategoryName: sub?.name ?? '',
  };
}

async function refreshAll() {
  try {
    companies.value = await companiesApi.listCompanies();
    const list = await equipmentsApi.listEquipments();
    const nameMap = new Map(
      companies.value.map((c) => [c.companyid, c.companyname ?? ''] as const),
    );
    devices.value = list.map((e, i) =>
      mapEquipmentToRow(e, nameMap.get(e.companyid) ?? `客户#${e.companyid}`, i),
    );
    updateGridData();
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '设备列表加载失败' });
  }
}

function formInitialFromDevice(d: DeviceRow) {
  return {
    customerId: d.customerId,
    factoryName: d.factoryName,
    workshopName: d.workshopName,
    categoryId: d.categoryId,
    subCategoryId: d.subCategoryId,
    model: d.model,
    quantity: d.quantity,
    serialNumbersText: d.serialNumbers.join('\n'),
  };
}

function emptyFormInitial() {
  return {
    customerId: '',
    factoryName: '',
    workshopName: '',
    categoryId: '',
    subCategoryId: '',
    model: '',
    quantity: 1,
    serialNumbersText: '',
  };
}

function toEquipmentBody(equipId: number | undefined, payload: DeviceFormPayload): EquipmentDto {
  const { categoryName, subCategoryName } = resolveCategoryNames(
    payload.categoryId,
    payload.subCategoryId,
  );
  return {
    ...(equipId != null ? { equipid: equipId } : {}),
    companyid: Number.parseInt(payload.customerId, 10),
    factory: payload.factoryName,
    workshop: payload.workshopName,
    equipmentname: payload.model,
    productcategory: categoryName || null,
    productgroup: subCategoryName || null,
    number: payload.quantity,
  };
}

function openCreateModal() {
  showModal({
    size: '600',
    centered: true,
    content: h(DeviceFormModal, {
      data: {
        title: '新建设备',
        customers: customerOptions.value.map((c) => ({ id: c.id, name: c.name })),
        initial: emptyFormInitial(),
        onSubmit: async (payload: DeviceFormPayload) => {
          try {
            await equipmentsApi.createEquipment(toEquipmentBody(undefined, payload));
            expandedRows.value.clear();
            await refreshAll();
            showToast({ message: '新增成功' });
          } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '新增失败' });
          }
        },
      },
    }),
  });
}

function openEditModal(id: string) {
  const row = devices.value.find((d) => d.id === id);
  if (!row) return;
  const equipId = Number.parseInt(id, 10);
  showModal({
    size: '600',
    centered: true,
    content: h(DeviceFormModal, {
      data: {
        title: '编辑设备',
        customers: customerOptions.value.map((c) => ({ id: c.id, name: c.name })),
        initial: formInitialFromDevice(row),
        onSubmit: async (payload: DeviceFormPayload) => {
          try {
            await equipmentsApi.updateEquipment(toEquipmentBody(equipId, payload));
            await refreshAll();
            showToast({ message: '保存成功' });
          } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '保存失败' });
          }
        },
      },
    }),
  });
}

async function removeDevice(id: string) {
  if (!confirm('确定要删除该设备吗？\n删除后不可恢复。')) {
    return;
  }
  try {
    await equipmentsApi.deleteEquipment(Number.parseInt(id, 10));
    expandedRows.value.delete(id);
    await refreshAll();
    showToast({ message: '删除成功' });
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '删除失败' });
  }
}

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);
  /* AG Grid 概念与 React 版一致，见 https://www.ag-grid.com/react-data-grid/getting-started/ */

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    /* false：避免在固定列区域重复渲染全宽行；概念见 AG Grid Full Width Rows 文档 */
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
    onGridReady: async (e) => {
      gridApi.value = e.api;
      await refreshAll();
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
            toggleRow(row.id);
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
      {
        field: 'actions',
        headerName: '操作',
        resizable: false,
        sortable: false,
        filter: false,
        width: 160,
        cellRenderer: (params: { data?: DeviceFlatRow }) => {
          if (params.data?.rowKind !== 'device') return '';
          return `
            <div class="ag-action-buttons">
              <button type="button" class="ag-action-btn ag-action-btn-edit" data-action="edit">编辑</button>
              <button type="button" class="ag-action-btn ag-action-btn-remove" data-action="delete">删除</button>
            </div>
          `;
        },
        onCellClicked: (params: CellClickedEvent<DeviceFlatRow>) => {
          const target = params.event?.target as HTMLElement | undefined;
          if (!target?.classList.contains('ag-action-btn')) return;
          const action = target.getAttribute('data-action');
          const row = params.data;
          if (!row || row.rowKind !== 'device') return;
          const id = row.id;
          if (action === 'edit') {
            openEditModal(id);
          } else if (action === 'delete') {
            removeDevice(id);
          }
        },
      },
    ],
    rowData: convertToFlatRows(filteredDevices.value, expandedRows.value),
    suppressCellFocus: true,
  };
});

watch([searchText, selectedCustomer, devices], () => {
  for (const id of [...expandedRows.value]) {
    if (!filteredDevices.value.some((d) => d.id === id)) {
      expandedRows.value.delete(id);
    }
  }
  updateGridData();
}, { deep: true });
</script>

<style scoped>
.page-section {
  padding-top: 1rem;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 1rem 0;
  margin-bottom: 0.25rem;
}

.filter-section__left {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.hint-text {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  line-height: 1.4;
}

.table-container {
  margin-top: 0.25rem;
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

.ag-action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  height: 100%;
  padding: 0.25rem 0;
}

.ag-action-btn {
  background-color: transparent;
  border: 1px solid var(--theme-color-soft-border);
  color: var(--theme-color-text);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  min-height: 2rem;
  white-space: nowrap;
  font-family: inherit;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ag-action-btn:hover {
  background-color: var(--theme-color-soft-hover);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:active {
  background-color: var(--theme-color-soft-active);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:focus {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.ag-action-btn:focus:not(:focus-visible) {
  outline: none;
}

.ag-action-btn-remove:hover {
  border-color: var(--theme-color-alarm);
  color: var(--theme-color-alarm);
}
</style>
