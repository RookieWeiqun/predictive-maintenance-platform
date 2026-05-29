<template>
  <div v-if="devices.length > 0" class="device-list-section">
    <div class="section-header">
      <h3>项目设备清单（共 {{ devices.length }} 组设备，{{ totalQuantity }} 台）</h3>
      <IxButton variant="tertiary" size="sm" @click="$emit('clear')">清空列表</IxButton>
    </div>
    <div class="table-container">
      <AgGridVue
        v-if="gridOptions"
        style="height: 100%; width: 100%"
        :gridOptions="gridOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxButton } from "@siemens/ix-vue";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Device {
  id: string;
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  factoryName?: string;
  workshopName?: string;
  electricRoom?: string;
}

interface Props {
  devices: Device[];
  getCategoryName: (id: string) => string;
  getSubCategoryName: (categoryId: string, subCategoryId: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [index: number];
  remove: [index: number];
  clear: [];
}>();

const totalQuantity = computed(() => {
  return props.devices.reduce((sum, device) => sum + device.quantity, 0);
});

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    columnDefs: [
      {
        field: 'index',
        headerName: '序号',
        resizable: true,
        sortable: false,
        filter: false,
        width: 80,
        valueGetter: (params: any) => params.node.rowIndex + 1,
      },
      {
        field: 'workshopName',
        headerName: '车间',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        valueGetter: (params: any) => params.data.workshopName || '-',
      },
      {
        field: 'electricRoom',
        headerName: '电气室',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        valueGetter: (params: any) => params.data.electricRoom || '-',
      },
      {
        field: 'categoryName',
        headerName: '产品大类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        valueGetter: (params: any) => props.getCategoryName(params.data.categoryId),
      },
      {
        field: 'subCategoryName',
        headerName: '产品子类',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        valueGetter: (params: any) => props.getSubCategoryName(params.data.categoryId, params.data.subCategoryId),
      },
      {
        field: 'model',
        headerName: '产品型号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 180,
      },
      {
        field: 'quantity',
        headerName: '数量',
        resizable: true,
        sortable: true,
        filter: true,
        width: 100,
        type: 'numericColumn',
      },
      {
        field: 'actions',
        headerName: '操作',
        resizable: false,
        sortable: false,
        filter: false,
        width: 180,
        cellRenderer: (params: any) => {
          return `
            <div class="ag-action-buttons">
              <button class="ag-action-btn ag-action-btn-edit" data-action="edit">编辑</button>
              <button class="ag-action-btn ag-action-btn-remove" data-action="remove">删除</button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          if (params.event?.target?.classList.contains('ag-action-btn')) {
            const action = params.event.target.getAttribute('data-action');
            // 使用存储在行数据中的原始索引
            const originalIndex = params.data.originalIndex;
            
            if (action === 'edit') {
              emit('edit', originalIndex);
            } else if (action === 'remove') {
              emit('remove', originalIndex);
            }
          }
        },
      },
    ],
    suppressCellFocus: true,
    onGridReady: (params: any) => {
      gridApi.value = params.api;
      updateGridData();
    },
  };
});

// 监听设备变化，更新表格数据
watch(() => props.devices, () => {
  updateGridData();
}, { deep: true });

const updateGridData = () => {
  if (!gridApi.value) return;
  // 为每行数据添加原始索引，用于编辑和删除操作
  const rowData = props.devices.map((device, index) => ({
    ...device,
    originalIndex: index,
  }));
  gridApi.value.setGridOption('rowData', rowData);
};
</script>

<style scoped>
.device-list-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.table-container {
  margin-top: 1rem;
  height: calc(10 * 42px + 120px); /* 10行 + 表头 + 分页器 */
  min-height: 400px;
}
</style>
