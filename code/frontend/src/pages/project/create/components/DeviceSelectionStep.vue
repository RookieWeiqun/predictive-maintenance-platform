<template>
  <div class="step-content">
    <p class="step-description">
      从当前客户、当前工厂下的设备档案中选择设备加入项目（与「基本信息」中的客户、工厂一致），也可手动创建或批量导入。
    </p>
    
    <div class="device-actions">
      <IxButton 
        variant="primary" 
        :disabled="!canSelectFromLibrary || loadingDevices"
        @click="handleOpenDeviceSelection"
      >
        {{ loadingDevices ? '加载设备…' : '选择设备' }}
      </IxButton>
      <IxButton variant="secondary" @click="handleShowAddModal">手动创建设备</IxButton>
      <IxButton variant="secondary" @click="handleShowUploadModal">批量导入设备</IxButton>
    </div>
    <p v-if="!canSelectFromLibrary && (customerId || factory)" class="helper-text">
      请先在「基本信息」中填写客户与工厂，系统将加载该工厂下全部设备供选择。
    </p>
    <p v-else-if="loadError" class="helper-text" style="color: var(--theme-color-alarm)">{{ loadError }}</p>
    <p v-else-if="canSelectFromLibrary && !loadingDevices && selectableDevices.length === 0" class="helper-text">
      该客户在该工厂下暂无设备档案，可先「手动创建设备」或到设备管理维护档案。
    </p>
    
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
import { IxButton, showModal, showToast } from '@siemens/ix-vue';
import ProjectDeviceList from './ProjectDeviceList.vue';
import DeviceSelectionModal from './DeviceSelectionModal.vue';
import UploadDeviceModal from './UploadDeviceModal.vue';
import AddDeviceModalWrapper from './AddDeviceModalWrapper.vue';
import {
  loadDevicesForProjectSelection,
  type SelectableProjectDevice,
} from '../utils/equipmentSelection';

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
  customerId: string;
  /** 与基本信息中的工厂一致，用于筛选设备档案 */
  factory: string;
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
const selectableDevices = ref<SelectableProjectDevice[]>([]);
const loadingDevices = ref(false);
const loadError = ref('');

const canSelectFromLibrary = computed(
  () =>
    !!props.customerId &&
    typeof props.factory === 'string' &&
    props.factory.trim().length > 0,
);

async function refreshSelectableDevices() {
  loadError.value = '';
  selectableDevices.value = [];
  if (!canSelectFromLibrary.value) return;
  loadingDevices.value = true;
  try {
    selectableDevices.value = await loadDevicesForProjectSelection(
      props.customerId,
      props.factory,
    );
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '设备列表加载失败';
    showToast({ message: loadError.value });
  } finally {
    loadingDevices.value = false;
  }
}

watch(
  () => [props.customerId, props.factory] as const,
  () => {
    void refreshSelectableDevices();
  },
  { immediate: true },
);

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
        field: 'electricRoom',
        headerName: '电气室',
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
  };
});

const handleOpenDeviceSelection = () => {
  if (!canSelectFromLibrary.value || !gridOptions.value) return;

  showModal({
    size: 'full-width',
    content: h(DeviceSelectionModal, {
      data: {
        customerId: props.customerId,
        factory: props.factory.trim(),
        gridOptions: gridOptions.value,
        devices: [...selectableDevices.value],
        onAdd: (deviceIds: string[]) => {
          handleAddSelectedDevices(deviceIds);
        },
      },
    }),
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
          const projectDevice: Device = {
            id: `device-${Date.now()}`,
            ...device,
          };
          emit('add-devices', [projectDevice]);
        },
      },
    }),
  });
};

const handleShowUploadModal = () => {
  showModal({
    size: '600',
    content: h(UploadDeviceModal, {
      data: {
        onConfirm: (files: any[]) => {
          handleUploadConfirm(files);
        },
      },
    }),
  });
};

const handleAddSelectedDevices = (deviceIds: string[]) => {
  if (deviceIds.length === 0) return;

  const devicesToAdd = selectableDevices.value
    .filter((device) => deviceIds.includes(device.id))
    .map((device) => {
      const projectDevice: Device = {
        /** 必须与设备档案 `equipid` 一致，否则提交时无法写入 ProjectEquipments */
        id: device.id,
        categoryId: device.categoryId,
        subCategoryId: device.subCategoryId,
        model: device.model,
        serialNumber:
          device.serialNumbers && device.serialNumbers.length > 0
            ? device.serialNumbers[0]
            : undefined,
        quantity: device.quantity,
        factoryName: device.factoryName,
        workshopName: device.workshopName,
        electricRoom: device.electricRoom,
      };
      return projectDevice;
    });

  if (devicesToAdd.length > 0) {
    emit('add-devices', devicesToAdd);
  }
};

const handleUploadConfirm = (files: any[]) => {
  if (files.length === 0) return;
  console.log('导入文件:', files);
};
</script>

<style scoped>
.step-content {
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

.helper-text {
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
  margin: 0 0 1rem 0;
  line-height: 1.4;
}

.device-actions {
  display: flex;
  gap: 1rem;
}
</style>
