<!-- 方案创建页面 -->
<template>
  <div class="scheme-create-page">
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
        <!-- 方案基本信息 -->
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
          
          <!-- 外围/设备方案都需要明确产品类别和产品系列 -->
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

        <!-- 检测项目表格（查看和编辑模式共用） -->
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
import { inspectionTemplatesApi, templatemappingsApi } from '@/api';
import type { TemplateMappingDto } from '@/api/modules/templatemappings';
import { dedupeTemplateMappingField } from '@/util/templateMappings';
import { buildTemplateDtoForCreate } from '../utils/schemeInspectionTemplate';
import { importInspectionItemsFromExcel } from '../utils/importInspectionItemsFromExcel';
import { syncTemplateNodesWithProgress } from '../utils/syncTemplateNodes';
import { 
  convertToFlatRows,
  mapRequiredToPriority,
  type AtomicScheme, 
  type SchemeItem, 
  type FlatRow 
} from '../utils/schemeUtils';
import { createBaseColumnDefs, configureColumnEditing } from '../utils/gridConfig';

ModuleRegistry.registerModules([AllCommunityModule]);

const route = useRoute();
const router = useRouter();

const schemeType = route.params.type as 'peripheral' | 'equipment';

// 页面标题
const pageTitle = computed(() => {
  const typeName = schemeType === 'peripheral' ? '系统外围检测方案' : '设备检测方案';
  return `新建${typeName}`;
});

// 方案基本信息表单
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

// 当前方案数据
const currentAtomicScheme = ref<AtomicScheme | null>(null);
const templateMappings = ref<TemplateMappingDto[]>([]);

// 分类列表
const categories = productCategoriesData.categories;

