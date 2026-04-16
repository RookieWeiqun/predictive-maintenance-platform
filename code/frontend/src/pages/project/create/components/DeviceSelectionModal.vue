<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>选择客户设备</IxModalHeader>
      <IxModalContent>
        <DeviceSelectionModalContent
          v-if="data?.customerId && data?.gridOptions"
          :customer-id="data.customerId"
          :grid-options="data.gridOptions"
          :close-modal="closeModal"
          @add="handleAdd"
        />
        <div v-else class="empty-state">
          <p>请先在"基本信息"步骤中选择客户</p>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">关闭</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { Modal, IxModalHeader, IxModalContent, IxModalFooter, IxButton, ModalSlotProps } from '@siemens/ix-vue';
import DeviceSelectionModalContent from './DeviceSelectionModalContent.vue';

interface Props {
  data?: {
    customerId: string;
    gridOptions: any;
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
