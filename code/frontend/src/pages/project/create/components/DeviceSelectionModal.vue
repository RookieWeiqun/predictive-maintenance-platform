<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>选择设备 · {{ data?.factory }}</IxModalHeader>
      <IxModalContent>
        <DeviceSelectionModalContent
          v-if="data?.customerId && data?.factory && data?.gridOptions && Array.isArray(data.devices)"
          :factory="data.factory"
          :devices="data.devices"
          :grid-options="data.gridOptions"
          :close-modal="closeModal"
          @add="handleAdd"
        />
        <div v-else class="empty-state">
          <p>请先在「基本信息」中选择客户并填写工厂</p>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">关闭</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal, IxModalHeader, IxModalContent, IxModalFooter, IxButton } from '@siemens/ix-vue';
import DeviceSelectionModalContent from './DeviceSelectionModalContent.vue';
import type { SelectableProjectDevice } from '../utils/equipmentSelection';

interface Props {
  data?: {
    customerId: string;
    factory: string;
    gridOptions: any;
    devices: SelectableProjectDevice[];
    onAdd: (deviceIds: string[]) => void;
  };
}

const props = defineProps<Props>();

const handleAdd = (deviceIds: string[]) => {
  if (props.data?.onAdd) {
    props.data.onAdd(deviceIds);
  }
};
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}
</style>
