<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>批量导入设备清单</IxModalHeader>
      <IxModalContent>
        <div class="upload-modal-content">
          <IxFieldLabel>选择Excel文件</IxFieldLabel>
          <IxUpload
            :files="uploadedFiles"
            @files-added="handleFilesAdded"
            @files-removed="handleFilesRemoved"
            accept=".xlsx,.xls"
          />
          <p class="helper-text">支持Excel文件格式，包含设备型号、序列号、数量等信息</p>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">取消</IxButton>
        <IxButton 
          variant="primary" 
          :disabled="uploadedFiles.length === 0"
          @click="() => handleConfirm(closeModal)"
        >
          确认导入
        </IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Modal, IxModalHeader, IxModalContent, IxModalFooter, IxButton, IxFieldLabel, IxUpload } from '@siemens/ix-vue';

interface Props {
  data?: {
    onConfirm: (files: any[]) => void;
  };
}

const props = defineProps<Props>();

const uploadedFiles = ref<any[]>([]);

const handleFilesAdded = (files: any[]) => {
  uploadedFiles.value = [...uploadedFiles.value, ...files];
};

const handleFilesRemoved = (files: any[]) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => !files.includes(f));
};

const handleConfirm = (closeModal: () => void) => {
  if (uploadedFiles.value.length > 0 && props.data?.onConfirm) {
    props.data.onConfirm(uploadedFiles.value);
    closeModal();
  }
};
</script>

<style scoped>
.upload-modal-content {
  padding: 1rem 0;
}

.helper-text {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  margin: 0.5rem 0 0 0;
}
</style>
