<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>手动创建设备</IxModalHeader>
      <IxModalContent>
        <AddDeviceModalContent
          ref="contentRef"
          :customer-id="data?.customerId"
          :customer-name="data?.customerName"
          :factory="data?.factory"
          :editing-device="data?.editingDevice"
          @submit="(device) => handleSubmit(device, closeModal)"
        />
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">取消</IxButton>
        <IxButton variant="primary" @click="handleOk">确定</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Modal, IxModalHeader, IxModalContent, IxModalFooter, IxButton } from '@siemens/ix-vue';
import AddDeviceModalContent from './AddDeviceModalContent.vue';

interface Props {
  data?: {
    customerId?: string;
    customerName?: string;
    factory?: string;
    editingDevice?: {
      customerId?: string;
      factoryName?: string;
      workshopName?: string;
      electricRoom?: string;
      categoryId: string;
      subCategoryId: string;
      model: string;
      quantity: number;
    } | null;
    onSubmit: (device: {
      customerId: string;
      factoryName: string;
      workshopName: string;
      electricRoom: string;
      categoryId: string;
      subCategoryId: string;
      model: string;
      quantity: number;
    }) => void;
  };
}

const props = defineProps<Props>();

const contentRef = ref<InstanceType<typeof AddDeviceModalContent> | null>(null);

const handleSubmit = (device: {
  customerId: string;
  factoryName: string;
  workshopName: string;
  electricRoom: string;
  categoryId: string;
  subCategoryId: string;
  model: string;
  quantity: number;
}, closeModal: () => void) => {
  if (props.data?.onSubmit) {
    props.data.onSubmit(device);
    closeModal();
  }
};

const handleOk = () => {
  if (contentRef.value) {
    // handleSubmit 会触发 submit 事件，然后 handleSubmit 会关闭模态窗口
    contentRef.value.handleSubmit();
  }
};
</script>
