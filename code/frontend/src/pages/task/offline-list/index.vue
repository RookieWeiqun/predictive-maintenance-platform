<template>
  <div>
    <IxContentHeader header-title="维护任务清单 - 离线版">
      <IxButton variant="secondary" @click="refreshTasks">
        刷新本地任务
      </IxButton>
      <IxButton variant="secondary" @click="handleOpenAndroidDebug">
        Android调试
      </IxButton>
      <IxButton variant="primary" @click="handleUploadData">
        上传数据
      </IxButton>
    </IxContentHeader>

    <section class="page-section">
      <div class="page-content">
        <div class="filter-section">
          <IxInput
            v-model="searchText"
            placeholder="搜索任务编号、设备型号或方案名称"
            style="flex: 1; max-width: 320px;"
          />
          <IxSelect
            v-model="selectedProject"
            placeholder="按本地项目筛选"
            style="min-width: 260px;"
          >
            <IxSelectItem
              v-for="project in projectList"
              :key="project.id"
              :label="project.label"
              :value="project.id"
            />
          </IxSelect>
        </div>

        <div class="summary-bar">
          <IxCard class="summary-card">
            <div class="summary-label">本地任务</div>
            <div class="summary-value">{{ filteredTasks.length }}</div>
          </IxCard>
          <IxCard class="summary-card">
            <div class="summary-label">待同步</div>
            <div class="summary-value">{{ pendingOutboxCount }}</div>
          </IxCard>
          <IxCard class="summary-card">
            <div class="summary-label">可上传任务</div>
            <div class="summary-value">{{ pendingTaskCount }}</div>
          </IxCard>
          <IxCard class="summary-card">
            <div class="summary-label">已勾选</div>
            <div class="summary-value">{{ selectedTaskUuids.size }}</div>
          </IxCard>
        </div>

        <div class="table-container">
          <div class="table-header">
            <div class="table-title">离线任务列表</div>
          </div>

          <div v-if="filteredTasks.length === 0" class="empty-state">
            <p>本地暂无离线任务。请先到“任务列表-在线版”下载任务包。</p>
          </div>

          <div v-else class="offline-table-wrap">
            <table class="offline-table">
              <thead>
                <tr>
                  <th class="checkbox-col">
                    <input
                      type="checkbox"
                      :checked="allPendingVisibleSelected"
                      :disabled="pendingVisibleTaskIds.length === 0"
                      @change="toggleSelectAllVisible($event)"
                    />
                  </th>
                  <th>任务编号</th>
                  <th>项目</th>
                  <th>任务类型</th>
                  <th>设备型号</th>
                  <th>序列号</th>
                  <th>检查人员</th>
                  <th>模板</th>
                  <th>下载时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in filteredTasks" :key="task.task_uuid">
                  <td class="checkbox-col">
                    <input
                      type="checkbox"
                      :checked="selectedTaskUuids.has(task.task_uuid)"
                      :disabled="!isTaskPending(task.task_uuid)"
                      @change="toggleTaskSelection(task.task_uuid, $event)"
                    />
                  </td>
                  <td>{{ task.task_no || task.task_uuid }}</td>
                  <td>{{ task.project_name || task.project_id || '-' }}</td>
                  <td>{{ getTaskTypeLabel(task.inspection_type) }}</td>
                  <td>{{ task.device_model || '-' }}</td>
                  <td>{{ task.serial_no || '-' }}</td>
                  <td>{{ task.assigned_user_name || '-' }}</td>
                  <td>{{ task.scheme_name || task.scheme_id || '-' }}</td>
                  <td>{{ formatTime(task.downloaded_at) }}</td>
                  <td>
                    <div class="task-status-progress">
                      <div class="task-status-progress-header">
                        <span>{{ getOfflineLifecycleMeta(task.status).label }}</span>
                        <span>{{ getOfflineLifecycleMeta(task.status).percent }}%</span>
                      </div>
                      <div class="task-status-progress-track">
                        <div
                          class="task-status-progress-fill"
                          :class="`task-status-progress-${getOfflineLifecycleMeta(task.status).key}`"
                          :style="{ width: `${getOfflineLifecycleMeta(task.status).percent}%` }"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="task-actions">
                      <IxButton variant="primary" @click="handleExecuteTask(task)">
                        执行任务
                      </IxButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IxButton, IxCard, IxContentHeader, IxInput, IxSelect, IxSelectItem, showToast } from '@siemens/ix-vue';
