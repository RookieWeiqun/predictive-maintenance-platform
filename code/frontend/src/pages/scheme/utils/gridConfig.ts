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
      field: 'typeLabel',
      headerName: '检测类型',
      width: 120,
      valueGetter: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem || !data.type) return '-';
        return getTypeLabel(data.type);
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
      field: 'requiredLabel',
      headerName: '是否必填',
      width: 100,
      valueGetter: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.required !== false ? '必填' : '可选';
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
    } else if (field === 'typeLabel') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agSelectCellEditor';
      colDef.cellEditorParams = { values: ['外观', '电气', '功能', '环境'] };
      colDef.valueGetter = (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem || !data.type) return '-';
        return getTypeLabel(data.type);
      };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            const typeMap: Record<string, string> = {
              '外观': 'visual',
              '电气': 'electrical',
              '功能': 'functional',
              '环境': 'environment',
            };
            const typeValue = Object.entries(typeMap).find(([label]) => label === params.newValue)?.[1];
            if (typeValue) {
              item.type = typeValue;
              rowData.type = typeValue;
              rowData.typeLabel = params.newValue;
              return true;
            }
          }
        }
        return false;
      };
    } else if (field === 'requiredLabel') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agSelectCellEditor';
      colDef.cellEditorParams = { values: ['必填', '可选'] };
      colDef.valueGetter = (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.required !== false ? '必填' : '可选';
      };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            item.required = params.newValue === '必填';
            rowData.required = params.newValue === '必填';
            rowData.requiredLabel = params.newValue;
            updateGridData();
            return true;
          }
        }
        return false;
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
