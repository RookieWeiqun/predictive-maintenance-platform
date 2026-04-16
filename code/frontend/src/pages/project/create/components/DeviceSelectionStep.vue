<template>
  <div class="step-content">
    <p class="step-description">从客户设备清单中选择设备添加到项目中，也可以手动创建或批量导入设备。</p>
    
    <div class="device-actions">
      <IxButton 
        variant="primary" 
        :disabled="!customerId"
        @click="handleOpenDeviceSelection"
      >
        选择设备
      </IxButton>
      <IxButton variant="secondary" @click="handleShowAddModal">手动创建设备</IxButton>
      <IxButton variant="secondary" @click="handleShowUploadModal">批量导入设备</IxButton>
    </div>
    
    <!-- 项目设备清单表格 -->
    <ProjectDeviceList 
      :devices="projectDevices"
      :get-category-name="getCategoryName"
      :get-sub-category-name="getSubCategoryName"
      @edit="(index) => $emit('edit-device', index)"
      @remove="(index) => $emit('remove-device', index)"
      @clear="() => $emit('clear-devices')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import {
  IxButton,
  IxFieldLabel,
  IxUpload,
  showModal,
} from "@siemens/ix-vue";
import devicesData from '@/mockdata/common/devices.json';
import ProjectDeviceList from './ProjectDeviceList.vue';
import DeviceSelectionModal from './DeviceSelectionModal.vue';
import UploadDeviceModal from './UploadDeviceModal.vue';
import AddDeviceModalWrapper from './AddDeviceModalWrapper.vue';

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
}

interface Props {
  customerId: string;
  projectDevices: Device[];
  getCategoryName: (id: string) => string;
  getSubCategoryName: (categoryId: string, subCategoryId: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'add-devices': [devices: Device[]];
  'show-add-modal': [];
  'edit-device': [index: number];
  'remove-device': [index: number];
  'clear-devices': [];
}>();

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

const customerDevices = computed(() => {
  if (!props.customerId) return [];
  return devicesData.devices.filter(device => device.customerId === props.customerId);
});

// 初始化 ag-grid
onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    rowDragManaged: false,
    tooltipShowDelay: 500,
    pagination: true,
    paginationPageSize: 10,
    paginationPageSizeSelector: [10, 20, 50, 100],
    rowSelection: {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      selectAll: 'filtered',
    },
    columnDefs: [
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
        field: 'serialRange',
        headerName: '序列号范围',
        resizable: true,
        sortable: false,
        filter: false,
        width: 200,
        cellStyle: { fontFamily: 'Courier New, monospace', fontSize: '0.875rem' },
      },
    ],
    suppressCellFocus: true,
    onGridReady: (params: any) => {
      gridApi.value = params.api;
      updateGridData();
    },
  };
});

// 监听客户设备变化，更新表格数据
watch(() => customerDevices.value, () => {
  updateGridData();
}, { deep: true });

// 更新表格数据
const updateGridData = () => {
  if (!gridApi.value) return;
  
  const rowData = customerDevices.value.map(device => ({
    id: device.id,
    factoryName: device.factoryName,
    workshopName: device.workshopName,
    categoryName: device.categoryName,
    subCategoryName: device.subCategoryName,
    model: device.model,
    quantity: device.quantity,
    serialRange: device.serialNumbers && device.serialNumbers.length > 0
      ? `${device.serialNumbers[0]} ~ ${device.serialNumbers[device.serialNumbers.length - 1]}`
      : '-',
    // 保留原始设备数据用于后续处理
    _deviceData: device,
  }));
  
  gridApi.value.setGridOption('rowData', rowData);
};


const handleOpenDeviceSelection = () => {
  if (!props.customerId) return;
  
  showModal({
    size: 'full-width',
    content: h(DeviceSelectionModal, {
      data: {
        customerId: props.customerId,
        gridOptions: gridOptions.value,
        onAdd: (deviceIds: string[]) => {
          handleAddSelectedDevices(deviceIds);
        }
      }
    })
  });
};

const handleShowAddModal = () => {
  showModal({
    size: '600',
    content: h(AddDeviceModalWrapper, {
      data: {
        onSubmit: (device: {
          categoryId: string;
          subCategoryId: string;
          model: string;
          serialNumber?: string;
          quantity: number;
        }) => {
          // 将设备添加到项目设备列表
          const projectDevice: Device = {
            id: `device-${Date.now()}`,
            ...device,
          };
          emit('add-devices', [projectDevice]);
        }
      }
    })
  });
};

const handleShowUploadModal = () => {
  showModal({
    size: '600',
    content: h(UploadDeviceModal, {
      data: {
        onConfirm: (files: any[]) => {
          handleUploadConfirm(files);
        }
      }
    })
  });
};

const handleAddSelectedDevices = (deviceIds: string[]) => {
  if (deviceIds.length === 0) return;
  
  const devicesToAdd = customerDevices.value
    .filter(device => deviceIds.includes(device.id))
    .map((device, index) => {
      const projectDevice: Device = {
        id: `project-device-${Date.now()}-${index}-${device.id}`,
        categoryId: device.categoryId,
        subCategoryId: device.subCategoryId,
        model: device.model,
        serialNumber: device.serialNumbers && device.serialNumbers.length > 0 
          ? device.serialNumbers[0] 
          : undefined,
        quantity: device.quantity,
        factoryName: device.factoryName,
        workshopName: device.workshopName,
      };
      return projectDevice;
    });
  
  if (devicesToAdd.length > 0) {
    emit('add-devices', devicesToAdd);
  }
};

const handleUploadConfirm = (files: any[]) => {
  if (files.length === 0) return;
  
  // TODO: 实现Excel解析逻辑，解析后添加到项目设备列表
  // 这里暂时只是记录日志
  console.log('导入文件:', files);
};
</script>

<style scoped>
.step-content {
  /* height: 70vh; */
  padding: 0.5rem;
  min-height: 400px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
}

.step-description {
  color: var(--theme-color-text-soft);
  margin-bottom: 1.5rem;
}

.customer-devices-section {
  margin-bottom: 0.5rem;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.device-count {
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.table-container {
  margin-top: 1rem;
  height: calc(10 * 42px + 120px); /* 10行 + 表头 + 分页器 */
  min-height: 400px;
}

.ix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.ix-table thead {
  background-color: var(--theme-color-soft);
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.ix-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 500;
  color: var(--theme-color-text-soft);
  white-space: nowrap;
}

.ix-table tbody tr {
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.ix-table tbody tr:hover {
  background-color: var(--theme-color-soft-hover);
}

.ix-table td {
  padding: 1rem;
  color: var(--theme-color-text);
  vertical-align: middle;
}

.selected-row {
  background-color: var(--theme-color-soft-hover) !important;
}

.serial-range {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}

.divider-section {
  margin: 2rem 0 1rem 0;
  padding-top: 2rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.divider-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin: 0 0 1rem 0;
}

.device-actions {
  display: flex;
  gap: 1rem;
  /* margin-bottom: 2rem; */
}

.upload-modal-content {
  padding: 1rem 0;
}

.helper-text {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  margin: 0.5rem 0 0 0;
}
</style>
