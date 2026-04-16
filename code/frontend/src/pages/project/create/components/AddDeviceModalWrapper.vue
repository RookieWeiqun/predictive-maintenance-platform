<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>手动创建设备</IxModalHeader>
      <IxModalContent>
        <AddDeviceModalContent
          ref="contentRef"
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
    editingDevice?: {
      categoryId: string;
      subCategoryId: string;
      model: string;
      serialNumber?: string;
      quantity: number;
    } | null;
    onSubmit: (device: {
      categoryId: string;
      subCategoryId: string;
      model: string;
      serialNumber?: string;
      quantity: number;
    }) => void;
  };
}

const props = defineProps<Props>();

const contentRef = ref<InstanceType<typeof AddDeviceModalContent> | null>(null);

const handleSubmit = (device: {
  categoryId: string;
  subCategoryId: string;
  model: string;
  serialNumber?: string;
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
