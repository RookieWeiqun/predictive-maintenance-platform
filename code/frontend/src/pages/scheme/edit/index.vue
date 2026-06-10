<!-- 方案编辑页面 -->
<template>
  <div class="scheme-edit-page">
    <div v-if="syncProgress.visible" class="sync-progress-mask">
      <div class="sync-progress-card">
        <div class="sync-progress-title">正在保存检测项</div>
        <div class="sync-progress-message">{{ syncProgress.message }}</div>
        <div class="sync-progress-track">
          <div class="sync-progress-fill" :style="{ width: `${syncProgress.percent}%` }"></div>
        </div>
        <div class="sync-progress-percent">{{ syncProgress.percent }}%</div>
      </div>
    </div>
    <IxContentHeader :header-title="pageTitle">
      <IxButton variant="secondary" @click="handleCancel">取消</IxButton>
      <IxButton variant="primary" @click="handleSave" :disabled="!canSave">保存</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <div class="scheme-basic-info">
          <IxInput
            v-model="schemeForm.name"
            label="方案名称"
            placeholder="请输入方案名称"
            style="flex: 1;"
          />
          <IxInput
            v-model="schemeForm.description"
            label="方案描述"
            placeholder="请输入方案描述（可选）"
            style="flex: 1;"
          />

          <template v-if="schemeForm.atomicType">
            <IxSelect
              v-model="schemeForm.categoryId"
              :label="productCategoryLabel"
              style="flex: 1;"
            >
              <IxSelectItem
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </IxSelect>
            <IxSelect
              v-model="schemeForm.subCategoryId"
              :label="productSeriesLabel"
              style="flex: 1;"
            >
              <IxSelectItem
                v-for="subCategory in subCategories"
                :key="subCategory.id"
                :label="subCategory.name"
                :value="subCategory.id"
              />
            </IxSelect>
            <template v-if="schemeForm.atomicType === 'equipment'">
              <IxSelect
                v-model="schemeForm.series"
                label="系列"
                placeholder="请选择系列"
                style="flex: 1;"
              >
                <IxSelectItem
                  v-for="option in seriesOptions"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </IxSelect>
              <IxSelect
                v-model="schemeForm.size"
                label="尺寸"
                placeholder="请选择尺寸"
                style="flex: 1;"
              >
                <IxSelectItem
                  v-for="option in sizeOptions"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </IxSelect>
            </template>
          </template>
        </div>

        <div v-if="schemeForm.atomicType && currentAtomicScheme && gridOptions" class="scheme-table-container">
          <div class="table-actions">
            <div class="table-actions-left">
              <IxButton variant="tertiary" size="sm" @click="handleExpandAll">全部展开</IxButton>
              <IxButton variant="tertiary" size="sm" @click="handleCollapseAll">全部收缩</IxButton>
            </div>
            <div class="table-actions-right">
              <input
                ref="excelInputRef"
                type="file"
                accept=".xlsx,.xls"
                style="display: none;"
                @change="handleExcelSelected"
              />
              <IxButton variant="tertiary" size="sm" @click="triggerExcelImport">导入Excel</IxButton>
              <IxButton variant="tertiary" size="sm" @click="handleAddRootItem">添加项目</IxButton>
              <IxButton
                variant="tertiary"
                size="sm"
                @click="handleAddChildItemToSelected"
                :disabled="!hasSelectedRow"
              >
                添加子项目
              </IxButton>
              <IxButton
                variant="tertiary"
                size="sm"
                @click="handleDeleteSelectedItems"
                :disabled="!hasSelectedRow"
                style="color: var(--theme-color-alarm);"
              >
                删除选中项目
              </IxButton>
            </div>
          </div>
          <AgGridVue
            style="flex: 1; width: 100%; min-height: 0;"
            :gridOptions="gridOptions"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  IxSelect,
  IxSelectItem,
  showToast,
} from '@siemens/ix-vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';
import { inspectionTemplatesApi, templatemappingsApi } from '@/api';
import type { TemplateMappingDto } from '@/api/modules/templatemappings';
import { dedupeTemplateMappingField } from '@/util/templateMappings';
import {
  isTemplateApiId,
  templateDtoToFormAndAtomic,
  buildTemplateDtoForCreate,
  buildTemplateDtoForSave,
} from '../utils/schemeInspectionTemplate';
import { importInspectionItemsFromExcel } from '../utils/importInspectionItemsFromExcel';
import { syncTemplateNodesWithProgress } from '../utils/syncTemplateNodes';
import { loadTemplateItemsByTemplateId } from '../utils/loadTemplateItems';
import {
  convertToFlatRows,
  mapRequiredToPriority,
  type AtomicScheme,
  type SchemeItem,
  type FlatRow,
} from '../utils/schemeUtils';
import { createBaseColumnDefs, configureColumnEditing } from '../utils/gridConfig';

