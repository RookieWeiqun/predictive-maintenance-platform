<template>
  <IxModal 
    v-model:visible="visible"
    title="手动创建设备"
    :width="600"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <IxLayoutAuto>
      <IxFieldLabel htmlFor="deviceCategoryId">产品大类 <span class="required">*</span></IxFieldLabel>
      <IxSelect 
        id="deviceCategoryId"
        v-model="form.categoryId" 
        placeholder="请选择产品大类"
        @update:model-value="() => { form.subCategoryId = ''; form.model = ''; }"
      >
        <IxSelectItem 
          v-for="item in categoryOptions" 
          :key="item.value" 
          :label="item.label" 
          :value="item.value" 
        />
      </IxSelect>
      
      <IxFieldLabel htmlFor="deviceSubCategoryId">产品子类 <span class="required">*</span></IxFieldLabel>
      <IxSelect 
        id="deviceSubCategoryId"
        v-model="form.subCategoryId" 
        placeholder="请选择产品子类"
        :disabled="!form.categoryId"
        @update:model-value="() => { form.model = ''; }"
      >
        <IxSelectItem 
          v-for="item in subCategoryOptions" 
          :key="item.value" 
          :label="item.label" 
          :value="item.value" 
        />
      </IxSelect>
      
      <IxFieldLabel htmlFor="deviceModel">产品型号 <span class="required">*</span></IxFieldLabel>
      <IxSelect 
        id="deviceModel"
        v-model="form.model" 
        placeholder="请选择产品型号"
        :disabled="!form.subCategoryId"
      >
        <IxSelectItem 
          v-for="item in modelOptions" 
          :key="item.value" 
          :label="item.label" 
          :value="item.value" 
        />
      </IxSelect>
      
      <IxFieldLabel htmlFor="deviceSerialNumber">序列号</IxFieldLabel>
      <IxInput 
        id="deviceSerialNumber"
        v-model="form.serialNumber" 
        placeholder="请输入序列号（可选）" 
      />
      
      <IxFieldLabel htmlFor="deviceQuantity">数量 <span class="required">*</span></IxFieldLabel>
      <IxInput 
        id="deviceQuantity"
        v-model="form.quantity" 
        placeholder="请输入数量" 
      />
    </IxLayoutAuto>
  </IxModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
  IxModal,
  IxSelect,
  IxSelectItem,
} from "@siemens/ix-vue";
import productCategoriesData from '@/mockdata/common/productCategories.json';

interface Props {
  modelValue: boolean;
  editingDevice?: {
    categoryId: string;
    subCategoryId: string;
    model: string;
    serialNumber?: string;
    quantity: number;
  } | null;
}

const props = withDefaults(defineProps<Props>(), {
  editingDevice: null,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'submit': [device: {
    categoryId: string;
    subCategoryId: string;
    model: string;
    serialNumber?: string;
    quantity: number;
  }];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const form = ref({
  categoryId: '',
  subCategoryId: '',
  model: '',
  serialNumber: '',
  quantity: '1',
});

// 先定义 resetForm 函数，因为 watch 中会立即调用它
const resetForm = () => {
  form.value = {
    categoryId: '',
    subCategoryId: '',
    model: '',
    serialNumber: '',
    quantity: '1',
  };
};

watch(() => props.editingDevice, (device) => {
  if (device) {
    form.value = {
      categoryId: device.categoryId,
      subCategoryId: device.subCategoryId,
      model: device.model,
      serialNumber: device.serialNumber || '',
      quantity: device.quantity.toString(),
    };
  } else {
    resetForm();
  }
}, { immediate: true });

const categoryOptions = computed(() => 
  productCategoriesData.categories.map(c => ({ label: c.name, value: c.id }))
);

const subCategoryOptions = computed(() => {
  if (!form.value.categoryId) return [];
  const category = productCategoriesData.categories.find(c => c.id === form.value.categoryId);
  return category?.subCategories.map(sc => ({ label: sc.name, value: sc.id })) || [];
});

const modelOptions = computed(() => {
  if (!form.value.categoryId || !form.value.subCategoryId) return [];
  const category = productCategoriesData.categories.find(c => c.id === form.value.categoryId);
  const subCategory = category?.subCategories.find(sc => sc.id === form.value.subCategoryId);
  return subCategory?.models.map(m => ({ label: m, value: m })) || [];
});

const handleOk = () => {
  if (!form.value.categoryId || !form.value.subCategoryId || !form.value.model) {
    alert('请填写完整的产品信息');
    return;
  }
  
  emit('submit', {
    categoryId: form.value.categoryId,
    subCategoryId: form.value.subCategoryId,
    model: form.value.model,
    serialNumber: form.value.serialNumber || undefined,
    quantity: parseInt(form.value.quantity) || 1,
  });
  
  resetForm();
  visible.value = false;
};

const handleCancel = () => {
  resetForm();
  visible.value = false;
};
</script>

<style scoped>
.required {
  color: var(--theme-color-alarm);
}
</style>
