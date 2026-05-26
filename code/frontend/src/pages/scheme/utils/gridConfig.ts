import { getTypeLabel, mapRequiredToPriority, type FlatRow } from './schemeUtils';
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
          displayName = `${name} (${data.typeLabel})`;
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
      field: 'requiredLabel',
      headerName: '是否必填',
      width: 110,
      valueGetter: (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.required !== false ? '是' : '否';
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
      field: 'thresholdRaw',
      headerName: '规则',
      width: 240,
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
      field: 'displayCondition',
      headerName: '显示条件',
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
      field: 'suggestionRule',
      headerName: '建议规则',
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
      field: 'suggestionContent',
      headerName: '建议内容',
      width: 260,
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
      field: 'hazardContent',
      headerName: '隐患内容',
      width: 260,
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
      field: 'maintenanceDescription',
      headerName: '维护说明',
      width: 240,
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
    } else if (field === 'requiredLabel') {
      colDef.editable = (params: any) => !!params.data.isDetectionItem;
      colDef.cellEditor = 'agSelectCellEditor';
      colDef.cellEditorParams = { values: ['是', '否'] };
      colDef.valueGetter = (params: any) => {
        const data = params.data as FlatRow;
        if (!data.isDetectionItem) return '-';
        return data.required !== false ? '是' : '否';
      };
      colDef.valueSetter = (params: any) => {
        const rowData = params.data as FlatRow;
        if (rowData.isDetectionItem) {
          const item = findItemByRowId(rowData.id);
          if (item) {
            item.required = (params.newValue || '是') !== '否';
            item.priority = mapRequiredToPriority(item.required);
            rowData.required = item.required;
            rowData.requiredLabel = item.required ? '是' : '否';
            rowData.priority = item.priority;
            updateGridData();
            return true;
          }
        }
        return false;
      };
    } else if (
      field === 'operationGuide' ||
      field === 'ruleType' ||
      field === 'thresholdRaw' ||
      field === 'displayCondition' ||
      field === 'suggestionRule' ||
      field === 'suggestionContent' ||
      field === 'hazardContent' ||
      field === 'maintenanceDescription'
    ) {
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
        } else if (field === 'thresholdRaw') {
          item.thresholdRaw = value;
          rowData.thresholdRaw = value;
        } else if (field === 'displayCondition') {
          item.displayCondition = value;
          rowData.displayCondition = value;
        } else if (field === 'suggestionRule') {
          item.suggestionRule = value;
          rowData.suggestionRule = value;
        } else if (field === 'suggestionContent') {
          item.suggestionContent = value;
          rowData.suggestionContent = value;
        } else if (field === 'hazardContent') {
          item.hazardContent = value;
          rowData.hazardContent = value;
        } else if (field === 'maintenanceDescription') {
          item.maintenanceDescription = value;
          rowData.maintenanceDescription = value;
        }
        updateGridData();
        return true;
      };
    }
  });
}