ModuleRegistry.registerModules([AllCommunityModule]);

const route = useRoute();
const router = useRouter();

const schemeId = route.params.id as string;
const isNew = schemeId === 'new';

const loadedTemplateCreatedate = ref<string | null>(null);
const templateMappings = ref<TemplateMappingDto[]>([]);
const pageTitle = computed(() => (isNew ? '新建原子方案' : '编辑原子方案'));

const schemeForm = ref({
  name: '',
  description: '',
  atomicType: '' as 'peripheral' | 'equipment' | '',
  categoryId: '',
  subCategoryId: '',
  model: '',
  series: '',
  size: '',
});

const currentAtomicScheme = ref<AtomicScheme | null>(null);
const categories = productCategoriesData.categories;
const subCategories = computed(() => {
  if (!schemeForm.value.categoryId) return [];
  const category = categories.find((c) => c.id === schemeForm.value.categoryId);
  return category?.subCategories || [];
});

const productCategoryLabel = computed(() => '产品类型');

const productSeriesLabel = computed(() => '产品系列');

function withCurrentOption(options: string[], currentValue: string): string[] {
  const value = currentValue.trim();
  if (!value || options.includes(value)) {
    return options;
  }
  return [value, ...options];
}

const seriesOptions = computed(() =>
  withCurrentOption(dedupeTemplateMappingField(templateMappings.value, 'series'), schemeForm.value.series),
);

const sizeOptions = computed(() =>
  withCurrentOption(dedupeTemplateMappingField(templateMappings.value, 'size'), schemeForm.value.size),
);

async function loadTemplateMappings(): Promise<void> {
  try {
    templateMappings.value = await templatemappingsApi.listTemplateMappings();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '型号尺寸匹配表加载失败' });
  }
}

const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);
const expandedRows = ref<Set<string>>(new Set());
const rowDataToItemMap = ref<Map<string, SchemeItem>>(new Map());
const selectedRows = ref<FlatRow[]>([]);
const excelInputRef = ref<HTMLInputElement | null>(null);
const syncProgress = ref({ visible: false, percent: 0, message: '' });
const isEditMode = ref(true);

const hasSelectedRow = computed(() => selectedRows.value.length > 0);

const getVisibleRows = (allRows: FlatRow[]): FlatRow[] => {
  const visible: FlatRow[] = [];
  const parentStack: string[] = [];
  allRows.forEach((row) => {
    if (row.parentId) {
      const parentIndex = parentStack.indexOf(row.parentId);
      if (parentIndex === -1 || !expandedRows.value.has(row.parentId)) {
        return;
      }
      parentStack.splice(parentIndex + 1);
    }
    parentStack.push(row.id);
    visible.push(row);
  });
  return visible;
};

const toggleRow = (rowId: string) => {
  if (expandedRows.value.has(rowId)) {
    expandedRows.value.delete(rowId);
  } else {
    expandedRows.value.add(rowId);
  }
  updateGridData();
};

