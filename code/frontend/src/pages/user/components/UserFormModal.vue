<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>{{ data?.title ?? '用户' }}</IxModalHeader>
      <IxModalContent>
        <IxLayoutAuto>
          <IxInput v-model="form.username" label="用户名" placeholder="请输入用户名" />
          <IxSelect v-model="form.companyId" label="所属客户" placeholder="请选择客户">
            <IxSelectItem v-for="company in companyOptions" :key="company.value" :label="company.label" :value="company.value" />
          </IxSelect>
          <IxInput v-model="form.mobile" label="手机号" placeholder="请输入手机号" />
          <IxInput v-model="form.email" label="邮箱" placeholder="请输入邮箱" />
          <IxInput v-model="form.industry" label="行业" placeholder="请输入行业" />
          <IxInput v-model="form.gid" label="OneID GID" placeholder="用于 OneID 账号映射" />
          <IxSelect v-model="form.role" label="角色" placeholder="请选择角色">
            <IxSelectItem v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </IxSelect>
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
  IxModalContent,
  IxModalFooter,
  IxModalHeader,
  IxButton,
  IxInput,
  IxLayoutAuto,
  IxSelect,
  IxSelectItem,
} from '@siemens/ix-vue';

export type UserFormPayload = {
  username: string;
  companyId: string;
  mobile: string;
  email: string;
  industry: string;
  gid: string;
  role: string;
};

type RoleOption = {
  value: string;
  label: string;
};

type CompanyOption = {
  value: string;
  label: string;
};

const props = defineProps<{
  data?: {
    title: string;
    initial: UserFormPayload;
    roleOptions: RoleOption[];
    companyOptions: CompanyOption[];
    onSubmit: (payload: UserFormPayload) => void;
  };
}>();

const form = ref<UserFormPayload>({
  username: '',
  companyId: '',
  mobile: '',
  email: '',
  industry: '',
  gid: '',
  role: '',
});

const roleOptions = ref<RoleOption[]>([]);
const companyOptions = ref<CompanyOption[]>([]);

watch(
  () => props.data,
  (value) => {
    form.value = value?.initial
      ? { ...value.initial }
      : {
          username: '',
          companyId: '',
          mobile: '',
          email: '',
          industry: '',
          gid: '',
          role: '',
        };
    roleOptions.value = value?.roleOptions ?? [];
    companyOptions.value = value?.companyOptions ?? [];
  },
  { immediate: true },
);

function submit(closeModal: () => void) {
  if (!form.value.username.trim()) {
    alert('请填写用户名');
    return;
  }
  props.data?.onSubmit({
    username: form.value.username.trim(),
    companyId: form.value.companyId,
    mobile: form.value.mobile.trim(),
    email: form.value.email.trim(),
    industry: form.value.industry.trim(),
    gid: form.value.gid.trim(),
    role: form.value.role,
  });
  closeModal();
}
</script>