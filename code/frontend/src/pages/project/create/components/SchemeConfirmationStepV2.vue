<template>
  <div class="step-content full-width">
    <h2 class="step-title">确认方案</h2>
    <p class="step-description">请确认最终的项目信息、匹配结果以及项目维护任务。</p>

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

    <div class="confirmation-section">
      <h3>设备清单</h3>
      <div v-if="equipmentSchemeRows.length > 0" class="table-wrap">
        <table class="match-table">
          <thead>
            <tr>
              <th>产品型号 / 分类</th>
              <th>设备数量</th>
              <th>已选方案</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in equipmentSchemeRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ row.deviceCount }}</td>
              <td>
                <span v-if="resolveEquipmentSelected(row)">{{ resolveEquipmentSelected(row)?.name }}</span>
                <span v-else class="muted">未匹配</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-note">暂无设备匹配记录</div>

      <div v-if="peripheralWorkshopRows.length > 0" class="table-wrap peripheral-wrap">
        <table class="match-table">
          <thead>
            <tr>
              <th>工厂 / 车间</th>
              <th>候选数</th>
              <th>已选外围方案</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in peripheralWorkshopRows" :key="row.key">
              <td>{{ row.label }}</td>
              <td>{{ row.options.length }}</td>
              <td>
                <span v-if="resolvePeripheralSelected(row)">{{ resolvePeripheralSelected(row)?.name }}</span>
                <span v-else class="muted">未匹配</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="confirmation-section">
      <h3>维护任务列表</h3>
      <div class="task-container">
        <div class="task-header">
          <span class="table-title">任务列表</span>
          <span v-if="projectId" class="task-meta">项目ID: {{ projectId }}</span>
        </div>
        <div v-if="!projectId" class="empty-note">
          新建项目在点击“创建项目”后才会生成并关联任务；编辑模式下这里展示真实任务数据。
        </div>
        <AgGridVue
          v-else-if="taskGridOptions"
          style="height: 420px; width: 100%"
          :gridOptions="taskGridOptions"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, withDefaults } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import { ModuleRegistry, AllCommunityModule, type GridOptions } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { inspectionTasksApi, inspectionTemplatesApi, productsApi, taskitemsApi } from '@/api';
import usersData from '@/mockdata/common/users.json';

ModuleRegistry.registerModules([AllCommunityModule]);

type SchemeOption = { id: string; name: string; model?: string };
type EquipmentSchemeRow = { key: string; label: string; deviceCount: number; selectedId: string; options: SchemeOption[] };
type PeripheralWorkshopRow = { key: string; label: string; options: SchemeOption[]; selectedId: string };
type TaskRow = {
  taskid: number;
  taskNo: string;
  serialno: string;
  productModel: string;
  templateName: string;
  statusText: string;
  itemCount: number;
  engineerName: string;
};

interface Props {
  formData: {
    projectName: string;
    customerId: string;
    factory: string;
    projectManagerId: string;
    maintenanceSchemeId: string;
  };
  projectId?: number;
  equipmentSchemeRows?: EquipmentSchemeRow[];
  peripheralWorkshopRows?: PeripheralWorkshopRow[];
  customerOptions?: { label: string; value: string }[];
}

const props = withDefaults(defineProps<Props>(), {
  customerOptions: () => [],
  equipmentSchemeRows: () => [],
  peripheralWorkshopRows: () => [],
});

const equipmentSchemeRows = computed(() => props.equipmentSchemeRows ?? []);
const peripheralWorkshopRows = computed(() => props.peripheralWorkshopRows ?? []);

const getCustomerName = (customerId: string) => {
  const hit = props.customerOptions.find((c) => c.value === customerId);
  return hit?.label || '-';
};

const getProjectManagerName = (managerId: string) => {
  const manager = usersData.users.find((u) => u.id === managerId);
  return manager?.name || '-';
};

const resolveEquipmentSelected = (row: EquipmentSchemeRow) =>
  row.options.find((o) => o.id === row.selectedId) ?? null;

const resolvePeripheralSelected = (row: PeripheralWorkshopRow) =>
  row.options.find((o) => o.id === row.selectedId) ?? null;

const taskGridOptions = ref<GridOptions | null>(null);
const taskGridApi = ref<any>(null);
const taskRows = ref<TaskRow[]>([]);

const statusText = (s: number | undefined): string => {
  if (s === 1) return '进行中';
  if (s === 2) return '已完成';
  if (s === 3) return '未开始';
  return '未知';
};

