<template>
  <div class="android-debug-page">
    <IxContentHeader header-title="Android 离线调试页">
      <IxButton variant="secondary" @click="refreshData">刷新数据</IxButton>
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
            <div class="kv-row"><span class="kv-key">offline_task_item</span><span class="kv-value">{{ taskItems.length }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_attachment</span><span class="kv-value">{{ attachments.length }}</span></div>
            <div class="kv-row"><span class="kv-key">offline_outbox</span><span class="kv-value">{{ outbox.length }}</span></div>
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
          <h3>最近任务</h3>
          <pre>{{ tasksPreview }}</pre>
        </IxCard>

        <IxCard class="debug-card">
          <h3>最近任务项</h3>
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
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IxButton, IxCard, IxContentHeader } from '@siemens/ix-vue';
import {
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

const router = useRouter();

const tasks = ref<OfflineTaskRecord[]>([]);
const taskItems = ref<OfflineTaskItemRecord[]>([]);
const attachments = ref<OfflineAttachmentRecord[]>([]);
const outbox = ref<OfflineOutboxRecord[]>([]);
const refreshedAt = ref('-');

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

function formatPreview<T>(items: T[]): string {
  if (items.length === 0) {
    return '暂无数据';
  }

  return JSON.stringify(items.slice(0, 5), null, 2);
}

const tasksPreview = computed(() => formatPreview(tasks.value));
const taskItemsPreview = computed(() => formatPreview(taskItems.value));
const attachmentsPreview = computed(() => formatPreview(attachments.value));
const outboxPreview = computed(() => formatPreview(outbox.value));

async function refreshData(): Promise<void> {
  [tasks.value, taskItems.value, attachments.value, outbox.value] = await Promise.all([
    offlineTaskRepository.listAll(),
    offlineTaskItemRepository.listAll(),
    offlineAttachmentRepository.listAll(),
    offlineOutboxRepository.listAll(),
  ]);

  refreshedAt.value = new Date().toLocaleString();
}

function goBack(): void {
  router.push('/task/list');
}

onMounted(() => {
  void refreshData();
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
