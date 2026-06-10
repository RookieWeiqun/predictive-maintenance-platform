<template>
  <IxLayoutAuto>
    <IxFieldLabel htmlFor="deviceCustomer">客户 <span class="required">*</span></IxFieldLabel>
    <IxInput
      id="deviceCustomer"
      :model-value="customerDisplayName"
      placeholder="请先在基本信息中选择客户"
      readonly
    />

    <IxFieldLabel htmlFor="deviceFactory">工厂 <span class="required">*</span></IxFieldLabel>
    <IxInput
      id="deviceFactory"
      v-model="form.factoryName"
      placeholder="请先在基本信息中选择工厂"
      :readonly="factoryLocked"
    />

    <IxFieldLabel htmlFor="deviceWorkshop">车间 <span class="required">*</span></IxFieldLabel>
    <IxInput
      id="deviceWorkshop"
      v-model="form.workshopName"
      placeholder="请输入车间名称"
    />

    <IxFieldLabel htmlFor="deviceElectricRoom">电气室 <span class="required">*</span></IxFieldLabel>
    <IxInput
      id="deviceElectricRoom"
      v-model="form.electricRoom"
      placeholder="请输入电气室名称"
    />

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
    <input
      id="deviceModel"
      v-model="form.model"
      class="native-model-input"
      list="project-device-model-options"
      placeholder="请选择产品型号"
    />
    <datalist id="project-device-model-options">
      <option v-for="option in modelOptions" :key="option" :value="option" />
    </datalist>
    
    <IxFieldLabel htmlFor="deviceQuantity">数量 <span class="required">*</span></IxFieldLabel>
    <IxInput 
      id="deviceQuantity"
      v-model="form.quantity" 
      placeholder="请输入数量" 
    />
  </IxLayoutAuto>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import {
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
  IxSelect,
  IxSelectItem,
} from "@siemens/ix-vue";
import productCategoriesData from '@/mockdata/common/productCategories.json';
import { templatemappingsApi } from '@/api';
import { dedupeTemplateMappingField } from '@/util/templateMappings';

interface Props {
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
}

const props = withDefaults(defineProps<Props>(), {
  editingDevice: null,
});

const emit = defineEmits<{
  'submit': [device: {
    customerId: string;
    factoryName: string;
    workshopName: string;
    electricRoom: string;
    categoryId: string;
    subCategoryId: string;
    model: string;
    quantity: number;
  }];
}>();

const form = ref({
  customerId: props.editingDevice?.customerId || props.customerId || '',
  factoryName: props.editingDevice?.factoryName || props.factory || '',
  workshopName: props.editingDevice?.workshopName || '',
  electricRoom: props.editingDevice?.electricRoom || '',
  categoryId: props.editingDevice?.categoryId || '',
  subCategoryId: props.editingDevice?.subCategoryId || '',
  model: props.editingDevice?.model || '',
  quantity: props.editingDevice?.quantity?.toString() || '1',
});

const customerDisplayName = computed({
  get: () => props.customerName || form.value.customerId || props.customerId || '',
  set: () => undefined,
});
const factoryLocked = computed(() => !!(props.factory ?? '').trim());

const categoryOptions = computed(() => 
  productCategoriesData.categories.map(c => ({ label: c.name, value: c.id }))
);

const selectedCategory = computed(() =>
  productCategoriesData.categories.find(c => c.id === form.value.categoryId),
);

const subCategoryOptions = computed(() => {
  if (!form.value.categoryId) return [];
  return selectedCategory.value?.subCategories.map(sc => ({ label: sc.name, value: sc.id })) || [];
});

const modelOptions = ref<string[]>([]);

async function loadModelOptions(keyword = ''): Promise<void> {
  try {
    const mappings = keyword.trim()
      ? await templatemappingsApi.searchTemplateMappingsByMlfb(keyword.trim())
      : await templatemappingsApi.listTemplateMappings();
    const options = dedupeTemplateMappingField(mappings, 'mlfb');
    if (form.value.model && !options.includes(form.value.model)) {
      options.unshift(form.value.model);
    }
    modelOptions.value = options;
  } catch {
    modelOptions.value = form.value.model ? [form.value.model] : [];
  }
}

const skipCategoryCascade = ref(true);

watch(
  () => form.value.model,
  (model) => {
    void loadModelOptions(model || '');
  },
);

watch(
  () => form.value.categoryId,
  () => {
    if (skipCategoryCascade.value) return;
    const subs = subCategoryOptions.value;
    if (!subs.length) {
      form.value.subCategoryId = '';
      return;
    }
    if (!subs.some((s) => s.value === form.value.subCategoryId)) {
      form.value.subCategoryId = subs[0].value;
    }
  },
);

watch(
  () => form.value.subCategoryId,
  () => {
    if (!skipCategoryCascade.value) {
      form.value.model = '';
    }
  },
);

watch(
  () => [props.customerId, props.customerName, props.factory, props.editingDevice] as const,
  async () => {
    skipCategoryCascade.value = true;
    form.value = {
      customerId: props.editingDevice?.customerId || props.customerId || '',
      factoryName: props.editingDevice?.factoryName || props.factory || '',
      workshopName: props.editingDevice?.workshopName || '',
      electricRoom: props.editingDevice?.electricRoom || '',
      categoryId: props.editingDevice?.categoryId || '',
      subCategoryId: props.editingDevice?.subCategoryId || '',
      model: props.editingDevice?.model || '',
      quantity: props.editingDevice?.quantity?.toString() || '1',
    };
    await nextTick();
    skipCategoryCascade.value = false;
    await loadModelOptions(form.value.model || '');
  },
  { immediate: true },
);

onMounted(() => {
  void loadModelOptions();
});

const handleSubmit = () => {
  if (!form.value.customerId.trim()) {
    alert('请先在基本信息中选择客户');
    return false;
  }
  if (!form.value.factoryName.trim() || !form.value.workshopName.trim() || !form.value.electricRoom.trim()) {
    alert('请填写工厂、车间与电气室');
    return false;
  }
  if (!form.value.categoryId || !form.value.subCategoryId || !form.value.model) {
    alert('请填写完整的产品信息');
    return false;
  }
  
  emit('submit', {
    customerId: form.value.customerId.trim(),
    factoryName: form.value.factoryName.trim(),
    workshopName: form.value.workshopName.trim(),
    electricRoom: form.value.electricRoom.trim(),
    categoryId: form.value.categoryId,
    subCategoryId: form.value.subCategoryId,
    model: form.value.model,
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

.native-model-input {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  padding: 0.625rem 0.75rem;
  font: inherit;
  color: var(--theme-color-text);
  background: var(--theme-color-base-1, #fff);
}

.native-model-input:focus {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 1px;
}
</style>
