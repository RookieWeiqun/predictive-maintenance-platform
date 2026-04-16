<template>
  <div class="scheme-edit-grid">
    <div class="table-actions">
      <div class="table-actions-left">
        <IxButton variant="tertiary" size="sm" @click="handleExpandAll">全部展开</IxButton>
        <IxButton variant="tertiary" size="sm" @click="handleCollapseAll">全部收缩</IxButton>
      </div>
      <div v-if="editable" class="table-actions-right">
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
      v-if="gridOptions"
      style="flex: 1; width: 100%; min-height: 0;"
      :gridOptions="gridOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxButton } from "@siemens/ix-vue";
import { 
  convertToFlatRows,
  getTypeLabel,
  type SchemeItem, 
  type FlatRow 
} from '../utils/schemeUtils';
import { createBaseColumnDefs, configureColumnEditing } from '../utils/gridConfig';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  items: SchemeItem[];
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
});

const emit = defineEmits<{
  'update:items': [items: SchemeItem[]];
}>();

// ag-grid 配置
const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

// 展开/收缩状态
const expandedRows = ref<Set<string>>(new Set());

// 行数据到原始项的映射
const rowDataToItemMap = ref<Map<string, SchemeItem>>(new Map());

// 选中的行
const selectedRows = ref<FlatRow[]>([]);

// 是否有选中的行
const hasSelectedRow = computed(() => selectedRows.value.length > 0);

// 当前方案数据（内部维护）
const currentItems = ref<SchemeItem[]>([]);

