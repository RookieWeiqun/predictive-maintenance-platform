import { Ref } from 'vue';
import { GridOptions } from 'ag-grid-community';
import { configureColumnEditing } from './gridConfig';
import type { SchemeItem, FlatRow } from './schemeUtils';

/**
 * 更新表格配置为编辑模式
 */
export function updateGridOptionsForEdit(
  gridOptions: Ref<GridOptions | null>,
  gridApi: Ref<any>,
  findItemByRowId: (id: string) => SchemeItem | null,
  updateGridData: () => void,
  selectedRows: Ref<FlatRow[]>,
  handleCellValueChanged: () => void,
  isEditMode?: Ref<boolean>
) {
  if (!gridOptions.value || !gridApi.value) return;
  
  const columnDefs = gridOptions.value.columnDefs || [];
  configureColumnEditing(columnDefs, findItemByRowId, updateGridData);
  
  // 使用对象形式的 rowSelection（AG Grid 32.2.1+）
  gridApi.value.setGridOption('rowSelection', { mode: 'multiRow' });
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.setGridOption('singleClickEdit', false);
  gridOptions.value.onCellValueChanged = handleCellValueChanged;
  
  // 监听键盘事件，支持 F2 键触发编辑
  gridOptions.value.onCellKeyDown = (params: any) => {
    const canEdit = isEditMode ? isEditMode.value : true;
    if (params.event.key === 'F2' && canEdit) {
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
    const canEdit = isEditMode ? isEditMode.value : true;
    if (!canEdit) return;
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
  gridOptions.value.onRowClicked = (params: any) => {
    // 点击行时切换选择状态（与 scheme/view/index.vue 的逻辑一致）
    const target = params.event?.target;
    // 如果点击的是展开图标，不处理行选择
    if (target && (target.classList.contains('expand-icon') || target.closest('.expand-icon'))) {
      return;
    }
    // 切换行选择状态
    params.node.setSelected(!params.node.isSelected());
    setTimeout(() => handleSelectionChanged(), 0);
  };
}

/**
 * 更新表格配置为查看模式
 */
export function updateGridOptionsForView(
  gridOptions: Ref<GridOptions | null>,
  gridApi: Ref<any>,
  selectedRows: Ref<FlatRow[]>
) {
  if (!gridOptions.value || !gridApi.value) return;
  
  const columnDefs = gridOptions.value.columnDefs || [];
  columnDefs.forEach((colDef: any) => {
    colDef.editable = false;
  });
  
  // 使用 setGridOption 更新配置
  gridApi.value.setGridOption('rowSelection', undefined);
  gridApi.value.setGridOption('columnDefs', columnDefs);
  gridApi.value.deselectAll();
  gridOptions.value.onCellValueChanged = undefined;
  gridOptions.value.onSelectionChanged = undefined;
  selectedRows.value = [];
}
