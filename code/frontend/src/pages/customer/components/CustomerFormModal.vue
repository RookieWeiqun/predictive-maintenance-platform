<!-- 客户新增/编辑 — 使用官方 Modal + showModal({ content }) 模式 -->
<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>{{ data?.title ?? '客户' }}</IxModalHeader>
      <IxModalContent>
        <IxLayoutAuto>
          <IxFieldLabel htmlFor="customerName">客户名称 <span class="required">*</span></IxFieldLabel>
          <div class="customer-name-field">
            <input
              id="customerName"
              v-model="form.name"
              class="native-customer-input"
              autocomplete="off"
              placeholder="输入客户名称后自动查询"
              @focus="lookupOpen = true"
              @blur="handleNameBlur"
            />
            <div v-if="showLookupPanel" class="customer-name-lookup">
              <div v-if="lookupLoading" class="lookup-state">正在查询客户名称...</div>
              <div v-else-if="lookupError" class="lookup-state lookup-state--error">{{ lookupError }}</div>
              <div
                v-else-if="lookupSuggestions.length === 0 && form.name.trim().length >= 2"
                class="lookup-state"
              >
                未查到匹配客户，可继续手动填写。
              </div>
              <button
                v-for="item in lookupSuggestions"
                :key="`${item.name}-${item.creditCode}`"
                type="button"
                class="lookup-option"
                @mousedown.prevent="applyLookupSuggestion(item)"
              >
                <span class="lookup-option__name">{{ item.name }}</span>
                <span class="lookup-option__meta">
                  {{ item.creditCode || '统一社会信用代码缺失' }}
                  <template v-if="item.operName"> | 法人：{{ item.operName }}</template>
                </span>
              </button>
            </div>
          </div>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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
import { companiesApi } from '@/api';
import type { CompanyInfoSuggestion } from '@/api/modules/companies';

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
const lookupSuggestions = ref<CompanyInfoSuggestion[]>([]);
const lookupLoading = ref(false);
const lookupError = ref('');
const lookupOpen = ref(false);
let lookupTimer: ReturnType<typeof setTimeout> | null = null;
let lookupRequestToken = 0;

const showLookupPanel = computed(
  () =>
    lookupOpen.value &&
    form.value.name.trim().length >= 2 &&
    (lookupLoading.value || Boolean(lookupError.value) || lookupSuggestions.value.length >= 0),
);

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

watch(
  () => form.value.name,
  (value) => {
    lookupRequestToken += 1;
    const currentToken = lookupRequestToken;
    const keyword = value.trim();
    if (lookupTimer) {
      clearTimeout(lookupTimer);
      lookupTimer = null;
    }
    lookupError.value = '';
    if (keyword.length < 2) {
      lookupLoading.value = false;
      lookupSuggestions.value = [];
      return;
    }
    lookupLoading.value = true;
    lookupTimer = setTimeout(async () => {
      try {
        const results = await companiesApi.searchCompanyInfo(keyword);
        if (currentToken !== lookupRequestToken) return;
        lookupSuggestions.value = results;
      } catch (error) {
        if (currentToken !== lookupRequestToken) return;
        lookupSuggestions.value = [];
        lookupError.value = error instanceof Error ? error.message : '客户名称查询失败';
      } finally {
        if (currentToken === lookupRequestToken) {
          lookupLoading.value = false;
        }
      }
    }, 250);
  },
);

onBeforeUnmount(() => {
  if (lookupTimer) {
    clearTimeout(lookupTimer);
    lookupTimer = null;
  }
});

function handleNameBlur() {
  window.setTimeout(() => {
    lookupOpen.value = false;
  }, 120);
}

function applyLookupSuggestion(item: CompanyInfoSuggestion) {
  form.value.name = item.name;
  if (item.creditCode) {
    form.value.industry = item.creditCode;
  }
  lookupSuggestions.value = [];
  lookupError.value = '';
  lookupOpen.value = false;
}

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

.customer-name-field {
  position: relative;
}

.native-customer-input {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  padding: 0.625rem 0.75rem;
  font: inherit;
  color: var(--theme-color-text);
  background: var(--theme-color-base-1, #fff);
}

.native-customer-input:focus {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 1px;
}

.customer-name-lookup {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.375rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.375rem;
  background: var(--theme-color-base-1, #fff);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.lookup-state {
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
}

.lookup-state--error {
  color: var(--theme-color-alarm);
}

.lookup-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 0;
  border-radius: 0.25rem;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.lookup-option:hover {
  background: var(--theme-color-soft-hover);
}

.lookup-option__name {
  font-weight: 600;
}

.lookup-option__meta {
  font-size: 0.75rem;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
}
</style>
