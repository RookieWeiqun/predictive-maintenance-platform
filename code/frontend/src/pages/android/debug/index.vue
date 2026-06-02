<template>
  <div class="android-debug-page">
    <IxContentHeader header-title="Android 离线调试页">
      <IxButton variant="secondary" @click="refreshData">刷新数据</IxButton>
      <IxButton variant="secondary" @click="refreshSyncPayload">预览同步 Payload</IxButton>
      <IxButton variant="primary" @click="goBack">返回任务列表</IxButton>
    </IxContentHeader>

    <section class="page-section">
      <div class="debug-grid">
        <IxCard class="debug-card">
          <h3>运行环境</h3>
          <div class="kv-list">
            <div class="kv-row">
              <span class="kv-key">VITE_API_BASE_URL</span>
              <span class="kv-value">{{ apiBaseUrl }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">运行平台</span>
              <span class="kv-value">{{ platformLabel }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">Native Runtime</span>
              <span class="kv-value">{{ nativeRuntimeLabel }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">最近刷新</span>
              <span class="kv-value">{{ refreshedAt }}</span>
            </div>
          </div>
        </IxCard>

        <IxCard class="debug-card">
          <h3>本地表统计</h3>
          <div class="kv-list">
            <div class="kv-row"><span class="kv-key">offline_task</span><span class="kv-value">{{ tasks.length }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_task 含模板快照</span><span class="kv-value">{{ tasksWithSchemeSnapshotCount }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_task_item</span><span class="kv-value">{{ taskItems.length }}</span></div>
            <div class="kv-row"><span class="kv-key">task_item 含 sort_order</span><span class="kv-value">{{ taskItemsWithSortOrderCount }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_attachment</span><span class="kv-value">{{ attachments.length }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_outbox</span><span class="kv-value">{{ outbox.length }}</span></div>
            <div class="kv-row"><span class="kv-key">task_scheme_* cache</span><span class="kv-value">{{ taskSchemeCaches.length }}</span></div>
            <div class="kv-row"><span class="kv-key">cache 检测项含 sortOrder</span><span class="kv-value">{{ taskSchemeLeafWithSortOrderCount }}</span></div>
          </div>
        </IxCard>

        <IxCard class="debug-card">
          <h3>Outbox 状态</h3>
          <div class="kv-list">
            <div class="kv-row"><span class="kv-key">pending</span><span class="kv-value">{{ outboxStatusCounts.pending }}</span></div>
            <div class="kv-row"><span class="kv-key">synced</span><span class="kv-value">{{ outboxStatusCounts.synced }}</span></div>
            <div class="kv-row"><span class="kv-key">failed</span><span class="kv-value">{{ outboxStatusCounts.failed }}</span></div>
          </div>
        </IxCard>
      </div>

      <div class="debug-sections">
        <IxCard class="debug-card">
          <h3>最近任务（含任务类型）</h3>
          <pre>{{ tasksPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card">
          <h3>最近任务项（显式排序字段）</h3>
          <pre>{{ taskItemsPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card">
          <h3>最近附件</h3>
          <pre>{{ attachmentsPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card">
          <h3>最近 Outbox</h3>
          <pre>{{ outboxPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card debug-card-wide">
          <h3>task_scheme 本地缓存</h3>
          <pre>{{ taskSchemePreview }}</pre>
        </IxCard>

        <IxCard class="debug-card debug-card-wide">
          <h3>task_scheme 检测项排序预览</h3>
          <pre>{{ taskSchemeSortOrderPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card debug-card-wide">
          <h3>待同步 Payload 预览</h3>
          <pre>{{ syncPayloadPreview }}</pre>
        </IxCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IxButton, IxCard, IxContentHeader } from '@siemens/ix-vue';
import {
  previewPendingSyncBatch,
  isAndroidRuntime,
  isNativeMobileRuntime,
  offlineAttachmentRepository,
  offlineOutboxRepository,
  offlineTaskItemRepository,
  offlineTaskRepository,
} from '@/android';
import type {
  OfflineAttachmentRecord,
  OfflineOutboxRecord,
  OfflineTaskItemRecord,
  OfflineTaskRecord,
} from '@/offline';
import { isDetectionItem, type SchemeItem } from '@/pages/scheme/utils/schemeUtils';

const router = useRouter();

const tasks = ref<OfflineTaskRecord[]>([]);
const taskItems = ref<OfflineTaskItemRecord[]>([]);
const attachments = ref<OfflineAttachmentRecord[]>([]);
const outbox = ref<OfflineOutboxRecord[]>([]);
const taskSchemeCaches = ref<Array<{ key: string; data: unknown }>>([]);
const refreshedAt = ref('-');
const syncPayloadPreview = ref('点击“预览同步 Payload”查看当前待同步批次');

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '(未配置)';

const platformLabel = computed(() => (isAndroidRuntime() ? 'android' : 'web'));
const nativeRuntimeLabel = computed(() => (isNativeMobileRuntime() ? 'yes' : 'no'));

const outboxStatusCounts = computed(() => {
  return outbox.value.reduce(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { pending: 0, synced: 0, failed: 0 },
  );
});

const tasksWithSchemeSnapshotCount = computed(
  () => tasks.value.filter((task) => Boolean(task.scheme_snapshot_json)).length,
);

const taskItemsWithSortOrderCount = computed(
  () => taskItems.value.filter((item) => item.sort_order != null).length,
);

function collectDetectionSortOrders(items: SchemeItem[]): Array<{
  id: string;
  name: string;
  sortOrder: number | null;
}> {
  const result: Array<{ id: string; name: string; sortOrder: number | null }> = [];

  const walk = (nodes: SchemeItem[]) => {
    for (const node of nodes || []) {
      if (isDetectionItem(node)) {
        result.push({
          id: node.id,
          name: node.name,
          sortOrder: typeof node.sortOrder === 'number' ? node.sortOrder : null,
        });
        continue;
      }

      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(items);
  return result;
}

function formatPreview<T>(items: T[]): string {
  if (items.length === 0) {
    return '暂无数据';
  }

  return JSON.stringify(items.slice(0, 5), null, 2);
}

function getTaskTypeLabel(inspectionType: string | null | undefined): string {
  return Number(inspectionType) === 1 ? '设备检测' : '外围检测';
}

const tasksPreview = computed(() => formatPreview(tasks.value.map((task) => ({
  task_uuid: task.task_uuid,
  task_no: task.task_no,
  inspection_type: task.inspection_type,
  task_type_label: getTaskTypeLabel(task.inspection_type),
  scheme_id: task.scheme_id,
  scheme_name: task.scheme_name,
  has_scheme_snapshot: Boolean(task.scheme_snapshot_json),
  status: task.status,
  downloaded_at: task.downloaded_at,
  sync_status: task.sync_status,
}))));
const taskItemsPreview = computed(() => formatPreview(taskItems.value.map((item) => ({
  task_item_uuid: item.task_item_uuid,
  item_name: item.item_name,
  server_item_id: item.server_item_id,
  sort_order: item.sort_order,
  category_path: item.category_path,
  execution_status: item.execution_status,
  local_updated_at: item.local_updated_at,
  sync_status: item.sync_status,
}))));
const attachmentsPreview = computed(() => formatPreview(attachments.value));
const outboxPreview = computed(() => formatPreview(outbox.value));
const taskSchemePreview = computed(() => formatPreview(taskSchemeCaches.value));
const taskSchemeSortOrderPreview = computed(() => {
  const rows = taskSchemeCaches.value.flatMap((entry) => {
    const data = entry.data as { items?: SchemeItem[] } | null;
    const items = Array.isArray(data?.items) ? data.items : [];
    return collectDetectionSortOrders(items).map((item) => ({
      cacheKey: entry.key,
      ...item,
    }));
  });

  return formatPreview(rows);
});

const taskSchemeLeafWithSortOrderCount = computed(() => {
  return taskSchemeCaches.value.reduce((count, entry) => {
    const data = entry.data as { items?: SchemeItem[] } | null;
    const items = Array.isArray(data?.items) ? data.items : [];
    return count + collectDetectionSortOrders(items).filter((item) => item.sortOrder != null).length;
  }, 0);
});

function loadTaskSchemeCaches(): Array<{ key: string; data: unknown }> {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith('task_scheme_'))
    .sort()
    .map((key) => {
      const raw = localStorage.getItem(key);
      try {
        return {
          key,
          data: raw ? JSON.parse(raw) : null,
        };
      } catch {
        return {
          key,
          data: raw,
        };
      }
    });
}

async function refreshData(): Promise<void> {
  [tasks.value, taskItems.value, attachments.value, outbox.value] = await Promise.all([
    offlineTaskRepository.listAll(),
    offlineTaskItemRepository.listAll(),
    offlineAttachmentRepository.listAll(),
    offlineOutboxRepository.listAll(),
  ]);
  taskSchemeCaches.value = loadTaskSchemeCaches();

  refreshedAt.value = new Date().toLocaleString();
}

async function refreshSyncPayload(): Promise<void> {
  try {
    syncPayloadPreview.value = await previewPendingSyncBatch();
  } catch (error) {
    syncPayloadPreview.value = error instanceof Error ? error.message : '生成同步 payload 失败';
  }
}

function goBack(): void {
  router.push('/task/list');
}

onMounted(() => {
  void refreshData();
  void refreshSyncPayload();
});
</script>

<style scoped>
.page-section {
  padding: 1rem;
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.debug-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1rem;
}

.debug-card {
  padding: 1rem;
}

.debug-card-wide {
  grid-column: 1 / -1;
}

.debug-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.kv-key {
  color: var(--theme-color-text-soft);
}

.kv-value {
  word-break: break-all;
  text-align: right;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.8125rem;
  line-height: 1.5;
}
</style>