const handleExpandAll = () => {
  if (!currentAtomicScheme.value) return;
  const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
  allRows.forEach((row) => {
    if (row.hasChildren) {
      expandedRows.value.add(row.id);
    }
  });
  updateGridData();
};

const handleCollapseAll = () => {
  expandedRows.value.clear();
  updateGridData();
};

const updateGridData = () => {
  if (!gridApi.value || !currentAtomicScheme.value) return;
  const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
  rowDataToItemMap.value.clear();
  const buildMap = (items: SchemeItem[]) => {
    items.forEach((item) => {
      rowDataToItemMap.value.set(item.id, item);
      if (item.children) {
        buildMap(item.children);
      }
    });
  };
  buildMap(currentAtomicScheme.value.items);
  gridApi.value.setGridOption('rowData', getVisibleRows(allRows));
};

const findItemByRowId = (rowId: string): SchemeItem | null => rowDataToItemMap.value.get(rowId) || null;

const selectNewItem = (newItem: SchemeItem) => {
  setTimeout(() => {
    if (!gridApi.value || !currentAtomicScheme.value) return;
    const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
    const visibleRows = getVisibleRows(allRows);
    const newRow = visibleRows.find((row) => row.id === newItem.id);
    if (!newRow) return;
    const node = gridApi.value.getRowNode(newRow.id);
    if (node) {
      node.setSelected(true);
      if (gridOptions.value?.onSelectionChanged) {
        gridOptions.value.onSelectionChanged({} as any);
      }
    }
  }, 100);
};

const handleCellValueChanged = () => {
  updateGridData();
};

const triggerExcelImport = () => {
  excelInputRef.value?.click();
};

const handleExcelSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !currentAtomicScheme.value) {
    return;
  }
  try {
    const importedItems = await importInspectionItemsFromExcel(file);
    currentAtomicScheme.value.items = importedItems;
    expandedRows.value.clear();
    selectedRows.value = [];
    updateGridData();
    showToast({ message: `导入成功，共导入 ${importedItems.length} 个根节点` });
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : 'Excel 导入失败' });
  } finally {
    input.value = '';
  }
};

const canSave = computed(() => {
  if (!schemeForm.value.atomicType || !schemeForm.value.name) return false;
  if (!schemeForm.value.categoryId || !schemeForm.value.subCategoryId) return false;
  if (schemeForm.value.atomicType === 'equipment' && (!schemeForm.value.series.trim() || !schemeForm.value.size.trim())) {
    return false;
  }
  if (!currentAtomicScheme.value?.items?.length) return false;
  return true;
});

watch(
  () => schemeForm.value.atomicType,
  (type) => {
    if (type === 'peripheral') {
      schemeForm.value.series = '';
      schemeForm.value.size = '';
    }
  },
  { immediate: true },
);

const findParentAndSiblings = (itemId: string): { parent: SchemeItem | null; siblings: SchemeItem[]; isRoot: boolean } => {
  if (!currentAtomicScheme.value) {
    return { parent: null, siblings: [], isRoot: false };
  }
  const search = (items: SchemeItem[], parent: SchemeItem | null = null): { parent: SchemeItem | null; siblings: SchemeItem[]; isRoot: boolean } | null => {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].id === itemId) {
        return { parent, siblings: items, isRoot: parent === null };
      }
      if (items[i].children) {
        const result = search(items[i].children!, items[i]);
        if (result) return result;
      }
    }
    return null;
  };
  return search(currentAtomicScheme.value.items, null) ?? { parent: null, siblings: [], isRoot: true };
};

const handleAddRootItem = () => {
  if (!currentAtomicScheme.value) return;
  let targetSiblings: SchemeItem[] = currentAtomicScheme.value.items;
  let parentItem: SchemeItem | null = null;
  if (selectedRows.value.length > 0) {
    const result = findParentAndSiblings(selectedRows.value[0].id);
    if (result.siblings.length > 0) {
      targetSiblings = result.siblings;
      parentItem = result.parent;
    }
  }
  const newItem: SchemeItem = {
    id: `new-${Date.now()}`,
    name: '新检测项目',
    dataType: 'boolean',
    ruleType: 'boolean_equal',
    operationGuide: '',
    param1: '',
    param2: '',
    type: 'visual',
    required: true,
    priority: mapRequiredToPriority(true),
    children: [],
  };
  targetSiblings.push(newItem);
  if (parentItem) {
    expandedRows.value.add(parentItem.id);
  }
  updateGridData();
  selectNewItem(newItem);
};

