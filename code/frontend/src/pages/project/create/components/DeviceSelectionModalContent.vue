<template>
  <div class="customer-devices-section">
    <div class="section-header">
      <h3>设备档案（{{ factory }}）</h3>
      <div class="header-actions">
        <span class="device-count">共 {{ devices.length }} 组设备</span>
        <IxButton 
          variant="primary" 
          size="sm" 
          :disabled="selectedDeviceIds.length === 0"
          @click="handleAdd"
        >
          添加选中设备到项目（{{ selectedDeviceIds.length }}）
        </IxButton>
      </div>
    </div>
    
    <div v-if="devices.length > 0" class="table-container">
      <AgGridVue
        v-if="modalGridOptions"
        style="height: 100%; width: 100%"
        :gridOptions="modalGridOptions"
        @selectionChanged="handleSelectionChanged"
      />
    </div>
    <div v-else class="empty-state">
      <p>该客户在该工厂下暂无设备档案</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { IxButton } from '@siemens/ix-vue';
import type { SelectableProjectDevice } from '../utils/equipmentSelection';

interface Props {
  factory: string;
  gridOptions: any;
  devices: SelectableProjectDevice[];
  closeModal: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  add: [deviceIds: string[]];
}>();

const selectedDeviceIds = ref<string[]>([]);
const gridApi = ref<any>(null);

const modalGridOptions = computed(() => {
  if (!props.gridOptions) return null;

  return {
    ...props.gridOptions,
    onGridReady: (params: any) => {
      gridApi.value = params.api;
      updateGridData();
      if (props.gridOptions.onGridReady) {
        props.gridOptions.onGridReady(params);
      }
    },
  };
});

const updateGridData = () => {
  if (!gridApi.value) return;

  const rowData = props.devices.map((device) => ({
    id: device.id,
    factoryName: device.factoryName,
    workshopName: device.workshopName,
    electricRoom: device.electricRoom,
    categoryName: device.categoryName,
    subCategoryName: device.subCategoryName,
    model: device.model,
    quantity: device.quantity,
    serialRange:
      device.serialNumbers && device.serialNumbers.length > 0
        ? `${device.serialNumbers[0]} ~ ${device.serialNumbers[device.serialNumbers.length - 1]}`
        : '-',
    _deviceData: device,
  }));

  gridApi.value.setGridOption('rowData', rowData);
};

watch(
  () => props.devices,
  () => {
    updateGridData();
  },
  { deep: true, immediate: true },
);

const handleSelectionChanged = (event: any) => {
  if (!gridApi.value) {
    gridApi.value = event.api;
  }
  const selectedRows = event.api.getSelectedRows();
  selectedDeviceIds.value = selectedRows.map((row: any) => row.id);
};

const handleAdd = () => {
  if (selectedDeviceIds.value.length > 0) {
    emit('add', selectedDeviceIds.value);
    selectedDeviceIds.value = [];
    if (gridApi.value) {
      gridApi.value.deselectAll();
    }
    props.closeModal();
  }
};
</script>

<style scoped>
.customer-devices-section {
  margin-bottom: 2rem;
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
  height: calc(10 * 42px + 120px);
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}
</style>
