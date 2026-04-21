<template>
  <div class="step-content full-width">
    <h2 class="step-title">确认方案</h2>
    <p class="step-description">请确认最终的项目信息、设备清单和维护方案。</p>
    
    <!-- 项目信息摘要 -->
    <div class="confirmation-section">
      <h3>项目信息</h3>
      <div class="info-container">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">项目名称：</span>
            <span class="info-value">{{ formData.projectName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">客户名称：</span>
            <span class="info-value">{{ getCustomerName(formData.customerId) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">工厂信息：</span>
            <span class="info-value">{{ formData.factory }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">项目经理：</span>
            <span class="info-value">{{ getProjectManagerName(formData.projectManagerId) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 设备清单摘要 -->
    <div class="confirmation-section">
      <h3>设备清单</h3>
      <div class="table-container">
        <AgGridVue
          v-if="deviceGridOptions"
          style="height: 400px; width: 100%"
          :gridOptions="deviceGridOptions"
        />
      </div>
      <div class="device-assignment-note">
        <p class="note-text">提示：设备分配工程师请在项目详情页面进行设置</p>
      </div>
    </div>
    
    <!-- 维护方案摘要 -->
    <div class="confirmation-section">
      <h3>维护方案</h3>
      <div class="scheme-container">
        <div class="scheme-summary">
          <div class="scheme-info-item">
            <span class="scheme-label">设备检测方案：</span>
            <span class="scheme-value">{{ selectedScheme?.name || '-' }}</span>
          </div>
          <div class="scheme-info-item">
            <span class="scheme-label">适用型号：</span>
            <span class="scheme-value">{{ selectedScheme?.model || '-' }}</span>
          </div>
        </div>
        <div
          v-if="peripheralSchemeSummary && peripheralSchemeSummary.length > 0"
          class="peripheral-summary"
        >
          <h4 class="peripheral-summary-title">各车间外围方案</h4>
          <ul class="peripheral-summary-list">
            <li v-for="(row, idx) in peripheralSchemeSummary" :key="idx">
              <span class="scheme-label">{{ row.workshopLabel }}</span>
              <span class="scheme-value">{{ row.schemeName }}</span>
            </li>
          </ul>
        </div>
        <div v-if="adjustedSchemeTreeModel" class="scheme-preview">
          <div class="tree-header">
            <h4>最终方案预览</h4>
            <div class="tree-actions">
              <IxButton variant="tertiary" size="sm" @click="expandAll">全部展开</IxButton>
              <IxButton variant="tertiary" size="sm" @click="collapseAll">全部收缩</IxButton>
            </div>
          </div>
          <div class="tree-container">
            <IxTree 
              root="root"
              :model="adjustedSchemeTreeModel"
              :context="adjustedSchemeTreeContext || {}"
              @contextChange="({ detail }) => $emit('update-tree-context', detail)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 任务生成预览 -->
    <div class="confirmation-section">
      <h3>任务预览</h3>
      <div class="task-container">
        <p>根据设备清单和调整后的维护方案，将生成 <strong>{{ totalTasks }}</strong> 个维护任务。</p>
        <ul class="task-summary">
          <li v-for="(summary, index) in taskSummary" :key="index">
            {{ summary.engineer }}: {{ summary.count }} 个任务
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, withDefaults } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { TreeModel, TreeContext } from '@siemens/ix';
import {
  IxButton,
  IxSelect,
  IxSelectItem,
  IxTree,
} from "@siemens/ix-vue";
import usersData from '@/mockdata/common/users.json';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';
import { isTemplateApiId } from '@/pages/scheme/utils/schemeInspectionTemplate';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Device {
  id: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  assignedEngineerId?: string;
}

interface Props {
  formData: {
    projectName: string;
    customerId: string;
    factory: string;
    projectManagerId: string;
    maintenanceSchemeId: string;
  };
  devices: Device[];
  adjustedSchemeTreeModel?: TreeModel<any>;
  adjustedSchemeTreeContext?: TreeContext;
  checkedItems: string[];
  /** 与客户下拉同源，用于展示客户名称 */
  customerOptions?: { label: string; value: string }[];
  /** Search 匹配结果，用于展示方案名称与 MLFB */
  matchedSchemeCards?: { id: string; name: string; model: string }[];
  /** 各车间已选外围方案摘要 */
  peripheralSchemeSummary?: { workshopLabel: string; schemeName: string }[];
}

const props = withDefaults(defineProps<Props>(), {
  customerOptions: () => [],
  matchedSchemeCards: () => [],
  peripheralSchemeSummary: () => [],
});

const emit = defineEmits<{
  'update-tree-context': [context: TreeContext];
}>();

const maintenanceEngineerOptions = computed(() => 
  usersData.users
    .filter(u => u.role === 'maintenance_engineer')
    .map(u => ({ label: u.name, value: u.id }))
);

const getCustomerName = (customerId: string) => {
  const hit = props.customerOptions.find((c) => c.value === customerId);
  return hit?.label || '-';
};

const getProjectManagerName = (managerId: string) => {
  const manager = usersData.users.find(u => u.id === managerId);
  return manager?.name || '-';
};

const selectedScheme = computed(() => {
  const id = props.formData.maintenanceSchemeId;
  if (!id) return null;
  const fromApi = props.matchedSchemeCards.find((s) => s.id === id);
  if (fromApi) {
    return { name: fromApi.name, model: fromApi.model };
  }
  if (isTemplateApiId(id)) {
    return { name: `模板 #${id}`, model: '-' };
  }
  const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
  const legacy = schemes.find((s) => s.id === id);
  return legacy ? { name: legacy.name, model: legacy.model } : null;
});

const totalTasks = computed(() => {
  if (props.devices.length === 0 || props.checkedItems.length === 0) return 0;
  return props.devices.reduce((sum, device) => sum + device.quantity * props.checkedItems.length, 0);
});

const taskSummary = computed(() => {
  const summary: Record<string, number> = {};
  props.devices.forEach(device => {
    if (device.assignedEngineerId) {
      const engineer = usersData.users.find(u => u.id === device.assignedEngineerId);
      const engineerName = engineer?.name || '未分配';
      summary[engineerName] = (summary[engineerName] || 0) + device.quantity * props.checkedItems.length;
    }
  });
  return Object.entries(summary).map(([engineer, count]) => ({ engineer, count }));
});

const expandAll = () => {
  if (props.adjustedSchemeTreeModel) {
    const context: TreeContext = {};
    function traverse(nodeId: string) {
      const node = props.adjustedSchemeTreeModel![nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: true, isSelected: false };
        if (node.children) {
          node.children.forEach(childId => traverse(childId));
        }
      }
    }
    if (props.adjustedSchemeTreeModel.root && props.adjustedSchemeTreeModel.root.children) {
      props.adjustedSchemeTreeModel.root.children.forEach(childId => traverse(childId));
    }
    emit('update-tree-context', context);
  }
};

const collapseAll = () => {
  if (props.adjustedSchemeTreeModel) {
    const context: TreeContext = {};
    function traverse(nodeId: string) {
      const node = props.adjustedSchemeTreeModel![nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: false, isSelected: false };
        if (node.children) {
          node.children.forEach(childId => traverse(childId));
        }
      }
    }
    if (props.adjustedSchemeTreeModel.root && props.adjustedSchemeTreeModel.root.children) {
      props.adjustedSchemeTreeModel.root.children.forEach(childId => traverse(childId));
    }
    emit('update-tree-context', context);
  }
};

// ag-grid 配置
const deviceGridOptions = ref<GridOptions | null>(null);
const deviceGridApi = ref<any>(null);

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  deviceGridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    columnDefs: [
      {
        field: 'index',
        headerName: '序号',
        resizable: true,
        sortable: false,
        filter: false,
        width: 80,
        valueGetter: (params: any) => params.node.rowIndex + 1,
      },
      {
        field: 'model',
        headerName: '产品型号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
      },
      {
        field: 'serialNumber',
        headerName: '序列号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        valueGetter: (params: any) => params.data.serialNumber || '-',
      },
      {
        field: 'quantity',
        headerName: '数量',
        resizable: true,
        sortable: true,
        filter: true,
        width: 100,
        type: 'numericColumn',
      },
      {
        field: 'assignedEngineerId',
        headerName: '分配工程师',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        cellRenderer: (params: any) => {
          const selectedId = params.value || '';
          const options = maintenanceEngineerOptions.value;
          const selected = options.find((opt: any) => opt.value === selectedId);
          return selected ? selected.label : '未分配';
        },
        editable: false,
      },
    ],
    suppressCellFocus: true,
    onGridReady: (params: any) => {
      deviceGridApi.value = params.api;
      updateDeviceGridData();
    },
  };
});

// 监听设备变化，更新表格数据
watch(() => props.devices, () => {
  updateDeviceGridData();
}, { deep: true });

const updateDeviceGridData = () => {
  if (!deviceGridApi.value) return;
  deviceGridApi.value.setGridOption('rowData', props.devices);
};
</script>

<style scoped>
.step-content {
  min-height: 400px;
}

.step-content.full-width {
  width: 100%;
  max-width: 100%;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
}

.step-description {
  color: var(--theme-color-text-soft);
  margin-bottom: 1.5rem;
}

.confirmation-section {
  margin-bottom: 2rem;
}

.confirmation-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
}

