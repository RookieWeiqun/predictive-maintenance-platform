<template>
  <div class="step-content">
    <h2 class="step-title">基本信息</h2>
    <IxLayoutAuto>
      <IxFieldLabel htmlFor="projectName">项目名称 <span class="required">*</span></IxFieldLabel>
      <IxInput 
        id="projectName"
        :model-value="formData.projectName"
        @update:model-value="(value: string) => $emit('update:projectName', value)"
        placeholder="请输入项目名称" 
      />

      <IxFieldLabel htmlFor="serviceId">服务号</IxFieldLabel>
      <IxInput
        id="serviceId"
        :model-value="formData.serviceId"
        @update:model-value="(value: string) => $emit('update:serviceId', value)"
        placeholder="请输入服务号"
      />
      
      <IxFieldLabel htmlFor="customerId">客户名称 <span class="required">*</span></IxFieldLabel>
      <IxSelect 
        id="customerId"
        :model-value="formData.customerId"
        @update:model-value="onCustomerChange"
        placeholder="请选择客户"
      >
        <IxSelectItem 
          v-for="item in customerOptions" 
          :key="item.value" 
          :label="item.label" 
          :value="item.value" 
        />
      </IxSelect>
      
      <IxFieldLabel htmlFor="factory">工厂信息 <span class="required">*</span></IxFieldLabel>
      <IxSelect
        v-if="factorySelectMode"
        id="factory"
        :model-value="formData.factory"
        @update:model-value="(value: string) => $emit('update:factory', value)"
        placeholder="请选择工厂（来自该客户下设备档案）"
      >
        <IxSelectItem
          v-for="name in factoryOptions"
          :key="name"
          :label="name"
          :value="name"
        />
      </IxSelect>
      <IxInput 
        v-else
        id="factory"
        :model-value="formData.factory"
        @update:model-value="(value:string) => $emit('update:factory', value)"
        :placeholder="factoryInputPlaceholder"
      />
      
      <IxFieldLabel htmlFor="projectManagerId">西门子联系人</IxFieldLabel>
      <IxSelect 
        id="projectManagerId"
        :model-value="formData.projectManagerId"
        @update:model-value="(value: string) => $emit('update:projectManagerId', value)"
        placeholder="请选择西门子联系人"
      >
        <IxSelectItem 
          v-for="item in projectManagerOptions" 
          :key="item.value" 
          :label="item.label" 
          :value="item.value" 
        />
      </IxSelect>

      <IxFieldLabel htmlFor="chiefEngineerId">服务执行人</IxFieldLabel>
      <IxSelect
        id="chiefEngineerId"
        :model-value="formData.chiefEngineerId"
        @update:model-value="(value: string) => $emit('update:chiefEngineerId', value)"
        placeholder="请选择服务执行人"
      >
        <IxSelectItem
          v-for="item in serviceExecutorOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </IxSelect>
      
      <IxFieldLabel htmlFor="city">城市</IxFieldLabel>
      <IxInput
        id="city"
        :model-value="formData.city"
        @update:model-value="(value: string) => $emit('update:city', value)"
        placeholder="请输入城市"
      />

      <IxFieldLabel htmlFor="customerContact">客户联系人</IxFieldLabel>
      <IxInput
        id="customerContact"
        :model-value="formData.customerContact"
        @update:model-value="(value: string) => $emit('update:customerContact', value)"
        placeholder="请输入客户联系人"
      />
    </IxLayoutAuto>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
  IxSelect,
  IxSelectItem,
  showToast,
} from '@siemens/ix-vue';
import { equipmentsApi } from '@/api';

interface Props {
  formData: {
    projectName: string;
    serviceId: string;
    customerId: string;
    factory: string;
    city: string;
    customerContact: string;
    projectManagerId: string;
    chiefEngineerId: string;
  };
  customerOptions: { label: string; value: string }[];
  userOptions: { label: string; value: string }[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:projectName': [value: string];
  'update:serviceId': [value: string];
  'update:customerId': [value: string];
  'update:factory': [value: string];
  'update:city': [value: string];
  'update:customerContact': [value: string];
  'update:projectManagerId': [value: string];
  'update:chiefEngineerId': [value: string];
}>();

const factoryOptions = ref<string[]>([]);

const factorySelectMode = computed(
  () => !!props.formData.customerId && factoryOptions.value.length > 0,
);

const factoryInputPlaceholder = computed(() => {
  if (!props.formData.customerId) return '请先选择客户';
  if (factoryOptions.value.length === 0) return '该客户下暂无设备工厂档案，请手动填写';
  return '请输入工厂信息';
});

function onCustomerChange(value: string) {
  emit('update:customerId', value);
}

watch(
  () => props.formData.customerId,
  async (id, prev) => {
    factoryOptions.value = [];
    if (id !== prev) {
      emit('update:factory', '');
    }
    if (!id) return;
    const companyid = Number.parseInt(id, 10);
    if (Number.isNaN(companyid)) return;
    try {
      const list = await equipmentsApi.listEquipmentsByCompany(companyid);
      const names = new Set<string>();
      for (const e of list) {
        const f = e.factory?.trim();
        if (f) names.add(f);
      }
      factoryOptions.value = [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
      if (
        props.formData.factory &&
        !factoryOptions.value.includes(props.formData.factory)
      ) {
        emit('update:factory', '');
      }
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : '工厂列表加载失败' });
    }
  },
  { immediate: true },
);

const projectManagerOptions = computed(() => props.userOptions ?? []);
const serviceExecutorOptions = computed(() => props.userOptions ?? []);

</script>

<style scoped>
.step-content {
  min-height: 400px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--theme-color-text);
}

.required {
  color: var(--theme-color-alarm);
}
</style>
