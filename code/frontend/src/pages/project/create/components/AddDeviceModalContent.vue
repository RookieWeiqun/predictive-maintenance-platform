<template>
  <IxLayoutAuto>
    <IxFieldLabel htmlFor="deviceCategoryId">产品大类 <span class="required">*</span></IxFieldLabel>
    <IxSelect 
      id="deviceCategoryId"
      v-model="form.categoryId" 
      placeholder="请选择产品大类"
      @update:model-value="() => { form.subCategoryId = ''; }"
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
    >
      <IxSelectItem 
        v-for="item in subCategoryOptions" 
        :key="item.value" 
        :label="item.label" 
        :value="item.value" 
      />
    </IxSelect>
    
    <IxFieldLabel htmlFor="deviceModel">产品型号 <span class="required">*</span></IxFieldLabel>
    <IxInput 
      id="deviceModel"
      v-model="form.model" 
      placeholder="请输入产品型号" 
    />
    
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
  IxSelect,
  IxSelectItem,
} from "@siemens/ix-vue";
import productCategoriesData from '@/mockdata/common/productCategories.json';

interface Props {
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
  'submit': [device: {
    categoryId: string;
    subCategoryId: string;
    model: string;
    serialNumber?: string;
    quantity: number;
  }];
}>();

const form = ref({
  categoryId: props.editingDevice?.categoryId || '',
  subCategoryId: props.editingDevice?.subCategoryId || '',
  model: props.editingDevice?.model || '',
  serialNumber: props.editingDevice?.serialNumber || '',
  quantity: props.editingDevice?.quantity?.toString() || '1',
});

const categoryOptions = computed(() => 
  productCategoriesData.categories.map(c => ({ label: c.name, value: c.id }))
);

const subCategoryOptions = computed(() => {
  if (!form.value.categoryId) return [];
  const category = productCategoriesData.categories.find(c => c.id === form.value.categoryId);
  return category?.subCategories.map(sc => ({ label: sc.name, value: sc.id })) || [];
});

const handleSubmit = () => {
  if (!form.value.categoryId || !form.value.subCategoryId || !form.value.model) {
    alert('请填写完整的产品信息');
    return false;
  }
  
  emit('submit', {
    categoryId: form.value.categoryId,
    subCategoryId: form.value.subCategoryId,
    model: form.value.model,
    serialNumber: form.value.serialNumber || undefined,
    quantity: parseInt(form.value.quantity) || 1,
  });
  
  return true;
};

// 暴露方法供父组件调用
defineExpose({
  handleSubmit,
});
</script>

<style scoped>
.required {
  color: var(--theme-color-alarm);
}
</style>
