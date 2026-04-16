<!-- 项目详情页 -->
<template>
  <div class="project-detail-page">
    <IxContentHeader :header-title="`项目详情${project ? `：${project.name}` : ''}`">
      <IxButton variant="secondary" @click="goBack">返回列表</IxButton>
      <IxButton variant="secondary" :disabled="!project" @click="goToReport">查看报告</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 项目基本信息（参考方案详情页：surface 容器 + 表单式展示） -->
        <div class="project-basic-info">
          <template v-if="project">
            <IxInput
              :model-value="project.projectNo"
              label="项目编号"
              readonly
              style="flex: 1"
            />
            <IxInput
              :model-value="project.name"
              label="项目名称"
              readonly
              style="flex: 1"
            />
            <IxInput
              :model-value="project.customer"
              label="客户"
              readonly
              style="flex: 1"
            />
            <IxInput
              :model-value="project.factory"
              label="工厂"
              readonly
              style="flex: 1"
            />
            <IxInput
              :model-value="project.projectManager"
              label="项目经理"
              readonly
              style="flex: 1"
            />
            <IxInput
              :model-value="statusText"
              label="状态"
              readonly
              style="flex: 1"
            />
          </template>
          <div v-else class="empty-hint">未找到该项目（id={{ projectId }}）</div>
        </div>

        <!-- 维护设备列表（参考方案详情页：容器撑满剩余高度） -->
        <div class="project-table-container">
          <div class="table-header">
            <div class="table-title">
              维护设备列表
              <span class="table-title__sub">（共 {{ projectDeviceRows.length }} 行）</span>
            </div>
          </div>
          <AgGridVue
            v-if="gridOptions"
            style="flex: 1; width: 100%; min-height: 0"
            :gridOptions="gridOptions"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import { ModuleRegistry, AllCommunityModule, GridApi, GridOptions } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  showModal,
} from '@siemens/ix-vue';

import projectsData from '@/mockdata/project/projects.json';
import statusData from '@/mockdata/common/projectStatus.json';
import devicesData from '@/mockdata/common/devices.json';

ModuleRegistry.registerModules([AllCommunityModule]);

type Project = (typeof projectsData.projects)[number];
type DeviceRow = (typeof devicesData.devices)[number];
type MaintenanceInfo = {
  schemeName: string;
  intervalMonths: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  remarks: string;
};

type ProjectDeviceRow = DeviceRow & {
  maintenance: MaintenanceInfo;
  serialNumber: string;
  __rowId: string;
};

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.id ?? ''));

const project = computed<Project | undefined>(() => {
  return projectsData.projects.find((p) => String(p.id) === projectId.value);
});

const statusText = computed(() => {
  const s = project.value?.status;
  if (!s) return '-';
  return statusData.statusMap[s as keyof typeof statusData.statusMap] ?? s;
});

const projectDevices = computed<DeviceRow[]>(() => {
  const p = project.value;
  if (!p) return [];
  return devicesData.devices.filter(
    (d) => d.customerName === p.customer && d.factoryName === p.factory,
  );
});

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

const projectDeviceRows = computed<ProjectDeviceRow[]>(() => {
  const rows: ProjectDeviceRow[] = [];
  const list = projectDevices.value;
  for (let deviceIdx = 0; deviceIdx < list.length; deviceIdx++) {
    const d = list[deviceIdx];
    const serials = Array.isArray(d.serialNumbers) && d.serialNumbers.length ? d.serialNumbers : ['-'];
    for (let serialIdx = 0; serialIdx < serials.length; serialIdx++) {
      const serialNumber = serials[serialIdx];
      const rowIndex = rows.length;
      rows.push({
        ...d,
        serialNumber,
        __rowId: `${d.id}__sn__${serialIdx}`,
        maintenance: maintenanceForIndex(rowIndex),
      });
    }
  }
  return rows;
});

function goBack() {
  router.push('/project/list');
}

function goToReport() {
  if (!project.value) return;
  router.push(`/project/report/${project.value.id}`);
}

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<GridApi | null>(null);

