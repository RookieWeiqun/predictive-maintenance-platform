<template>
  <Modal>
    <template #default="{ closeModal, dismissModal }">
      <IxModalHeader>型号尺寸匹配表</IxModalHeader>
      <IxModalContent>
        <div class="mapping-toolbar">
          <IxInput v-model="searchKeyword" placeholder="按产品型号搜索" />
          <IxButton variant="secondary" @click="handleSearch">搜索</IxButton>
          <IxButton variant="secondary" @click="handleReset">重置</IxButton>
          <!-- <IxButton variant="primary" @click="startCreate">新增</IxButton> -->
        </div>

        <div class="mapping-form">
          <IxInput v-model="form.mlfb" label="产品型号" placeholder="请输入产品型号" />
          <IxInput v-model="form.series" label="系列" placeholder="请输入系列" />
          <IxInput v-model="form.size" label="尺寸" placeholder="请输入尺寸" />
          <div class="mapping-form__actions">
            <IxButton variant="primary" @click="handleSubmit">{{ form.tmid ? '保存修改' : '新增记录' }}</IxButton>
            <IxButton variant="secondary" @click="resetForm">取消编辑</IxButton>
          </div>
        </div>

        <div class="mapping-table-wrap">
          <table class="mapping-table">
            <thead>
              <tr>
                <th>产品型号</th>
                <th>系列</th>
                <th>尺寸</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="4" class="mapping-empty">加载中...</td>
              </tr>
              <tr v-else-if="rows.length === 0">
                <td colspan="4" class="mapping-empty">暂无匹配记录</td>
              </tr>
              <tr v-for="row in rows" :key="row.tmid ?? `${row.mlfb}-${row.series}-${row.size}`">
                <td>{{ row.mlfb || '-' }}</td>
                <td>{{ row.series || '-' }}</td>
                <td>{{ row.size || '-' }}</td>
                <td>
                  <div class="mapping-actions">
                    <button type="button" class="mapping-action-btn" @click="startEdit(row)">编辑</button>
                    <button type="button" class="mapping-action-btn mapping-action-btn--danger" @click="handleDelete(row)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">关闭</IxButton>
        <IxButton variant="primary" @click="closeModal">完成</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  IxButton,
  IxInput,
  showToast,
} from '@siemens/ix-vue';
import { templatemappingsApi } from '@/api';
import type { TemplateMappingDto } from '@/api/modules/templatemappings';

const props = defineProps<{
  data?: {
    onChanged?: () => Promise<void> | void;
  };
}>();

const loading = ref(false);
const searchKeyword = ref('');
const rows = ref<TemplateMappingDto[]>([]);
const form = ref<TemplateMappingDto>({
  tmid: undefined,
  mlfb: '',
  series: '',
  size: '',
});

function resetForm(): void {
  form.value = {
    tmid: undefined,
    mlfb: '',
    series: '',
    size: '',
  };
}

function startCreate(): void {
  resetForm();
}

function startEdit(row: TemplateMappingDto): void {
  form.value = {
    tmid: row.tmid,
    mlfb: row.mlfb ?? '',
    series: row.series ?? '',
    size: row.size ?? '',
  };
}

async function loadRows(): Promise<void> {
  loading.value = true;
  try {
    rows.value = searchKeyword.value.trim()
      ? await templatemappingsApi.searchTemplateMappingsByMlfb(searchKeyword.value.trim())
      : await templatemappingsApi.listTemplateMappings();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '匹配表加载失败' });
  } finally {
    loading.value = false;
  }
}

async function notifyChanged(): Promise<void> {
  await props.data?.onChanged?.();
}

async function handleSearch(): Promise<void> {
  await loadRows();
}

async function handleReset(): Promise<void> {
  searchKeyword.value = '';
  await loadRows();
}

async function handleSubmit(): Promise<void> {
  const payload = {
    tmid: form.value.tmid,
    mlfb: String(form.value.mlfb ?? '').trim(),
    series: String(form.value.series ?? '').trim(),
    size: String(form.value.size ?? '').trim(),
  };

  if (!payload.mlfb || !payload.series || !payload.size) {
    showToast({ message: '请完整填写产品型号、系列和尺寸' });
    return;
  }

  try {
    if (payload.tmid != null && payload.tmid > 0) {
      await templatemappingsApi.updateTemplateMapping(payload);
      showToast({ message: '保存成功' });
    } else {
      await templatemappingsApi.createTemplateMapping(payload);
      showToast({ message: '新增成功' });
    }
    resetForm();
    await loadRows();
    await notifyChanged();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '保存失败' });
  }
}

async function handleDelete(row: TemplateMappingDto): Promise<void> {
  if (row.tmid == null || row.tmid <= 0) {
    showToast({ message: '当前记录缺少主键，无法删除' });
    return;
  }
  if (!confirm(`确定删除型号 ${row.mlfb || '-'} 的匹配记录吗？`)) {
    return;
  }
  try {
    await templatemappingsApi.deleteTemplateMapping(row.tmid);
    showToast({ message: '删除成功' });
    if (form.value.tmid === row.tmid) {
      resetForm();
    }
    await loadRows();
    await notifyChanged();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '删除失败' });
  }
}

onMounted(() => {
  void loadRows();
});
</script>

<style scoped>
.mapping-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.mapping-toolbar :deep(ix-input) {
  flex: 1;
  min-width: 240px;
}

.mapping-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.mapping-form__actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.75rem;
}

.mapping-table-wrap {
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--theme-color-soft-border);
}

.mapping-table {
  width: 100%;
  border-collapse: collapse;
}

.mapping-table th,
.mapping-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
  text-align: left;
  font-size: 0.875rem;
}

.mapping-table th {
  position: sticky;
  top: 0;
  background: var(--theme-color-base-2);
  z-index: 1;
}

.mapping-empty {
  text-align: center;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
}

.mapping-actions {
  display: flex;
  gap: 0.5rem;
}

.mapping-action-btn {
  border: 1px solid var(--theme-color-soft-border);
  background: transparent;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  border-radius: 0.25rem;
}

.mapping-action-btn--danger {
  color: var(--theme-color-alarm);
}

@media (max-width: 960px) {
  .mapping-form {
    grid-template-columns: 1fr;
  }
}
</style>