import {
  buildTaskSyncPayload,
  offlineOutboxRepository,
  offlineTaskRepository,
  uploadPendingTasks,
} from '@/android';
import type { OfflineTaskRecord } from '@/offline';

const router = useRouter();

const searchText = ref('');
const selectedProject = ref('');
const tasks = ref<OfflineTaskRecord[]>([]);
const pendingOutboxCount = ref(0);
const pendingTaskUuids = ref<Set<string>>(new Set());
const selectedTaskUuids = ref<Set<string>>(new Set());

const projectList = computed(() => {
  const map = new Map<string, string>();
  for (const task of tasks.value) {
    const id = task.project_id || '';
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, task.project_name || id);
    }
  }

  return [...map.entries()].map(([id, name]) => ({
    id,
    label: `${id} - ${name}`,
  }));
});

const filteredTasks = computed(() => {
  let current = tasks.value;

  if (selectedProject.value) {
    current = current.filter((task) => task.project_id === selectedProject.value);
  }

  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) {
    return current;
  }

  return current.filter((task) =>
    [task.task_no, task.task_uuid, task.device_model, task.serial_no, task.assigned_user_name, task.scheme_name, task.project_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)),
  );
});

const pendingTaskCount = computed(() => pendingTaskUuids.value.size);

const pendingVisibleTaskIds = computed(() =>
  filteredTasks.value
    .filter((task) => pendingTaskUuids.value.has(task.task_uuid))
    .map((task) => task.task_uuid),
);

const allPendingVisibleSelected = computed(() =>
  pendingVisibleTaskIds.value.length > 0 && pendingVisibleTaskIds.value.every((taskUuid) => selectedTaskUuids.value.has(taskUuid)),
);

function getTaskTypeLabel(inspectionType: string | null | undefined): string {
  return Number(inspectionType) === 1 ? '设备检测' : '外围检测';
}

function getOfflineLifecycleMeta(status: string): {
  key: 'pending' | 'in-progress' | 'uploaded';
  label: string;
  percent: number;
} {
  if (status === 'uploaded' || status === 'completed' || status === 'synced') {
    return { key: 'uploaded', label: '已上传', percent: 100 };
  }
  if (status === 'in-progress') {
    return { key: 'in-progress', label: '进行中', percent: 55 };
  }
  return { key: 'pending', label: '待执行', percent: 20 };
}

function formatTime(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
}

function isBlank(value: string | null | undefined): boolean {
  return !String(value ?? '').trim();
}

async function refreshTasks(): Promise<void> {
  try {
    const [localTasks, pendingOutbox] = await Promise.all([
      offlineTaskRepository.listAll(),
      offlineOutboxRepository.listPending(),
    ]);
    const payloads = await Promise.all(localTasks.map((task) => buildTaskSyncPayload(task.task_uuid)));
    tasks.value = localTasks;
    pendingOutboxCount.value = pendingOutbox.length;
    pendingTaskUuids.value = new Set(
      payloads
        .filter((payload): payload is NonNullable<typeof payload> => payload != null)
        .map((payload) => payload.task_uuid),
    );
    selectedTaskUuids.value = new Set(
      [...selectedTaskUuids.value].filter((taskUuid) => localTasks.some((task) => task.task_uuid === taskUuid)),
    );
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '读取本地离线任务失败' });
  }
}

function isTaskPending(taskUuid: string): boolean {
  return pendingTaskUuids.value.has(taskUuid);
}

function toggleTaskSelection(taskUuid: string, event: Event): void {
  const target = event.target as HTMLInputElement;
  const next = new Set(selectedTaskUuids.value);
  if (target.checked) {
    next.add(taskUuid);
  } else {
    next.delete(taskUuid);
  }
  selectedTaskUuids.value = next;
}