// 子分类列表
const subCategories = computed(() => {
  if (!schemeForm.value.categoryId) return [];
  const category = categories.find(c => c.id === schemeForm.value.categoryId);
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


// ag-grid 配置
const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

// 展开/收缩状态
const expandedRows = ref<Set<string>>(new Set());

// 行数据到原始项的映射（用于快速查找和更新）
const rowDataToItemMap = ref<Map<string, SchemeItem>>(new Map());

// 选中的行
const selectedRows = ref<FlatRow[]>([]);
const excelInputRef = ref<HTMLInputElement | null>(null);
const syncProgress = ref({ visible: false, percent: 0, message: '' });

// 是否有选中的行
const hasSelectedRow = computed(() => selectedRows.value.length > 0);

// 获取可见的行数据
const getVisibleRows = (allRows: FlatRow[]): FlatRow[] => {
  const visible: FlatRow[] = [];
  const parentStack: string[] = [];
  
  allRows.forEach(row => {
    // 检查父级是否展开
    if (row.parentId) {
      const parentIndex = parentStack.indexOf(row.parentId);
      if (parentIndex === -1 || !expandedRows.value.has(row.parentId)) {
        return; // 父级未展开，不显示
      }
      // 更新父级栈
      parentStack.splice(parentIndex + 1);
    }
    parentStack.push(row.id);
    visible.push(row);
  });
  
  return visible;
};

// 切换展开/收缩
const toggleRow = (rowId: string) => {
  if (expandedRows.value.has(rowId)) {
    expandedRows.value.delete(rowId);
  } else {
    expandedRows.value.add(rowId);
  }
  updateGridData();
};

// 全部展开
const handleExpandAll = () => {
  if (!currentAtomicScheme.value) return;
  
  const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
  allRows.forEach(row => {
    if (row.hasChildren) {
      expandedRows.value.add(row.id);
    }
  });
  updateGridData();
};

// 全部收缩
const handleCollapseAll = () => {
  expandedRows.value.clear();
  updateGridData();
};

  // 更新表格数据
const updateGridData = () => {
  if (!gridApi.value || !currentAtomicScheme.value) return;
  
  // 直接显示 items 的第一层
  const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
  
  // 重建映射（包含所有层级，用于查找）
  rowDataToItemMap.value.clear();
  const buildMap = (items: SchemeItem[]) => {
    items.forEach(item => {
      rowDataToItemMap.value.set(item.id, item);
      if (item.children) {
        buildMap(item.children);
      }
    });
  };
  buildMap(currentAtomicScheme.value.items);
  
    const visibleRows = getVisibleRows(allRows);
    gridApi.value.setGridOption('rowData', visibleRows);
};

// 根据行ID查找对应的原始项
const findItemByRowId = (rowId: string): SchemeItem | null => {
  return rowDataToItemMap.value.get(rowId) || null;
};

// 选中新添加的项目（通用函数）
const selectNewItem = (newItem: SchemeItem) => {
  setTimeout(() => {
    if (gridApi.value && currentAtomicScheme.value) {
      const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
      const visibleRows = getVisibleRows(allRows);
      const newRow = visibleRows.find(row => row.id === newItem.id);
      if (newRow && gridApi.value) {
        const node = gridApi.value.getRowNode(newRow.id);
        if (node) {
          node.setSelected(true);
          if (gridOptions.value?.onSelectionChanged) {
            gridOptions.value.onSelectionChanged({} as any);
          }
        }
      }
    }
  }, 100);
};

// 处理单元格值变化（编辑逻辑已在 valueSetter 中处理，这里只更新显示）
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

// 验证是否可以保存
const canSave = computed(() => {
  if (!schemeForm.value.atomicType || !schemeForm.value.name) return false;
  if (!schemeForm.value.categoryId || !schemeForm.value.subCategoryId) return false;
  if (schemeForm.value.atomicType === 'equipment' && (!schemeForm.value.series.trim() || !schemeForm.value.size.trim())) {
    return false;
  }
  if (schemeForm.value.atomicType === 'equipment' && !schemeForm.value.categoryId) return false;
  if (!currentAtomicScheme.value || !currentAtomicScheme.value.items || currentAtomicScheme.value.items.length === 0) {
    return false;
  }
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

// 查找项目的父级和同级数组
const findParentAndSiblings = (itemId: string): { parent: SchemeItem | null, siblings: SchemeItem[], isRoot: boolean } => {
  if (!currentAtomicScheme.value) {
    return { parent: null, siblings: [], isRoot: false };
  }
  
  // 递归查找
  const search = (items: SchemeItem[], parent: SchemeItem | null = null): { parent: SchemeItem | null, siblings: SchemeItem[], isRoot: boolean } | null => {
    for (let i = 0; i < items.length; i++) {
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
  
  // 直接从根层级（items）开始搜索
  const result = search(currentAtomicScheme.value.items, null);
  if (result) return result;
  
  return { parent: null, siblings: [], isRoot: true };
};

// 添加项目：添加选中项目的同级项目，如果没有选中就添加根项目（直接添加到 items 数组）
const handleAddRootItem = () => {
  if (!currentAtomicScheme.value) return;
  
  let targetSiblings: SchemeItem[] = currentAtomicScheme.value.items;
  let parentItem: SchemeItem | null = null;
  
  // 如果有选中的行，添加到同级
  if (selectedRows.value.length > 0) {
    const selectedRow = selectedRows.value[0];
    const result = findParentAndSiblings(selectedRow.id);
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
  
  // 如果父级存在，确保展开
  if (parentItem) {
    expandedRows.value.add(parentItem.id);
  }
  
  updateGridData();
  selectNewItem(newItem);
};

// 添加子项目：添加选中项目的子项目
const handleAddChildItemToSelected = () => {
  if (!currentAtomicScheme.value || selectedRows.value.length === 0) {
    alert('请先选中一个项目作为父级');
    return;
  }
  
  // 使用第一个选中的行作为父级
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
  
  // 确保父级展开
  expandedRows.value.add(selectedRow.id);
  updateGridData();
  selectNewItem(newChildItem);
};

// 删除选中的项目：删除选中项目及其所有子项目
const handleDeleteSelectedItems = () => {
  if (!currentAtomicScheme.value || selectedRows.value.length === 0) {
    alert('请先选中要删除的项目');
    return;
  }
  
  const count = selectedRows.value.length;
  const itemNames = selectedRows.value.map(row => row.name).join('、');
  
  if (confirm(`确定要删除选中的 ${count} 个项目吗？\n\n删除的项目：${itemNames}\n\n删除后其所有子项目也会被删除，此操作不可恢复！`)) {
    const removeItem = (items: SchemeItem[], itemId: string): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          items.splice(i, 1);
          return true;
        }
        if (items[i].children) {
          if (removeItem(items[i].children!, itemId)) {
            return true;
          }
        }
      }
      return false;
    };
    
    selectedRows.value.forEach(row => {
      // 先尝试从根层级（items）中删除
      if (!removeItem(currentAtomicScheme.value!.items, row.id)) {
        // 如果根层级找不到，递归从所有子层级中删除
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
      
      // 删除所有子项的展开状态
      const removeExpandedState = (itemId: string) => {
        expandedRows.value.delete(itemId);
        const item = findItemByRowId(itemId);
        if (item && item.children) {
          item.children.forEach(child => {
            removeExpandedState(child.id);
          });
        }
      };
      removeExpandedState(row.id);
    });
    
    // 清除选中状态
    if (gridApi.value) {
      gridApi.value.deselectAll();
    }
    selectedRows.value = [];
    updateGridData();
  }
};

// 取消创建
const handleCancel = () => {
  if (confirm('确定要取消创建吗？未保存的数据将丢失。')) {
    router.push('/scheme/list');
  }
};

// 保存方案
const handleSave = async () => {
  if (!canSave.value) {
    alert('请完善方案信息');
    return;
  }

  const atomicScheme: AtomicScheme = {
    id: '0',
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
    const payload = buildTemplateDtoForCreate(schemeForm.value, atomicScheme);
    const newId = await inspectionTemplatesApi.createInspectionTemplate(payload);
    syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
    await syncTemplateNodesWithProgress(newId, atomicScheme.items, (p) => {
      syncProgress.value = { visible: true, percent: p.percent, message: p.message };
    });
    syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
    showToast({ message: '保存成功' });
    router.push(`/scheme/view/${newId}`);
  } catch (error) {
    console.error('保存失败:', error);
    showToast({ message: error instanceof Error ? error.message : '保存失败，请重试' });
  } finally {
    setTimeout(() => {
      syncProgress.value.visible = false;
    }, 300);
  }
};


// 编辑模式标志（创建页面始终为编辑模式）
const isEditMode = ref(true);

// 更新表格配置为编辑模式
const updateGridOptionsForEdit = () => {
  if (!gridOptions.value || !gridApi.value) return;
  
  const columnDefs = gridOptions.value.columnDefs || [];
  configureColumnEditing(columnDefs, findItemByRowId, updateGridData);
  
  // 使用 setGridOption 更新配置
  gridApi.value.setGridOption('rowSelection', 'multiple');
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.setGridOption('singleClickEdit', false);
  gridOptions.value.onCellValueChanged = handleCellValueChanged;
  
  // 监听键盘事件，支持 F2 键触发编辑
  gridOptions.value.onCellKeyDown = (params: any) => {
    if (params.event.key === 'F2') {
      const colId = params.column.getColId();
      params.api.startEditingCell({
        rowIndex: params.node.rowIndex,
        colKey: colId
      });
      params.event.preventDefault();
    }
  };
  
  // 支持双击编辑（除了展开图标区域）
  gridOptions.value.onCellDoubleClicked = (params: any) => {
    const target = params.event?.target;
    if (!target) return;
    if (!target.classList.contains('expand-icon') && !target.closest('.expand-icon')) {
      const colId = params.column.getColId();
      if (gridApi.value) {
        gridApi.value.startEditingCell({
          rowIndex: params.node.rowIndex,
          colKey: colId
        });
      }
    }
  };
  
  // 定义选择变化处理函数
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

// 初始化数据
onMounted(() => {
  void loadTemplateMappings();
  // 设置方案类型
  schemeForm.value.atomicType = schemeType;
  
  // 初始化空的方案数据
  currentAtomicScheme.value = {
    id: `new-${Date.now()}`,
    name: '',
    type: schemeType,
    description: '',
    deviceTypes: [],
    items: [],
  };
  
  // 初始化空的 ag-grid
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
        // 延迟更新，确保ag-grid内部状态已更新
        setTimeout(() => {
          if (gridApi.value) {
            const selectedNodes = gridApi.value.getSelectedNodes();
            selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
          }
        }, 0);
      },
      onGridReady: (params: any) => {
        if (params && params.api) {
          gridApi.value = params.api;
          // 默认进入编辑模式，需要设置编辑配置
          setTimeout(() => {
            updateGridOptionsForEdit();
          }, 100);
        }
      },
    };
});


// 监听分类变化，更新子分类
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
.scheme-create-page {
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
  /* margin-bottom: 1rem; */
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

<style>
</style>
