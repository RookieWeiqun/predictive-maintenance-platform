<template>
  <Modal>
    <template #default="{ dismissModal }">
      <IxModalHeader>{{ data?.title ?? '检测任务' }}</IxModalHeader>
      <IxModalContent>
        <div class="device-task-modal-content">
          <div v-if="!data || data.tasks.length === 0" class="device-task-empty">暂无检测条目（模板与任务均无数据）</div>
          <div v-else class="device-task-list">
            <div
              v-for="(task, tIdx) in data.tasks"
              :key="`${task.taskid}-${task.productid ?? tIdx}`"
              class="device-task-card"
            >
              <div class="device-task-card__head">
                <span>{{ task.taskNo }}</span>
                <span class="device-task-card__meta">{{ task.templateName }} ｜ {{ task.statusText }}</span>
              </div>
              <div v-if="task.items.length > 0" class="device-task-table-wrap">
                <table class="device-task-table">
                  <thead>
                    <tr>
                      <th>分类路径</th>
                      <th>检测项目</th>
                      <th>结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in task.items" :key="`${task.taskid}-${idx}`">
                      <td>{{ item.categorypath || '-' }}</td>
                      <td>{{ item.name || '-' }}</td>
                      <td>{{ item.result || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="device-task-empty">该任务暂无任务项</div>
            </div>
          </div>
        </div>
      </IxModalContent>
      <IxModalFooter>
        <IxButton variant="secondary" @click="dismissModal">关闭</IxButton>
      </IxModalFooter>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import {
  Modal,
  IxModalHeader,
  IxModalContent,
  IxModalFooter,
  IxButton,
} from '@siemens/ix-vue';

type TaskRow = {
  taskid: number;
  productid?: number;
  taskNo: string;
  statusText: string;
  templateName: string;
  items: {
    name: string;
    categorypath: string;
    result: string;
  }[];
};

defineProps<{
  data?: {
    title: string;
    tasks: TaskRow[];
  };
}>();
</script>

<style scoped>
.device-task-modal-content {
  max-height: 65vh;
  overflow: auto;
  padding-right: 0.25rem;
}

.device-task-list {
  display: grid;
  gap: 0.5rem;
}

.device-task-card {
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  background: var(--theme-color-soft);
}

.device-task-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.device-task-card__meta {
  color: var(--theme-color-weak-text);
  font-weight: 400;
  font-size: 0.8125rem;
}

.device-task-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.375rem;
  background: var(--theme-color-background);
}

.device-task-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}

.device-task-table th,
.device-task-table td {
  text-align: left;
  padding: 0.5rem 0.625rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.device-task-table th {
  background: var(--theme-color-soft);
  color: var(--theme-color-weak-text);
  font-weight: 600;
}

.device-task-table tr:last-child td {
  border-bottom: none;
}

.device-task-empty {
  font-size: 0.8125rem;
  color: var(--theme-color-weak-text);
}
</style>