const engineerName = (userId: number | null | undefined): string => {
  if (userId == null) return '未分配';
  const hit = usersData.users.find((u) => Number.parseInt(String(u.id), 10) === userId);
  return hit?.name || `用户#${userId}`;
};

async function loadTaskRows(projectId: number | undefined): Promise<void> {
  if (!projectId || projectId <= 0) {
    taskRows.value = [];
    return;
  }

  const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId });
  const templateNameCache = new Map<number, string>();
  const productInfoCache = new Map<number, { serialno: string; model: string }>();

  const rows = await Promise.all(
    tasks
      .filter((t) => t.taskid != null && t.taskid > 0)
      .map(async (t) => {
        const taskid = t.taskid as number;
        const templateid = Number(t.templateid || 0);
        const productid = Number(t.productid || 0);

        if (templateid > 0 && !templateNameCache.has(templateid)) {
          try {
            const dto = await inspectionTemplatesApi.getInspectionTemplate(templateid);
            templateNameCache.set(templateid, dto.name?.trim() || `模板 #${templateid}`);
          } catch {
            templateNameCache.set(templateid, `模板 #${templateid}`);
          }
        }

        if (productid > 0 && !productInfoCache.has(productid)) {
          try {
            const products = await productsApi.searchProducts({ productid });
            productInfoCache.set(productid, {
              serialno: products[0]?.serialno?.trim() || '-',
              model: products[0]?.mlfb?.trim() || '-',
            });
          } catch {
            productInfoCache.set(productid, { serialno: '-', model: '-' });
          }
        }

        let itemCount = 0;
        try {
          itemCount = (await taskitemsApi.listTaskitemsByTask(taskid)).length;
        } catch {
          itemCount = 0;
        }

        return {
          taskid,
          taskNo: (t.taskNo ?? '').trim() || `任务#${taskid}`,
          serialno: productid > 0 ? (productInfoCache.get(productid)?.serialno ?? '-') : '-',
          productModel: productid > 0 ? (productInfoCache.get(productid)?.model ?? '-') : '-',
          templateName: templateid > 0 ? (templateNameCache.get(templateid) ?? `模板 #${templateid}`) : '-',
          statusText: statusText(t.status),
          itemCount,
          engineerName: engineerName(t.assigneduserid),
        } as TaskRow;
      }),
  );

  taskRows.value = rows.sort((a, b) => a.taskid - b.taskid);
}

function updateTaskGridData() {
  if (!taskGridApi.value) return;
  taskGridApi.value.setGridOption('rowData', taskRows.value);
}

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);
  taskGridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    suppressCellFocus: true,
    columnDefs: [
      { field: 'taskNo', headerName: '任务编号', minWidth: 220, flex: 1.2 },
      { field: 'productModel', headerName: '产品型号', minWidth: 180, flex: 1 },
      { field: 'serialno', headerName: '产品序列号', minWidth: 160, flex: 1 },
      { field: 'templateName', headerName: '方案名称', minWidth: 220, flex: 1.2 },
      { field: 'statusText', headerName: '状态', width: 120 },
      { field: 'itemCount', headerName: '任务项数量', width: 140, type: 'numericColumn' },
      { field: 'engineerName', headerName: '分配工程师', minWidth: 160, flex: 1 },
    ],
    onGridReady: (params: any) => {
      taskGridApi.value = params.api;
      updateTaskGridData();
    },
  };
});

watch(
  () => props.projectId,
  (pid) => {
    void loadTaskRows(pid);
  },
  { immediate: true },
);

watch(
  () => taskRows.value,
  () => {
    updateTaskGridData();
  },
  { deep: true },
);
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

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 8px;
  background: var(--theme-color-background);
}

.peripheral-wrap {
  margin-top: 12px;
}

.match-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.match-table th,
.match-table td {
  padding: 12px;
  border-bottom: 1px solid var(--theme-color-soft-border);
  text-align: left;
  white-space: nowrap;
}

.match-table th {
  background: var(--theme-color-soft);
  color: var(--theme-color-text-soft);
  font-weight: 600;
}

.match-table tr:last-child td {
  border-bottom: none;
}

.muted {
  color: var(--theme-color-text-soft);
}

.empty-note {
  color: var(--theme-color-text-soft);
  padding: 12px 0;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
}

.task-meta {
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}
</style>
