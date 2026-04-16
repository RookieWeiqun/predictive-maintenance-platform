import { ref, computed, Ref } from 'vue';
import { GridOptions } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { getIxTheme } from '@siemens/ix-aggrid';
import { 
  convertToFlatRows,
  getTypeLabel,
  type AtomicScheme, 
  type SchemeItem, 
  type FlatRow 
} from './schemeUtils';
import { updateGridOptionsForEdit } from './gridEditUtils';

/**
 * 方案表格编辑器的组合式函数
 * 封装了方案编辑表格的通用逻辑
 */
export function useSchemeGridEditor(
  currentAtomicScheme: Ref<AtomicScheme | null>,
  isEditMode: Ref<boolean>,
  onItemsUpdate?: (items: SchemeItem[]) => void
) {
  // ag-grid 配置
  const gridOptions = ref<GridOptions | null>(null);
  const gridApi = ref<any>(null);

  // 展开/收缩状态
  const expandedRows = ref<Set<string>>(new Set());

  // 行数据到原始项的映射（用于快速查找和更新）
  const rowDataToItemMap = ref<Map<string, SchemeItem>>(new Map());

  // 选中的行
  const selectedRows = ref<FlatRow[]>([]);

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

    // 通知外部更新
    if (onItemsUpdate) {
      onItemsUpdate(JSON.parse(JSON.stringify(currentAtomicScheme.value.items)));
    }
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
    if (!isEditMode.value) return;
    updateGridData();
  };

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
    
    // 从第一层开始搜索（跳过根层级）
    for (const firstLevelItem of currentAtomicScheme.value.items) {
      if (firstLevelItem.children) {
        const result = search(firstLevelItem.children, firstLevelItem);
        if (result) return result;
      }
    }
    
    return { parent: null, siblings: [], isRoot: true };
  };

  // 添加项目：添加选中项目的同级项目，如果没有选中就添加根项目（第一层）
  const handleAddRootItem = () => {
    if (!currentAtomicScheme.value) return;
    
    // 确保有第一层
    if (currentAtomicScheme.value.items.length === 0) {
      const firstLevelItem: SchemeItem = {
        id: `level1-${Date.now()}`,
        name: '根层级',
        children: [],
      };
      currentAtomicScheme.value.items.push(firstLevelItem);
    }
    
    const firstLevelItem = currentAtomicScheme.value.items[0];
    if (!firstLevelItem.children) {
      firstLevelItem.children = [];
    }
    
    let targetSiblings: SchemeItem[] = firstLevelItem.children;
    let parentItem: SchemeItem | null = firstLevelItem;
    
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
      type: 'visual',
      required: true,
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
      type: parentItem.type || 'visual',
      required: true,
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
        // 从所有可能的层级中删除（包括第一层的子项）
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
        
        removeFromAllLevels(currentAtomicScheme.value!.items);
        expandedRows.value.delete(row.id);
      });
      
      // 清除选中状态
      if (gridApi.value) {
        gridApi.value.deselectAll();
      }
      selectedRows.value = [];
      updateGridData();
    }
  };

  // 初始化 gridOptions（创建列定义和配置）
  const initGridOptions = () => {
    if (!currentAtomicScheme.value || currentAtomicScheme.value.items.length === 0) return;
    
    const ixTheme = getIxTheme(agGrid);
    const allRows = convertToFlatRows(currentAtomicScheme.value.items, undefined, 0);
    
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
    
    const visibleRows = getVisibleRows(allRows);
    
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
    buildMap(currentAtomicScheme.value.items);
    
    gridOptions.value = {
      theme: ixTheme,
      tooltipShowDelay: 500,
      columnDefs: [
        {
          field: 'name',
          headerName: '检测项目',
          minWidth: 350,
          cellRenderer: (params: any) => {
            const data = params.data as FlatRow;
            const isExpanded = expandedRows.value.has(data.id);
            const expandIcon = data.hasChildren 
              ? (isExpanded ? '▼' : '▶') 
              : '  ';
            const name = data.name;
            const isDetectionItem = data.isDetectionItem;
            
            let displayName = name;
            if (isDetectionItem && data.typeLabel) {
              displayName = `${name} (${data.typeLabel}${data.requiredLabel ? ' [' + data.requiredLabel + ']' : ''})`;
            }
            
            // 编辑模式下，在名称后添加编辑图标
            const editIcon = isEditMode.value ? '<span class="edit-icon" style="margin-left: 8px; cursor: pointer; color: var(--theme-color-primary);">✎</span>' : '';
            
            return `
              <div style="display: flex; align-items: center; padding-left: ${data.level * 20}px;" 
                   data-row-id="${data.id}">
                <span class="expand-icon" style="width: 20px; display: inline-block; user-select: none; cursor: ${data.hasChildren ? 'pointer' : 'default'};" data-action="expand" data-id="${data.id}">${expandIcon}</span>
                <span class="name-text" style="flex: 1; cursor: ${isEditMode.value ? 'text' : 'default'};" data-action="edit" data-id="${data.id}">${displayName}</span>
                ${editIcon}
              </div>
            `;
          },
          onCellClicked: (params: any) => {
            const data = params.data as FlatRow;
            const target = params.event?.target;
            
            if (!target) return;
            
            // 检查点击的是展开图标还是名称区域
            if (target.classList.contains('expand-icon') || target.closest('.expand-icon')) {
              // 点击展开图标，展开/收缩
              if (data.hasChildren) {
                toggleRow(data.id);
              }
              // 阻止事件冒泡，避免触发编辑和行选择
              params.event.stopPropagation();
            } else if (isEditMode.value) {
              // 编辑模式下，点击名称区域或编辑图标，触发编辑
              if (target.classList.contains('name-text') || target.closest('.name-text') || target.classList.contains('edit-icon') || target.closest('.edit-icon')) {
                // 使用 API 启动编辑
                setTimeout(() => {
                  if (gridApi.value) {
                    gridApi.value.startEditingCell({
                      rowIndex: params.node.rowIndex,
                      colKey: 'name'
                    });
                  }
                }, 10);
              }
            }
          },
          // 支持双击编辑（除了展开图标区域）
          onCellDoubleClicked: (params: any) => {
            if (!isEditMode.value) return;
            
            const target = params.event?.target;
            if (!target) return;
            
            // 如果双击的不是展开图标，则触发编辑
            if (!target.classList.contains('expand-icon') && !target.closest('.expand-icon')) {
              const colId = params.column.getColId();
              if (gridApi.value) {
                gridApi.value.startEditingCell({
                  rowIndex: params.node.rowIndex,
                  colKey: colId
                });
              }
            }
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (data.isDetectionItem) {
              return { fontWeight: '500', color: 'var(--theme-color-text)' };
            }
            return { fontWeight: 'normal', color: 'var(--theme-color-weak-text)' };
          },
        },
        {
          field: 'typeLabel',
          headerName: '检测类型',
          width: 120,
          valueGetter: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem || !data.type) return '-';
            return getTypeLabel(data.type);
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'requiredLabel',
          headerName: '是否必填',
          width: 100,
          valueGetter: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) return '-';
            return data.required !== false ? '必填' : '可选';
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'unit',
          headerName: '单位',
          width: 100,
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'standardValue',
          headerName: '标准值',
          width: 120,
          valueFormatter: (params: any) => {
            if (params.value === undefined || params.value === null) return '-';
            return params.value.toString();
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'minThreshold',
          headerName: '最小阈值',
          width: 120,
          valueFormatter: (params: any) => {
            if (params.value === undefined || params.value === null) return '-';
            return params.value.toString();
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'maxThreshold',
          headerName: '最大阈值',
          width: 120,
          valueFormatter: (params: any) => {
            if (params.value === undefined || params.value === null) return '-';
            return params.value.toString();
          },
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'testProcedure',
          headerName: '测试步骤',
          width: 200,
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
        {
          field: 'expectedResult',
          headerName: '预期结果',
          width: 200,
          cellStyle: (params: any) => {
            const data = params.data as FlatRow;
            if (!data.isDetectionItem) {
              return { color: 'var(--theme-color-weak-text)' };
            }
            return { color: 'var(--theme-color-text)' };
          },
        },
      ],
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
        if (!data.isDetectionItem) {
          return { backgroundColor: 'var(--theme-color-soft)' };
        }
        return { backgroundColor: 'transparent' };
      },
      rowSelection: { mode: 'multiRow' },
      onGridReady: (params: any) => {
        gridApi.value = params.api;
        // 配置编辑功能
        setTimeout(() => {
          updateGridOptionsForEdit(
            gridOptions,
            gridApi,
            findItemByRowId,
            updateGridData,
            selectedRows,
            handleCellValueChanged,
            isEditMode
          );
          // 确保选择监听已设置
          if (gridApi.value) {
            gridApi.value.addEventListener('selectionChanged', () => {
              const selectedNodes = gridApi.value.getSelectedNodes();
              selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
            });
          }
        }, 100);
      },
    };
  };

  return {
    // 状态
    gridOptions,
    gridApi,
    expandedRows,
    selectedRows,
    hasSelectedRow,
    
    // 方法
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
