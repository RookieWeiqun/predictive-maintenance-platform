import { getTypeLabel, type FlatRow } from './schemeUtils';
import { Ref } from 'vue';

/**
 * 创建基础列定义
 */
export function createBaseColumnDefs(
  expandedRows: Ref<Set<string>>, 
  toggleRow: (id: string) => void,
  gridApi: Ref<any>,
  isEditMode: Ref<boolean>
) {
  return [
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
        
        if (target.classList.contains('expand-icon') || target.closest('.expand-icon')) {
          if (data.hasChildren) {
            toggleRow(data.id);
          }
          params.event.stopPropagation();
        } else if (isEditMode.value) {
          setTimeout(() => {
            if (gridApi.value) {
              gridApi.value.startEditingCell({
                rowIndex: params.node.rowIndex,
                colKey: 'name'
              });
            }
          }, 10);
        }
      },
      onCellDoubleClicked: (params: any) => {
        if (!isEditMode.value) return;
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
      field: 'dataType',
      headerName: '数据类型',
      width: 120,
      valueGetter: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.dataType || (data.type ? getTypeLabel(data.type) : '-');
      },
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null) return '-';
        return String(params.value);
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
      field: 'priority',
      headerName: '权重',
      width: 100,
      valueGetter: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.priority || (data.required !== false ? 'High' : 'Low');
      },
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null) return '-';
        return String(params.value);
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
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null || params.value === '') return '-';
        return String(params.value);
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
      field: 'operationGuide',
      headerName: '操作指导',
      width: 220,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null || params.value === '') return '-';
        return String(params.value);
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
      field: 'ruleType',
      headerName: '规则类型',
      width: 140,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null || params.value === '') return '-';
        return String(params.value);
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
      field: 'param1',
      headerName: '参数1',
      width: 120,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null) return '-';
        return String(params.value);
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
      field: 'param2',
      headerName: '参数2',
      width: 120,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null) return '-';
        return String(params.value);
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
      field: 'expectedResult',
      headerName: '预期结果',
      width: 200,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null || params.value === '') return '-';
        return String(params.value);
      },
      cellStyle: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) {
          return { color: 'var(--theme-color-weak-text)' };
        }
        return { color: 'var(--theme-color-text)' };
      },
    },
  ];
}

/**
 * 配置列定义的编辑功能
 */
export function configureColumnEditing(
  columnDefs: any[],
  findItemByRowId: (id: string) => any,
  updateGridData: () => void
) {
  columnDefs.forEach((colDef: any) => {
    const field = colDef.field;
    
    if (field === 'name') {
      colDef.editable = true;
      colDef.cellEditor = 'agTextCellEditor';
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        const item = findItemByRowId(rowData.id);
        if (item) {
          item.name = params.newValue || '';
          params.data.name = params.newValue;
          return true;
        }
        return false;
      };
    } else if (field === 'dataType') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agSelectCellEditor';
      colDef.cellEditorParams = { values: ['数值', '布尔', '枚举'] };
      colDef.valueGetter = (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.dataType || '-';
      };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            item.dataType = params.newValue || undefined;
            rowData.dataType = params.newValue || undefined;
            return true;
          }
        }
        return false;
      };
    } else if (field === 'priority') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agSelectCellEditor';
      colDef.cellEditorParams = { values: ['High', 'Medium', 'Low'] };
      colDef.valueGetter = (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.priority || (data.required !== false ? 'High' : 'Low');
      };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            item.priority = params.newValue || undefined;
            rowData.priority = params.newValue || undefined;
            item.required = (params.newValue || 'High') !== 'Low';
            rowData.required = item.required;
            updateGridData();
            return true;
          }
        }
        return false;
      };
    } else if (field === 'operationGuide' || field === 'ruleType' || field === 'param1' || field === 'param2') {
      colDef.editable = (params: any) => params.data.isDetectionItem;
      colDef.cellEditor = 'agTextCellEditor';
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (!rowData.isDetectionItem) return false;
        const item = findItemByRowId(rowData.id);
        if (!item) return false;
        const value = params.newValue || undefined;
        if (field === 'operationGuide') {
          item.operationGuide = value;
          rowData.operationGuide = value;
          item.testProcedure = value;
          rowData.testProcedure = value;
        } else if (field === 'ruleType') {
          item.ruleType = value;
          rowData.ruleType = value;
        } else if (field === 'param1') {
          item.param1 = value;
          rowData.param1 = value;
          const n = value ? Number.parseFloat(value) : Number.NaN;
          if (Number.isFinite(n)) {
            item.minThreshold = n;
            rowData.minThreshold = n;
          }
        } else if (field === 'param2') {
          item.param2 = value;
          rowData.param2 = value;
          const n = value ? Number.parseFloat(value) : Number.NaN;
          if (Number.isFinite(n)) {
            item.maxThreshold = n;
            rowData.maxThreshold = n;
          }
        }
        updateGridData();
        return true;
      };
    } else if (field === 'unit') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agTextCellEditor';
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            item.unit = params.newValue || undefined;
            rowData.unit = params.newValue || undefined;
            updateGridData();
            return true;
          }
        }
        return false;
      };
    } else if (field === 'standardValue' || field === 'minThreshold' || field === 'maxThreshold') {
      colDef.editable = (params: any) => params.data.isDetectionItem;
      colDef.cellEditor = 'agNumberCellEditor';
      colDef.cellEditorParams = { precision: 2 };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            const numValue = params.newValue !== null && params.newValue !== undefined && params.newValue !== '' 
              ? parseFloat(params.newValue) 
              : undefined;
            if (field === 'standardValue') {
              item.standardValue = numValue;
              rowData.standardValue = numValue;
            } else if (field === 'minThreshold') {
              item.minThreshold = numValue;
              rowData.minThreshold = numValue;
            } else if (field === 'maxThreshold') {
              item.maxThreshold = numValue;
              rowData.maxThreshold = numValue;
            }
            updateGridData();
            return true;
          }
        }
        return false;
      };
    } else if (field === 'testProcedure' || field === 'expectedResult') {
      colDef.editable = (params: any) => params.data.isDetectionItem;
      colDef.cellEditor = 'agTextCellEditor';
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            if (field === 'testProcedure') {
              item.testProcedure = params.newValue || undefined;
              rowData.testProcedure = params.newValue || undefined;
            } else if (field === 'expectedResult') {
              item.expectedResult = params.newValue || undefined;
              rowData.expectedResult = params.newValue || undefined;
            }
            updateGridData();
            return true;
          }
        }
        return false;
      };
    }
  });
}
