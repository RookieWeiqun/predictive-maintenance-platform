<!-- 客户新增/编辑 — 使用官方 Modal + showModal({ content }) 模式 -->
<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>{{ data?.title ?? '客户' }}</IxModalHeader>
      <IxModalContent>
        <IxLayoutAuto>
          <IxFieldLabel htmlFor="customerName">客户名称 <span class="required">*</span></IxFieldLabel>
          <IxInput
            id="customerName"
            v-model="form.name"
            placeholder="请输入客户名称"
          />
          <IxFieldLabel htmlFor="customerIndustry">行业</IxFieldLabel>
          <IxInput
            id="customerIndustry"
            v-model="form.industry"
            placeholder="请输入行业"
          />
          <IxFieldLabel htmlFor="customerContact">联系人</IxFieldLabel>
          <IxInput
            id="customerContact"
            v-model="form.contact"
            placeholder="请输入联系人"
          />
          <IxFieldLabel htmlFor="customerPhone">电话</IxFieldLabel>
          <IxInput
            id="customerPhone"
            v-model="form.phone"
            placeholder="请输入电话"
          />
          <IxFieldLabel htmlFor="customerEmail">邮箱</IxFieldLabel>
          <IxInput
            id="customerEmail"
            v-model="form.email"
            placeholder="请输入邮箱"
          />
          <IxFieldLabel htmlFor="customerRemarks">备注</IxFieldLabel>
          <IxInput
            id="customerRemarks"
            v-model="form.remarks"
            placeholder="备注（可选）"
          />
        </IxLayoutAuto>
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
import {
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  IxButton,
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
} from '@siemens/ix-vue';

export type CustomerFormPayload = {
  name: string;
  industry: string;
  contact: string;
  phone: string;
  email: string;
  remarks: string;
};

const props = defineProps<{
  data?: {
    title: string;
    initial: CustomerFormPayload;
    onSubmit: (payload: CustomerFormPayload) => void;
  };
}>();

const form = ref<CustomerFormPayload>({ ...emptyPayload() });

function emptyPayload(): CustomerFormPayload {
  return {
    name: '',
    industry: '',
    contact: '',
    phone: '',
    email: '',
    remarks: '',
  };
}

watch(
  () => props.data?.initial,
  (initial) => {
    if (initial) {
      form.value = { ...initial };
    } else {
      form.value = emptyPayload();
    }
  },
  { immediate: true },
);

function submit(closeModal: () => void) {
  const name = form.value.name.trim();
  if (!name) {
    alert('请填写客户名称');
    return;
  }
  const payload: CustomerFormPayload = {
    name,
    industry: form.value.industry.trim(),
    contact: form.value.contact.trim(),
    phone: form.value.phone.trim(),
    email: form.value.email.trim(),
    remarks: form.value.remarks.trim(),
  };
  props.data?.onSubmit(payload);
  closeModal();
}
</script>

<style scoped>
.required {
  color: var(--theme-color-alarm);
}
</style>