const handleAddChildItemToSelected = () => {
  if (!currentAtomicScheme.value || selectedRows.value.length === 0) {
    alert('请先选中一个项目作为父级');
    return;
  }
  const selectedRow = selectedRows.value[0];
  const parentItem = findItemByRowId(selectedRow.id);
  if (!parentItem) {
    alert('无法找到选中的项目');
    return;
  }
  const newChildItem: SchemeItem = {
    id: `new-${Date.now()}`,
    name: '新子项目',
    dataType: parentItem.dataType || 'boolean',
    ruleType: parentItem.ruleType || 'boolean_equal',
    operationGuide: parentItem.operationGuide || '',
    param1: parentItem.param1 || '',
    param2: parentItem.param2 || '',
    type: parentItem.type || 'visual',
    required: true,
    priority: mapRequiredToPriority(true),
    children: [],
  };
  if (!parentItem.children) {
    parentItem.children = [];
  }
  parentItem.children.push(newChildItem);
  expandedRows.value.add(selectedRow.id);
  updateGridData();
  selectNewItem(newChildItem);
};

const handleDeleteSelectedItems = () => {
  if (!currentAtomicScheme.value || selectedRows.value.length === 0) {
    alert('请先选中要删除的项目');
    return;
  }
  const count = selectedRows.value.length;
  const itemNames = selectedRows.value.map((row) => row.name).join('、');
  if (!confirm(`确定要删除选中的 ${count} 个项目吗？\n\n删除的项目：${itemNames}\n\n删除后其所有子项目也会被删除，此操作不可恢复！`)) {
    return;
  }
  const removeItem = (items: SchemeItem[], itemId: string): boolean => {
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].id === itemId) {
        items.splice(i, 1);
        return true;
      }
      if (items[i].children && removeItem(items[i].children!, itemId)) {
        return true;
      }
    }
    return false;
  };
  selectedRows.value.forEach((row) => {
    if (!removeItem(currentAtomicScheme.value!.items, row.id)) {
      const removeFromChildren = (items: SchemeItem[]): boolean => {
        for (const item of items) {
          if (item.children) {
            if (removeItem(item.children, row.id)) {
              return true;
            }
            if (removeFromChildren(item.children)) {
              return true;
            }
          }
        }
        return false;
      };
      removeFromChildren(currentAtomicScheme.value!.items);
    }
    const removeExpandedState = (itemId: string) => {
      expandedRows.value.delete(itemId);
      const item = findItemByRowId(itemId);
      if (item?.children) {
        item.children.forEach((child) => removeExpandedState(child.id));
      }
    };
    removeExpandedState(row.id);
  });
  if (gridApi.value) {
    gridApi.value.deselectAll();
  }
  selectedRows.value = [];
  updateGridData();
};

const handleCancel = () => {
  router.push('/scheme/list');
};