.info-container,
.scheme-container,
.task-container {
  padding: 1.5rem;
  background: var(--theme-color-soft);
  border-radius: 0.5rem;
  border: 1px solid var(--theme-color-soft-border);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  color: var(--theme-color-text-soft);
  margin-right: 0.5rem;
}

.info-value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.table-container {
  margin-top: 1rem;
}

.device-assignment-note {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--theme-color-info-soft, rgba(0, 84, 166, 0.08));
  border-radius: 0.25rem;
  border-left: 3px solid var(--theme-color-info, #0054a6);
}

.note-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.scheme-summary {
  margin-bottom: 1rem;
}

.scheme-info-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.scheme-label {
  color: var(--theme-color-text-soft);
  margin-right: 0.5rem;
}

.scheme-value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.peripheral-summary {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

.peripheral-summary-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.peripheral-summary-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
}

.peripheral-summary-list li {
  margin-bottom: 0.35rem;
}

.scheme-preview {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tree-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.tree-actions {
  display: flex;
  gap: 0.5rem;
}

.tree-container {
  display: block;
  position: relative;
  width: 100%;
  height: 30rem;
  overflow: auto;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  padding: 1rem;
  background: var(--theme-color-background);
}

.task-summary {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
}

.task-summary li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.task-summary li:last-child {
  border-bottom: none;
}
</style>
