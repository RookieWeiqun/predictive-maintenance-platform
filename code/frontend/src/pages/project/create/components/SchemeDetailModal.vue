<template>
  <Modal>
    <template #default="{ dismissModal }">
      <IxModalHeader>{{ data?.title ?? '方案详情' }}</IxModalHeader>
      <IxModalContent>
        <div class="scheme-detail-modal">
          <div class="scheme-detail-meta-grid">
            <div class="meta-item">
              <div class="meta-label">方案名称</div>
              <div class="meta-value">{{ detailName }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">方案描述</div>
              <div class="meta-value">{{ detailDescription || '-' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">模板类型</div>
              <div class="meta-value">{{ detailTypeName }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">{{ productCategoryLabel }}</div>
              <div class="meta-value">{{ detailCategoryName }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">{{ productSeriesLabel }}</div>
              <div class="meta-value">{{ detailSeriesName }}</div>
            </div>
            <div v-if="isEquipment" class="meta-item">
              <div class="meta-label">适用型号</div>
              <div class="meta-value">{{ detailModel }}</div>
            </div>
          </div>

          <div v-if="tableRows.length > 0" class="scheme-detail-table-wrap">
            <table class="scheme-detail-table">
              <thead>
                <tr>
                  <th>检测项目</th>
                  <th>数据类型</th>
                  <th>权重</th>
                  <th>单位</th>
                  <th>标准值</th>
                  <th>操作指导</th>
                  <th>规则类型</th>
                  <th>参数1</th>
                  <th>参数2</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in tableRows" :key="idx">
                  <td :style="{ paddingLeft: `${8 + row.level * 18}px` }">{{ row.name }}</td>
                  <td>{{ row.dataType || '-' }}</td>
                  <td>{{ row.priority || '-' }}</td>
                  <td>{{ row.unit || '-' }}</td>
                  <td>{{ row.standardValue || '-' }}</td>
                  <td>{{ row.operationGuide || '-' }}</td>
                  <td>{{ row.ruleType || '-' }}</td>
                  <td>{{ row.param1 || '-' }}</td>
                  <td>{{ row.param2 || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="data?.schemeTreeModel" class="scheme-detail-tree">
            <IxTree root="root" :model="data.schemeTreeModel" :context="displayContext" />
          </div>
          <p v-else class="scheme-detail-loading">方案数据加载中...</p>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">关闭</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script lang="ts">
export const SCHEME_DETAIL_MODAL_SIZE: '840' = '840';
</script>

<script setup lang="ts">
import { computed } from 'vue';
import type { TreeContext, TreeModel } from '@siemens/ix';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import { templateDtoToFormAndAtomic } from '@/pages/scheme/utils/schemeInspectionTemplate';
import type { InspectionTemplateDto } from '@/api/modules/inspectionTemplates';
import type { SchemeItem } from '@/pages/scheme/utils/schemeUtils';
import {
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  IxButton,
  IxTree,
} from '@siemens/ix-vue';

const props = defineProps<{
  data?: {
    title: string;
    scheme?: { id: string; name: string; model: string; schemeKind: 'equipment' | 'peripheral' } | null;
    templateDto?: InspectionTemplateDto;
    schemeItems?: SchemeItem[];
    schemeTreeModel?: TreeModel<any>;
    schemeTreeContext?: TreeContext;
  };
}>();

const parsed = computed(() => {
  if (!props.data?.templateDto) return null;
  try {
    return templateDtoToFormAndAtomic(props.data.templateDto);
  } catch {
    return null;
  }
});

const atomicType = computed<'equipment' | 'peripheral'>(() => {
  if (parsed.value?.schemeForm.atomicType === 'peripheral') return 'peripheral';
  if (parsed.value?.schemeForm.atomicType === 'equipment') return 'equipment';
  return props.data?.scheme?.schemeKind === 'peripheral' ? 'peripheral' : 'equipment';
});

const isEquipment = computed(() => atomicType.value === 'equipment');

const productCategoryLabel = computed(() =>
  atomicType.value === 'peripheral' ? '产品类别' : '产品分类',
);
const productSeriesLabel = computed(() =>
  atomicType.value === 'peripheral' ? '产品系列' : '子分类',
);

const detailName = computed(
  () =>
    parsed.value?.schemeForm.name?.trim() ||
    props.data?.scheme?.name ||
    '-',
);
const detailDescription = computed(
  () => parsed.value?.schemeForm.description?.trim() || '',
);
const detailTypeName = computed(() =>
  atomicType.value === 'peripheral' ? '系统外围检测方案' : '设备检测方案',
);
const detailModel = computed(
  () => parsed.value?.schemeForm.model?.trim() || props.data?.scheme?.model || '-',
);

function resolveCategoryName(categoryId: string): string {
  if (!categoryId) return '-';
  const c = productCategoriesData.categories.find((x) => x.id === categoryId);
  return c?.name || '-';
}

function resolveSeriesName(categoryId: string, subCategoryId: string): string {
  if (!subCategoryId) return '-';
  for (const c of productCategoriesData.categories) {
    const s = c.subCategories.find((x) => x.id === subCategoryId);
    if (s) return s.name;
  }
  return '-';
}

const detailCategoryName = computed(() =>
  resolveCategoryName(parsed.value?.schemeForm.categoryId || ''),
);
const detailSeriesName = computed(() =>
  resolveSeriesName(
    parsed.value?.schemeForm.categoryId || '',
    parsed.value?.schemeForm.subCategoryId || '',
  ),
);

const tableRows = computed(() => {
  const rows: Array<{
    level: number;
    name: string;
    dataType?: string;
    priority?: string;
    unit?: string;
    standardValue?: string | number;
    operationGuide?: string;
    ruleType?: string;
    param1?: string;
    param2?: string;
  }> = [];

  const walk = (items: SchemeItem[], level: number) => {
    items.forEach((it) => {
      rows.push({
        level,
        name: it.name || '未命名',
        dataType: it.dataType || '',
        priority: it.priority || '',
        unit: it.unit || '',
        standardValue:
          it.standardValue != null
            ? String(it.standardValue)
            : it.expectedResult != null
              ? String(it.expectedResult)
              : '',
        operationGuide: it.operationGuide || it.testProcedure || '',
        ruleType: it.ruleType || '',
        param1: it.param1 || '',
        param2: it.param2 || '',
      });
      if (Array.isArray(it.children) && it.children.length > 0) {
        walk(it.children, level + 1);
      }
    });
  };
  walk((props.data?.schemeItems ?? []) as SchemeItem[], 0);
  return rows;
});

const displayContext = computed<TreeContext>(() => {
  const m = props.data?.schemeTreeModel;
  if (!m) return {};
  const base = props.data?.schemeTreeContext ?? {};
  const ctx: TreeContext = { ...base };
  const walk = (nodeId: string) => {
    const node = m[nodeId];
    if (!node || !node.hasChildren) return;
    ctx[nodeId] = { isExpanded: true, isSelected: false };
    (node.children ?? []).forEach((cid) => walk(cid));
  };
  walk('root');
  return ctx;
});
</script>

<style scoped>
.scheme-detail-modal {
  max-height: 65vh;
  overflow: auto;
}

.scheme-detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.meta-item {
  min-width: 0;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  margin-bottom: 0.2rem;
}

.meta-value {
  font-size: 0.875rem;
  color: var(--theme-color-text);
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scheme-detail-table-wrap {
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.375rem;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 52vh;
  scrollbar-gutter: stable both-edges;
  display: block;
}

.scheme-detail-table {
  width: max-content;
  min-width: 1360px;
  border-collapse: collapse;
  table-layout: auto;
}

.scheme-detail-table th,
.scheme-detail-table td {
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding: 0.45rem 0.5rem;
  font-size: 0.8125rem;
  vertical-align: middle;
  white-space: nowrap;
}

.scheme-detail-table th:first-child,
.scheme-detail-table td:first-child {
  min-width: 360px;
  white-space: normal;
  word-break: break-word;
}

.scheme-detail-table th {
  text-align: left;
  background: var(--theme-color-soft);
  font-weight: 600;
}

.scheme-detail-table tbody tr:last-child td {
  border-bottom: none;
}

.scheme-detail-tree {
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.375rem;
  padding: 0.75rem;
  background: var(--theme-color-background);
  max-height: 52vh;
  overflow: auto;
}

.scheme-detail-loading {
  margin: 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}
</style>