const handleSave = async () => {
  if (!canSave.value) {
    alert('请完善方案信息');
    return;
  }
  const atomicScheme: AtomicScheme = {
    id: isNew ? '0' : currentAtomicScheme.value?.id || '',
    name: schemeForm.value.name,
    type: schemeForm.value.atomicType as 'peripheral' | 'equipment',
    description: schemeForm.value.description,
    items: currentAtomicScheme.value?.items || [],
  };
  atomicScheme.categoryId = schemeForm.value.categoryId;
  atomicScheme.subCategoryId = schemeForm.value.subCategoryId;
  atomicScheme.deviceTypes = schemeForm.value.subCategoryId ? [schemeForm.value.subCategoryId] : [];
  if (schemeForm.value.atomicType === 'equipment') {
    atomicScheme.model = schemeForm.value.model;
  }
  try {
    if (isNew) {
      const payload = buildTemplateDtoForCreate(schemeForm.value, atomicScheme);
      const newId = await inspectionTemplatesApi.createInspectionTemplate(payload);
      syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
      await syncTemplateNodesWithProgress(newId, atomicScheme.items, (p) => {
        syncProgress.value = { visible: true, percent: p.percent, message: p.message };
      });
      syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
      showToast({ message: '保存成功' });
      router.push(`/scheme/view/${newId}`);
      return;
    }
    if (isTemplateApiId(schemeId)) {
      const templateId = Number.parseInt(schemeId, 10);
      await inspectionTemplatesApi.updateInspectionTemplate(
        buildTemplateDtoForSave(templateId, schemeForm.value, atomicScheme, loadedTemplateCreatedate.value),
      );
      syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
      await syncTemplateNodesWithProgress(templateId, atomicScheme.items, (p) => {
        syncProgress.value = { visible: true, percent: p.percent, message: p.message };
      });
      syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
      showToast({ message: '保存成功' });
      router.push('/scheme/list');
      return;
    }
    console.log('保存原子方案（本地 mock）:', atomicScheme);
    router.push('/scheme/list');
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '保存失败' });
  } finally {
    setTimeout(() => {
      syncProgress.value.visible = false;
    }, 300);
  }
};

const updateGridOptionsForEdit = () => {
  if (!gridOptions.value || !gridApi.value) return;
  const columnDefs = gridOptions.value.columnDefs || [];
  configureColumnEditing(columnDefs, findItemByRowId, updateGridData);
  gridApi.value.setGridOption('rowSelection', 'multiple');
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.setGridOption('singleClickEdit', false);
  gridOptions.value.onCellValueChanged = handleCellValueChanged;
  gridOptions.value.onCellKeyDown = (params: any) => {
    if (params.event.key === 'F2') {
      const colId = params.column.getColId();
      params.api.startEditingCell({ rowIndex: params.node.rowIndex, colKey: colId });
      params.event.preventDefault();
    }
  };
  gridOptions.value.onCellDoubleClicked = (params: any) => {
    const target = params.event?.target;
    if (!target) return;
    if (!target.classList.contains('expand-icon') && !target.closest('.expand-icon')) {
      const colId = params.column.getColId();
      if (gridApi.value) {
        gridApi.value.startEditingCell({ rowIndex: params.node.rowIndex, colKey: colId });
      }
    }
  };
  const handleSelectionChanged = () => {
    if (gridApi.value) {
      const selectedNodes = gridApi.value.getSelectedNodes();
      selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
    }
  };
  gridOptions.value.onSelectionChanged = handleSelectionChanged;
  gridOptions.value.onRowClicked = () => {
    setTimeout(() => handleSelectionChanged(), 0);
  };
};

function loadMockScheme(): void {
  const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
  const scheme = schemes.find((s) => s.id === schemeId);
  if (!scheme) {
    alert('未找到该方案');
    router.push('/scheme/list');
    return;
  }
  schemeForm.value = {
    name: scheme.name || '',
    description: scheme.description || '',
    atomicType:
      scheme.type === 'peripheral' || scheme.type === 'equipment'
        ? scheme.type
        : ('' as 'peripheral' | 'equipment' | ''),
    categoryId: scheme.categoryId || '',
    subCategoryId: scheme.subCategoryId || '',
    model: scheme.model || '',
    series: scheme.series || '',
    size: scheme.size || '',
  };
  const schemeItems: SchemeItem[] = (scheme.items || []).map((item: any) => ({
    ...item,
    type: item.type || '',
    required: item.required !== undefined ? item.required : false,
  })) as SchemeItem[];
  currentAtomicScheme.value = {
    id: scheme.id,
    name: scheme.name,
    type: scheme.type === 'peripheral' || scheme.type === 'equipment' ? scheme.type : 'peripheral',
    description: scheme.description,
    deviceTypes: scheme.deviceTypes || [],
    categoryId: scheme.categoryId,
    subCategoryId: scheme.subCategoryId,
    model: scheme.model,
    items: schemeItems,
  };
  updateGridData();
}

