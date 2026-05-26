import { ref, computed, type Ref } from 'vue';
import { type GridOptions } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { getIxTheme } from '@siemens/ix-aggrid';
import { createBaseColumnDefs } from './gridConfig';
import {
  convertToFlatRows,
  mapRequiredToPriority,
  type AtomicScheme,
  type SchemeItem,
  type FlatRow,
} from './schemeUtils';
import { updateGridOptionsForEdit } from './gridEditUtils';

export function useSchemeGridEditor(
  currentAtomicScheme: Ref<AtomicScheme | null>,
  isEditMode: Ref<boolean>,
  onItemsUpdate?: (items: SchemeItem[]) => void,
) {
  const gridOptions = ref<GridOptions | null>(null);
  const gridApi = ref<any>(null);
  const expandedRows = ref<Set<string>>(new Set());
  const rowDataToItemMap = ref<Map<string, SchemeItem>>(new Map());
  const selectedRows = ref<FlatRow[]>([]);
  const hasSelectedRow = computed(() => selectedRows.value.length > 0);

  const rebuildItemMap = (items: SchemeItem[]) => {
    rowDataToItemMap.value.clear();

    const visit = (nodes: SchemeItem[]) => {
      nodes.forEach((node) => {
        rowDataToItemMap.value.set(node.id, node);
        if (node.children?.length) {
          visit(node.children);
        }
      });
    };

    visit(items);
  };

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

  const syncRows = () => {
    if (!currentAtomicScheme.value) return [] as FlatRow[];

    rebuildItemMap(currentAtomicScheme.value.items);
    const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
    return getVisibleRows(allRows);
  };

  const updateGridData = () => {
    if (!currentAtomicScheme.value) return;

    const visibleRows = syncRows();

    if (gridApi.value) {
      gridApi.value.setGridOption('rowData', visibleRows);
    }

    if (onItemsUpdate) {
      onItemsUpdate(JSON.parse(JSON.stringify(currentAtomicScheme.value.items)) as SchemeItem[]);
    }
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

    convertToFlatRows(currentAtomicScheme.value.items, undefined, 0).forEach((row) => {
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

  const findItemByRowId = (rowId: string): SchemeItem | null => rowDataToItemMap.value.get(rowId) || null;

  const selectNewItem = (newItem: SchemeItem) => {
    setTimeout(() => {
      if (!gridApi.value || !currentAtomicScheme.value) return;

      const visibleRows = syncRows();
      const targetRow = visibleRows.find((row) => row.id === newItem.id);
      if (!targetRow) return;

      const node = gridApi.value.getRowNode(targetRow.id);
      if (node) {
        node.setSelected(true);
      }
    }, 100);
  };

  const handleCellValueChanged = () => {
    if (!isEditMode.value) return;
    updateGridData();
  };

  const findParentAndSiblings = (
    itemId: string,
  ): { parent: SchemeItem | null; siblings: SchemeItem[]; isRoot: boolean } => {
    if (!currentAtomicScheme.value) {
      return { parent: null, siblings: [], isRoot: false };
    }

    const search = (
      items: SchemeItem[],
      parent: SchemeItem | null = null,
    ): { parent: SchemeItem | null; siblings: SchemeItem[]; isRoot: boolean } | null => {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.id === itemId) {
          return { parent, siblings: items, isRoot: parent === null };
        }
        if (item.children?.length) {
          const result = search(item.children, item);
          if (result) return result;
        }
      }
      return null;
    };

    return search(currentAtomicScheme.value.items, null) || { parent: null, siblings: [], isRoot: true };
  };

  const createNewItem = (overrides: Partial<SchemeItem> = {}): SchemeItem => ({
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    ...overrides,
  });

  const handleAddRootItem = () => {
    if (!currentAtomicScheme.value) return;

    let targetSiblings = currentAtomicScheme.value.items;
    let parentItem: SchemeItem | null = null;

    if (selectedRows.value.length > 0) {
      const selectedRow = selectedRows.value[0];
      const result = findParentAndSiblings(selectedRow.id);
      if (result.siblings.length > 0) {
        targetSiblings = result.siblings;
        parentItem = result.parent;
      }
    }

    const newItem = createNewItem();
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

    const newChildItem = createNewItem({
      name: '新子项目',
      dataType: parentItem.dataType || 'boolean',
      ruleType: parentItem.ruleType || 'boolean_equal',
      operationGuide: parentItem.operationGuide || '',
      param1: parentItem.param1 || '',
      param2: parentItem.param2 || '',
      type: parentItem.type || 'visual',
    });

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
    const confirmed = confirm(
      `确定要删除选中的 ${count} 个项目吗？\n\n删除的项目：${itemNames}\n\n删除后其所有子项目也会被删除，此操作不可恢复！`,
    );
    if (!confirmed) return;

    const removeItem = (items: SchemeItem[], itemId: string): boolean => {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.id === itemId) {
          items.splice(index, 1);
          return true;
        }
        if (item.children?.length && removeItem(item.children, itemId)) {
          return true;
        }
      }
      return false;
    };

    selectedRows.value.forEach((row) => {
      removeItem(currentAtomicScheme.value!.items, row.id);
      expandedRows.value.delete(row.id);
    });

    if (gridApi.value) {
      gridApi.value.deselectAll();
    }

    selectedRows.value = [];
    updateGridData();
  };

  const initGridOptions = () => {
    const visibleRows = currentAtomicScheme.value ? syncRows() : [];

    gridOptions.value = {
      theme: getIxTheme(agGrid),
      tooltipShowDelay: 500,
      columnDefs: createBaseColumnDefs(expandedRows, toggleRow, gridApi, isEditMode),
      defaultColDef: {
        resizable: true,
        sortable: false,
        filter: false,
        editable: false,
      },
      rowData: visibleRows,
      getRowId: (params: any) => params.data.id,
      suppressCellFocus: false,
      singleClickEdit: false,
      animateRows: true,
      getRowStyle: (params: any) => {
        const data = params.data as FlatRow;
        if (!data?.isDetectionItem) {
          return { backgroundColor: 'var(--theme-color-soft)' };
        }
        return { backgroundColor: 'transparent' };
      },
      rowSelection: { mode: 'multiRow' },
      onSelectionChanged: () => {
        if (!gridApi.value) return;
        const selectedNodes = gridApi.value.getSelectedNodes();
        selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
      },
      onGridReady: (params: any) => {
        gridApi.value = params.api;
        if (isEditMode.value) {
          setTimeout(() => {
            updateGridOptionsForEdit(
              gridOptions,
              gridApi,
              findItemByRowId,
              updateGridData,
              selectedRows,
              handleCellValueChanged,
              isEditMode,
            );
          }, 100);
        }
      },
    };
  };

  return {
    gridOptions,
    gridApi,
    expandedRows,
    selectedRows,
    hasSelectedRow,
    toggleRow,
    handleExpandAll,
    handleCollapseAll,
    updateGridData,
    findItemByRowId,
    selectNewItem,
    handleAddRootItem,
    handleAddChildItemToSelected,
    handleDeleteSelectedItems,
    initGridOptions,
  };
}
