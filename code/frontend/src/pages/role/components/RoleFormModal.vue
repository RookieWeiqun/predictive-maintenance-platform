<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>{{ data?.title ?? '角色' }}</IxModalHeader>
      <IxModalContent>
        <IxInput v-model="roleName" label="角色名称" placeholder="请输入角色名称" />
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">取消</IxButton>
        <IxButton variant="primary" @click="submit(closeModal)">确定</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal, IxButton, IxInput, IxModalContent, IxModalFooter, IxModalHeader } from '@siemens/ix-vue';

const props = defineProps<{
  data?: {
    title: string;
    initial: string;
    onSubmit: (roleName: string) => void;
  };
}>();

const roleName = ref('');

watch(
  () => props.data,
  (value) => {
    roleName.value = value?.initial ?? '';
  },
  { immediate: true },
);

function submit(closeModal: () => void) {
  const value = roleName.value.trim();
  if (!value) {
    alert('请填写角色名称');
    return;
  }
  props.data?.onSubmit(value);
  closeModal();
}
</script>