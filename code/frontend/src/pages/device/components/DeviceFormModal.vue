<!-- 设备新增/编辑 — showModal + Modal 与 CustomerFormModal 一致 -->
<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>{{ data?.title ?? '设备' }}</IxModalHeader>
      <IxModalContent>
        <IxLayoutAuto>
          <IxFieldLabel htmlFor="deviceCustomer">客户 <span class="required">*</span></IxFieldLabel>
          <IxSelect
            id="deviceCustomer"
            v-model="form.customerId"
            placeholder="请选择客户"
            style="width: 100%"
          >
            <IxSelectItem
              v-for="c in data?.customers ?? []"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </IxSelect>

          <IxFieldLabel htmlFor="deviceFactory">工厂 <span class="required">*</span></IxFieldLabel>
          <IxInput id="deviceFactory" v-model="form.factoryName" placeholder="工厂名称" />

          <IxFieldLabel htmlFor="deviceWorkshop">车间 <span class="required">*</span></IxFieldLabel>
          <IxInput id="deviceWorkshop" v-model="form.workshopName" placeholder="车间名称" />

          <IxFieldLabel htmlFor="deviceElectricRoom">电气室 <span class="required">*</span></IxFieldLabel>
          <IxInput
            id="deviceElectricRoom"
            v-model="form.electricRoom"
            placeholder="电气室名称"
          />

          <IxFieldLabel htmlFor="deviceCategory">产品大类 <span class="required">*</span></IxFieldLabel>
          <IxSelect
            id="deviceCategory"
            v-model="form.categoryId"
            placeholder="请选择大类"
            style="width: 100%"
          >
            <IxSelectItem
              v-for="cat in categoryOptions"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </IxSelect>

          <IxFieldLabel htmlFor="deviceSubCategory">产品子类 <span class="required">*</span></IxFieldLabel>
          <IxSelect
            id="deviceSubCategory"
            v-model="form.subCategoryId"
            placeholder="请选择子类"
            style="width: 100%"
          >
            <IxSelectItem
              v-for="sub in subCategoryOptions"
              :key="sub.id"
              :label="sub.name"
              :value="sub.id"
            />
          </IxSelect>

          <IxFieldLabel htmlFor="deviceModel">产品型号 <span class="required">*</span></IxFieldLabel>
          <input
            id="deviceModel"
            v-model="form.model"
            class="native-model-input"
            list="device-model-options"
            placeholder="请选择产品型号"
          />
          <datalist id="device-model-options">
            <option v-for="option in modelOptions" :key="option" :value="option" />
          </datalist>

          <IxFieldLabel htmlFor="deviceQty">数量 <span class="required">*</span></IxFieldLabel>
          <IxInput
            id="deviceQty"
            v-model.number="form.quantity"
            type="number"
            min="1"
            placeholder="正整数"
          />

          <!-- <IxFieldLabel htmlFor="deviceSerials">序列号</IxFieldLabel>
          <IxInput
            id="deviceSerials"
            v-model="form.serialNumbersText"
            placeholder="可选，逗号或换行分隔；留空则按数量自动生成占位序列号"
          /> -->
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
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import {
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  IxButton,
  IxFieldLabel,
  IxInput,
  IxLayoutAuto,
  IxSelect,
  IxSelectItem,
} from '@siemens/ix-vue';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import { templatemappingsApi } from '@/api';
import { dedupeTemplateMappingField } from '@/util/templateMappings';

export type DeviceFormPayload = {
  customerId: string;
  factoryName: string;
  workshopName: string;
  electricRoom: string;
  categoryId: string;
  subCategoryId: string;
  model: string;
  quantity: number;
  serialNumbers: string[];
};

type CategoryJson = (typeof productCategoriesData.categories)[number];

const props = defineProps<{
  data?: {
    title: string;
    customers: { id: string; name: string }[];
    initial: {
      customerId: string;
      factoryName: string;
      workshopName: string;
      electricRoom: string;
      categoryId: string;
      subCategoryId: string;
      model: string;
      quantity: number;
      serialNumbersText: string;
    };
    onSubmit: (payload: DeviceFormPayload) => void;
  };
}>();

const categoryOptions = productCategoriesData.categories as CategoryJson[];

const form = ref({
  customerId: '',
  factoryName: '',
  workshopName: '',
  electricRoom: '',
  categoryId: '',
  subCategoryId: '',
  model: '',
  quantity: 1,
  serialNumbersText: '',
});

const modelOptions = ref<string[]>([]);

const selectedCategory = computed(() =>
  categoryOptions.find((c) => c.id === form.value.categoryId),
);

const subCategoryOptions = computed(() => selectedCategory.value?.subCategories ?? []);

function emptyForm() {
  return {
    customerId: '',
    factoryName: '',
    workshopName: '',
    electricRoom: '',
    categoryId: '',
    subCategoryId: '',
    model: '',
    quantity: 1,
    serialNumbersText: '',
  };
}

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
  () => props.data?.initial,
  async (initial) => {
    skipCategoryCascade.value = true;
    if (initial) {
      form.value = { ...initial };
    } else {
      form.value = emptyForm();
    }
    await nextTick();
    skipCategoryCascade.value = false;
    await loadModelOptions(form.value.model || '');
  },
  { immediate: true },
);

watch(
  () => form.value.model,
  (model) => {
    void loadModelOptions(model || '');
  },
);

onMounted(() => {
  void loadModelOptions();
});

watch(
  () => form.value.categoryId,
  () => {
    if (skipCategoryCascade.value) return;
    const subs = subCategoryOptions.value;
    if (!subs.length) {
      form.value.subCategoryId = '';
      return;
    }
    if (!subs.some((s) => s.id === form.value.subCategoryId)) {
      form.value.subCategoryId = subs[0].id;
    }
  },
);

function parseSerials(text: string): string[] {
  return text
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildAutoSerials(qty: number, seed: string): string[] {
  const pad = String(qty).length;
  const out: string[] = [];
  for (let i = 1; i <= qty; i += 1) {
    out.push(`AUTO-${seed}-${String(i).padStart(Math.max(pad, 3), '0')}`);
  }
  return out;
}

function submit(closeModal: () => void) {
  const customerId = form.value.customerId.trim();
  const factoryName = form.value.factoryName.trim();
  const workshopName = form.value.workshopName.trim();
  const electricRoom = form.value.electricRoom.trim();
  const categoryId = form.value.categoryId.trim();
  const subCategoryId = form.value.subCategoryId.trim();
  const model = form.value.model.trim();
  const qty = Number(form.value.quantity);

  if (!customerId) {
    alert('请选择客户');
    return;
  }
  if (!factoryName || !workshopName || !electricRoom) {
    alert('请填写工厂、车间与电气室');
    return;
  }
  if (!categoryId || !subCategoryId) {
    alert('请选择产品大类与子类');
    return;
  }
  if (!model) {
    alert('请填写产品型号');
    return;
  }
  if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
    alert('数量需为正整数');
    return;
  }

  let serialNumbers = parseSerials(form.value.serialNumbersText);
  if (serialNumbers.length === 0) {
    serialNumbers = buildAutoSerials(qty, `${Date.now().toString(36)}`);
  } else if (serialNumbers.length !== qty) {
    alert(`序列号条数（${serialNumbers.length}）与数量（${qty}）不一致，请检查或留空以自动生成`);
    return;
  }

  props.data?.onSubmit({
    customerId,
    factoryName,
    workshopName,
    electricRoom,
    categoryId,
    subCategoryId,
    model,
    quantity: qty,
    serialNumbers,
  });
  closeModal();
}
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