async function loadApiScheme(): Promise<void> {
  const templateId = Number.parseInt(schemeId, 10);
  const dto = await inspectionTemplatesApi.getInspectionTemplate(templateId);
  loadedTemplateCreatedate.value = dto.createdate ?? null;
  const { schemeForm: sf, atomic } = templateDtoToFormAndAtomic(dto);
  const apiItems = await loadTemplateItemsByTemplateId(templateId);
  if (apiItems.length > 0) {
    atomic.items = apiItems;
  }
  schemeForm.value = sf;
  currentAtomicScheme.value = atomic;
  updateGridData();
}

onMounted(() => {
  void loadTemplateMappings();
  const ixTheme = getIxTheme(agGrid);
  const columnDefs = createBaseColumnDefs(expandedRows, toggleRow, gridApi, isEditMode);
  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    columnDefs,
    defaultColDef: {
      resizable: true,
      sortable: false,
      filter: false,
      editable: false,
    },
    rowData: [],
    suppressCellFocus: false,
    singleClickEdit: false,
    animateRows: true,
    getRowStyle: (params: any) => {
      const data = params.data as FlatRow;
      if (!data.isDetectionItem) {
        return { backgroundColor: 'var(--theme-color-soft)' };
      }
      return { backgroundColor: 'transparent' };
    },
    rowSelection: 'multiple',
    onSelectionChanged: () => {
      if (gridApi.value) {
        const selectedNodes = gridApi.value.getSelectedNodes();
        selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
      }
    },
    onRowClicked: () => {
      setTimeout(() => {
        if (gridApi.value) {
          const selectedNodes = gridApi.value.getSelectedNodes();
          selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
        }
      }, 0);
    },
    onGridReady: (params: any) => {
      if (params?.api) {
        gridApi.value = params.api;
        setTimeout(() => {
          updateGridOptionsForEdit();
          updateGridData();
        }, 100);
      }
    },
  };

  void (async () => {
    if (isNew) {
      currentAtomicScheme.value = {
        id: `new-${Date.now()}`,
        name: '',
        type: 'equipment',
        description: '',
        deviceTypes: [],
        items: [],
      };
      return;
    }
    try {
      if (isTemplateApiId(schemeId)) {
        await loadApiScheme();
        return;
      }
      loadMockScheme();
    } catch (e) {
      console.error(e);
      alert('未找到该方案或加载失败');
      router.push('/scheme/list');
    }
  })();
});

watch(
  () => schemeForm.value.categoryId,
  (nextCategoryId, previousCategoryId) => {
    if (!nextCategoryId || !previousCategoryId || nextCategoryId === previousCategoryId) {
      return;
    }
    schemeForm.value.subCategoryId = '';
  },
);
</script>

<style scoped>
.scheme-edit-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-section {
  flex: 1;
  padding: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scheme-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.scheme-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  overflow: hidden;
  min-height: 0;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
  flex-shrink: 0;
}

.table-actions-left {
  display: flex;
  gap: 0.5rem;
}

.table-actions-right {
  display: flex;
  gap: 0.5rem;
}

.sync-progress-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-progress-card {
  width: min(440px, calc(100vw - 2rem));
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 1rem;
}

.sync-progress-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.sync-progress-message {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  margin-bottom: 0.75rem;
}

.sync-progress-track {
  width: 100%;
  height: 8px;
  background: var(--theme-color-soft);
  border-radius: 999px;
  overflow: hidden;
}

.sync-progress-fill {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 0.2s ease;
}

.sync-progress-percent {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
  text-align: right;
}
</style>