// 获取可见的行数据
const getVisibleRows = (allRows: FlatRow[]): FlatRow[] => {
  const visible: FlatRow[] = [];
  const parentStack: string[] = [];
  
  allRows.forEach(row => {
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
  const allRows = convertToFlatRows(currentItems.value, undefined, 0);
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
  if (!gridApi.value) return;
  
  const allRows = convertToFlatRows(currentItems.value, undefined, 0);
  
  // 重建映射
  rowDataToItemMap.value.clear();
  const buildMap = (items: SchemeItem[]) => {
    items.forEach(item => {
      rowDataToItemMap.value.set(item.id, item);
      if (item.children) {
        buildMap(item.children);
      }
    });
  };
  buildMap(currentItems.value);
  
  const visibleRows = getVisibleRows(allRows);
  gridApi.value.setGridOption('rowData', visibleRows);
  
  // 通知父组件更新
  emit('update:items', JSON.parse(JSON.stringify(currentItems.value)));
};

// 根据行ID查找对应的原始项
const findItemByRowId = (rowId: string): SchemeItem | null => {
  return rowDataToItemMap.value.get(rowId) || null;
};

// 选中新添加的项目
const selectNewItem = (newItem: SchemeItem) => {
  setTimeout(() => {
    if (gridApi.value) {
      const allRows = convertToFlatRows(currentItems.value, undefined, 0);
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

// 处理单元格值变化
const handleCellValueChanged = () => {
  if (!props.editable) return;
  updateGridData();
};

// 查找项目的父级和同级数组
const findParentAndSiblings = (itemId: string): { parent: SchemeItem | null, siblings: SchemeItem[], isRoot: boolean } => {
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
  
  for (const firstLevelItem of currentItems.value) {
    if (firstLevelItem.children) {
      const result = search(firstLevelItem.children, firstLevelItem);
      if (result) return result;
    }
  }
  
  return { parent: null, siblings: [], isRoot: true };
};

// 添加项目
const handleAddRootItem = () => {
  if (currentItems.value.length === 0) {
    const firstLevelItem: SchemeItem = {
      id: `level1-${Date.now()}`,
      name: '根层级',
      children: [],
    };
    currentItems.value.push(firstLevelItem);
  }
  
  const firstLevelItem = currentItems.value[0];
  if (!firstLevelItem.children) {
    firstLevelItem.children = [];
  }
  
  let targetSiblings: SchemeItem[] = firstLevelItem.children;
  let parentItem: SchemeItem | null = firstLevelItem;
  
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
    type: 'visual',
    required: true,
    children: [],
  };
  
  targetSiblings.push(newItem);
  
  if (parentItem) {
    expandedRows.value.add(parentItem.id);
  }
  
  updateGridData();
  selectNewItem(newItem);
};

// 添加子项目
const handleAddChildItemToSelected = () => {
  if (selectedRows.value.length === 0) {
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
    type: parentItem.type || 'visual',
    required: true,
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

// 删除选中的项目
const handleDeleteSelectedItems = () => {
  if (selectedRows.value.length === 0) {
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
      const removeFromAllLevels = (items: SchemeItem[]) => {
        for (const item of items) {
          if (item.children) {
            if (removeItem(item.children, row.id)) {
              return true;
            }
            if (removeFromAllLevels(item.children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      removeFromAllLevels(currentItems.value);
      expandedRows.value.delete(row.id);
    });
    
    if (gridApi.value) {
      gridApi.value.deselectAll();
    }
    selectedRows.value = [];
    updateGridData();
  }
};

// 更新表格配置为编辑模式
const updateGridOptionsForEdit = () => {
  if (!gridOptions.value || !gridApi.value) return;
  
  const columnDefs = gridOptions.value.columnDefs || [];
  configureColumnEditing(columnDefs, findItemByRowId, updateGridData);
  
  gridApi.value.setGridOption('rowSelection', 'multiple');
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.setGridOption('singleClickEdit', false);
  gridOptions.value.onCellValueChanged = handleCellValueChanged;
  
  gridOptions.value.onCellKeyDown = (params: any) => {
    if (params.event.key === 'F2' && props.editable) {
      const colId = params.column.getColId();
      params.api.startEditingCell({
        rowIndex: params.node.rowIndex,
        colKey: colId
      });
      params.event.preventDefault();
    }
  };
  
  gridOptions.value.onCellDoubleClicked = (params: any) => {
    if (!props.editable) return;
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

// 更新表格配置为查看模式
const updateGridOptionsForView = () => {
  if (!gridOptions.value || !gridApi.value) return;
  
  const columnDefs = gridOptions.value.columnDefs || [];
  columnDefs.forEach((colDef: any) => {
    colDef.editable = false;
  });
  
  gridApi.value.setGridOption('rowSelection', undefined);
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.deselectAll();
  gridOptions.value.onCellValueChanged = undefined;
  gridOptions.value.onSelectionChanged = undefined;
  selectedRows.value = [];
};

// 初始化表格
const initGrid = () => {
  const ixTheme = getIxTheme(agGrid);
  
  // 即使数据为空，也要创建 gridOptions
  let visibleRows: FlatRow[] = [];
  let allRows: FlatRow[] = [];
  
  if (currentItems.value.length > 0) {
    allRows = convertToFlatRows(currentItems.value, undefined, 0);
    
    // 默认展开到检测项目层
    const parentIdsToExpand = new Set<string>();
    allRows.forEach(row => {
      if (row.isDetectionItem && row.parentId) {
        parentIdsToExpand.add(row.parentId);
      }
    });
    
    const expandParents = (rowId: string) => {
      const row = allRows.find(r => r.id === rowId);
      if (row && row.hasChildren) {
        expandedRows.value.add(row.id);
        if (row.parentId) {
          expandParents(row.parentId);
        }
      }
    };
    
    parentIdsToExpand.forEach(parentId => {
      expandParents(parentId);
    });
    
    visibleRows = getVisibleRows(allRows);
    
    // 重建映射
    rowDataToItemMap.value.clear();
    const buildMap = (items: SchemeItem[]) => {
      items.forEach(item => {
        rowDataToItemMap.value.set(item.id, item);
        if (item.children) {
          buildMap(item.children);
        }
      });
    };
    buildMap(currentItems.value);
  }
  
  const isEditModeRef = ref(props.editable);
  const columnDefs = createBaseColumnDefs(expandedRows, toggleRow, gridApi, isEditModeRef);
  
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
    rowData: visibleRows,
    suppressCellFocus: false,
    singleClickEdit: false,
    animateRows: true,
    getRowStyle: (params: any) => {
      const data = params.data as FlatRow;
      if (!data || !data.isDetectionItem) {
        return { backgroundColor: 'var(--theme-color-soft)' };
      }
      return { backgroundColor: 'transparent' };
    },
    rowSelection: props.editable ? 'multiple' : undefined,
    onGridReady: (params: any) => {
      gridApi.value = params.api;
      if (props.editable) {
        setTimeout(() => {
          updateGridOptionsForEdit();
        }, 100);
      }
    },
  };
};

// 监听 items 变化
watch(() => props.items, (newItems) => {
  if (newItems && newItems.length > 0) {
    currentItems.value = JSON.parse(JSON.stringify(newItems));
    if (gridApi.value) {
      updateGridData();
    } else {
      initGrid();
    }
  } else {
    currentItems.value = [];
    if (gridApi.value) {
      gridApi.value.setGridOption('rowData', []);
    }
  }
}, { immediate: true, deep: true });

// 监听 editable 变化
watch(() => props.editable, (newValue) => {
  if (newValue) {
    updateGridOptionsForEdit();
  } else {
    updateGridOptionsForView();
  }
  if (gridApi.value) {
    updateGridData();
  }
});

onMounted(() => {
  // 确保在 mounted 时初始化，即使数据为空也要创建 gridOptions
  if (props.items && props.items.length > 0) {
    currentItems.value = JSON.parse(JSON.stringify(props.items));
  }
  // 无论数据是否为空，都初始化 gridOptions
  initGrid();
});
</script>

<style scoped>
.scheme-edit-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
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
</style>