const MaintenanceDataModal = defineComponent({
  name: 'MaintenanceDataModal',
  props: {
    title: { type: String, required: true },
    device: { type: Object as () => ProjectDeviceRow, required: true },
  },
  setup(props) {
    return () =>
      h(Modal, {}, {
        default: ({ closeModal, dismissModal }: { closeModal: () => void; dismissModal: () => void }) => [
          h(IxModalHeader, {}, () => props.title),
          h(IxModalContent, {}, () =>
            h('div', { class: 'maintenance-modal' }, [
              h('div', { class: 'maintenance-grid' }, [
                h(IxInput, {
                  label: '客户',
                  readonly: true,
                  modelValue: props.device.customerName,
                }),
                h(IxInput, {
                  label: '工厂',
                  readonly: true,
                  modelValue: props.device.factoryName,
                }),
                h(IxInput, {
                  label: '车间',
                  readonly: true,
                  modelValue: props.device.workshopName,
                }),
                h(IxInput, {
                  label: '产品型号',
                  readonly: true,
                  modelValue: props.device.model,
                }),
                h(IxInput, {
                  label: '序列号',
                  readonly: true,
                  modelValue: props.device.serialNumber,
                }),
                h(IxInput, {
                  label: '维护方案',
                  readonly: true,
                  modelValue: props.device.maintenance.schemeName,
                }),
                h(IxInput, {
                  label: '周期（月）',
                  readonly: true,
                  modelValue: String(props.device.maintenance.intervalMonths),
                }),
                h(IxInput, {
                  label: '上次维护日期',
                  readonly: true,
                  modelValue: props.device.maintenance.lastMaintenanceDate,
                }),
                h(IxInput, {
                  label: '下次维护日期',
                  readonly: true,
                  modelValue: props.device.maintenance.nextMaintenanceDate,
                }),
              ]),
              h(IxInput, {
                label: '备注',
                readonly: true,
                modelValue: props.device.maintenance.remarks,
              }),
            ]),
          ),
          h(IxModalFooter, {}, () => [
            h(IxButton, { variant: 'secondary', onClick: dismissModal }, () => '关闭'),
            h(IxButton, { variant: 'primary', onClick: closeModal }, () => '确定'),
          ]),
        ],
      });
  },
});

function openMaintenanceModal(row: ProjectDeviceRow) {
  showModal({
    size: '600',
    centered: true,
    content: h(MaintenanceDataModal, {
      title: '设备维护数据',
      device: row,
    }),
  });
}

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    onGridReady: (e) => {
      gridApi.value = e.api;
      e.api.setGridOption('rowData', projectDeviceRows.value);
    },
    getRowId: (p) => {
      const d = p.data as ProjectDeviceRow | undefined;
      return d?.__rowId ?? '';
    },
    columnDefs: [
      {
        field: 'customerName',
        headerName: '客户名称',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        cellStyle: { fontWeight: 500, color: 'var(--theme-color-primary)' },
      },
      {
        field: 'factoryName',
        headerName: '工厂',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
      },
      {
        field: 'workshopName',
        headerName: '车间',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
      },
      {
        field: 'categoryName',
        headerName: '产品大类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
      },
      {
        field: 'subCategoryName',
        headerName: '产品子类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
      },
      {
        field: 'model',
        headerName: '产品型号',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'serialNumber',
        headerName: '序列号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        cellStyle: {
          fontFamily: 'Courier New, monospace',
          fontWeight: 500,
        },
      },
      {
        field: 'actions',
        headerName: '操作',
        pinned: 'right',
        resizable: false,
        sortable: false,
        filter: false,
        width: 160,
        cellRenderer: () => {
          return `
            <div class="ag-action-buttons">
              <button type="button" class="ag-action-btn ag-action-btn-maintenance" data-action="maintenance">
                维护数据
              </button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          const target = params.event?.target as HTMLElement | undefined;
          if (!target?.classList.contains('ag-action-btn')) return;
          const action = target.getAttribute('data-action');
          if (action !== 'maintenance') return;
          const row = params.data as ProjectDeviceRow | undefined;
          if (!row) return;
          openMaintenanceModal(row);
        },
      },
    ],
    rowData: projectDeviceRows.value,
    suppressCellFocus: true,
  };
});

watch(projectDeviceRows, (rows) => {
  if (!gridApi.value) return;
  gridApi.value.setGridOption('rowData', rows);
});
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  overflow: hidden;
  margin-top: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
  flex-shrink: 0;
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.table-title__sub {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--theme-color-weak-text);
}

.maintenance-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.maintenance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: 0.75rem 1rem;
}
</style>

<style>
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
</style>