function toggleSelectAllVisible(event: Event): void {
  const target = event.target as HTMLInputElement;
  const next = new Set(selectedTaskUuids.value);
  for (const taskUuid of pendingVisibleTaskIds.value) {
    if (target.checked) {
      next.add(taskUuid);
    } else {
      next.delete(taskUuid);
    }
  }
  selectedTaskUuids.value = next;
}

function handleExecuteTask(task: OfflineTaskRecord): void {
  const tid = task.server_task_id || task.task_uuid;
  router.push({
    path: `/task/collect/${tid}`,
    query: { source: 'offline' },
  });
}

async function handleUploadData(): Promise<void> {
  try {
    const selectedTaskIds = [...selectedTaskUuids.value].filter((taskUuid) => pendingTaskUuids.value.has(taskUuid));
    if (selectedTaskIds.length === 0) {
      showToast({ message: '请先勾选至少一个待上传任务' });
      return;
    }

    const selectedTasks = tasks.value.filter((task) => selectedTaskIds.includes(task.task_uuid));
    const invalidTasks = selectedTasks.filter(
      (task) => isBlank(task.serial_no) || isBlank(task.assigned_user_name),
    );
    if (invalidTasks.length > 0) {
      const names = invalidTasks
        .slice(0, 3)
        .map((task) => task.task_no || task.task_uuid)
        .join('、');
      const suffix = invalidTasks.length > 3 ? ' 等任务' : '';
      showToast({ message: `请先补全序列号和检查人员：${names}${suffix}` });
      return;
    }

    const result = await uploadPendingTasks(selectedTaskIds);
    if (result.changeCount === 0) {
      showToast({ message: '所选任务当前没有待上传变更' });
      return;
    }
    showToast({ message: `已上传 ${result.changeCount} 条变更，涉及 ${result.taskCount} 个任务` });
    selectedTaskUuids.value = new Set();
    await refreshTasks();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '上传离线任务失败' });
  }
}

function handleOpenAndroidDebug(): void {
  router.push('/android/debug');
}

onMounted(() => {
  void refreshTasks();
});
</script>

<style scoped>
.page-section {
  padding-top: 1rem;
}

.page-content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  margin-bottom: 1rem;
}

.summary-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  min-width: 180px;
  padding: 1rem;
}

.summary-label {
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.summary-value {
  margin-top: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.table-container {
  margin-top: 1rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.5rem 0.5rem 0 0;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.empty-state {
  padding: 2rem;
  background: var(--theme-color-surface);
  border: 1px solid var(--theme-color-soft-border);
  border-top: 0;
  color: var(--theme-color-text-soft);
}

.offline-table-wrap {
  background: var(--theme-color-surface);
  border: 1px solid var(--theme-color-soft-border);
  border-top: 0;
  overflow-x: auto;
}

.offline-table {
  width: 100%;
  border-collapse: collapse;
}

.offline-table th,
.offline-table td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--theme-color-soft-border);
  vertical-align: middle;
}

.checkbox-col {
  width: 3rem;
  text-align: center;
}

.offline-table th {
  background: var(--theme-color-soft);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.offline-table td {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.task-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.sync-tag {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0 0.625rem;
  border-radius: 999px;
  background: var(--theme-color-soft);
  color: var(--theme-color-text-soft);
  font-size: 0.75rem;
}

.sync-tag-pending {
  background: color-mix(in srgb, var(--theme-color-warning) 16%, white);
  color: var(--theme-color-warning);
}

.task-status-progress {
  min-width: 160px;
}

.task-status-progress-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
  color: var(--theme-color-text);
}

.task-status-progress-track {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--theme-color-soft);
  overflow: hidden;
}

.task-status-progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease;
}

.task-status-progress-pending {
  background: color-mix(in srgb, var(--theme-color-warning) 70%, white);
}

.task-status-progress-in-progress {
  background: color-mix(in srgb, var(--theme-color-primary) 80%, white);
}

.task-status-progress-uploaded {
  background: color-mix(in srgb, var(--theme-color-success) 80%, white);
}
</style>