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
                  <th>任务编号</th>
                  <th>项目</th>
                  <th>设备型号</th>
                  <th>模板</th>
                  <th>下载时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in filteredTasks" :key="task.task_uuid">
                  <td>{{ task.task_no || task.task_uuid }}</td>
                  <td>{{ task.project_name || task.project_id || '-' }}</td>
                  <td>{{ task.device_model || '-' }}</td>
                  <td>{{ task.scheme_name || task.scheme_id || '-' }}</td>
                  <td>{{ formatTime(task.downloaded_at) }}</td>
                  <td>
                    <span class="status-badge" :class="`status-${task.status}`">{{ statusLabel(task.status) }}</span>
                  </td>
                  <td>
                    <div class="task-actions">
                      <IxButton variant="secondary" @click="handleViewScheme(task)">
                        查看方案
                      </IxButton>
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
  offlineOutboxRepository,
  offlineTaskRepository,
  simulateUploadPendingSyncBatch,
} from '@/android';
import type { OfflineTaskRecord } from '@/offline';

const router = useRouter();

const searchText = ref('');
const selectedProject = ref('');
const tasks = ref<OfflineTaskRecord[]>([]);
const pendingOutboxCount = ref(0);

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
    [task.task_no, task.task_uuid, task.device_model, task.scheme_name, task.project_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)),
  );
});

function statusLabel(status: string): string {
  if (status === 'in-progress') return '进行中';
  if (status === 'downloaded') return '已下载';
  if (status === 'completed') return '已完成';
  if (status === 'uploaded') return '已上传';
  if (status === 'synced') return '已同步';
  return '待执行';
}

function formatTime(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN');
}

async function refreshTasks(): Promise<void> {
  try {
    const [localTasks, pendingOutbox] = await Promise.all([
      offlineTaskRepository.listAll(),
      offlineOutboxRepository.listPending(),
    ]);
    tasks.value = localTasks;
    pendingOutboxCount.value = pendingOutbox.length;
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '读取本地离线任务失败' });
  }
}

function handleViewScheme(task: OfflineTaskRecord): void {
  if (!task.scheme_id) {
    showToast({ message: '该离线任务未关联维护模板' });
    return;
  }

  router.push({
    path: `/scheme/view/${task.scheme_id}`,
    query: {
      taskId: task.server_task_id || task.task_uuid,
      returnPath: '/task/list-offline',
      source: 'offline',
    },
  });
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
    const pendingChanges = await offlineOutboxRepository.listPending();
    if (pendingChanges.length === 0) {
      showToast({ message: '当前没有待上传的离线变更' });
      return;
    }
    const result = await simulateUploadPendingSyncBatch();
    showToast({ message: `已模拟上传 ${result.changeCount} 条变更，涉及 ${result.taskCount} 个任务` });
    await refreshTasks();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '读取待同步数据失败' });
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
}

.status-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}

.status-pending {
  background-color: var(--theme-color-soft);
  color: var(--theme-color-text-soft);
}

.status-in-progress {
  background-color: var(--theme-color-primary-soft);
  color: var(--theme-color-primary);
}

.status-downloaded {
  background-color: color-mix(in srgb, var(--theme-color-warning) 14%, white);
  color: var(--theme-color-warning);
}

.status-completed,
.status-synced,
.status-uploaded {
  background-color: var(--theme-color-success-soft);
  color: var(--theme-color-success);
}
</style>