<!-- 完成确认步骤 -->
<template>
  <div class="confirmation-step">
    <div class="confirmation-content">
      <div class="info-group">
        <h4 class="group-title">任务信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">任务ID：</span>
            <span class="value">{{ taskInfo?.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">任务类型：</span>
            <span class="value">{{ taskInfo?.taskTypeLabel }}</span>
          </div>
          <div class="info-item">
            <span class="label">设备型号：</span>
            <span class="value">{{ taskInfo?.deviceModel || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">维护方案：</span>
            <span class="value">{{ taskInfo?.schemeName }}</span>
          </div>
        </div>
      </div>

      <div class="info-group">
        <h4 class="group-title">数据摘要</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">基本信息：</span>
            <span class="value">{{ hasBasicInfo ? '已填写' : '未填写' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">设备信息：</span>
            <span class="value">{{ hasDeviceInfo ? '已填写' : '未填写' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">检测项目：</span>
            <span class="value">{{ detectionItemsCount }} 项</span>
          </div>
          <div class="summary-item">
            <span class="label">现场照片：</span>
            <span class="value">{{ totalPhotosCount }} 张</span>
          </div>
        </div>
      </div>

      <div class="completion-note">
        <p>请确认所有数据填写完整后，点击"完成任务"按钮提交数据。</p>
        <p class="note-hint">提交后数据将保存，您可以稍后查看任务详情。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  formData: any;
  taskInfo?: any;
}>();

const hasBasicInfo = computed(() => {
  return props.formData.environmentData.temperature ||
         props.formData.workshopData.workshopName ||
         props.formData.cabinetData.cabinetType;
});

const hasDeviceInfo = computed(() => {
  return !!props.formData.deviceSerial;
});

const detectionItemsCount = computed(() => {
  const data = props.formData.detectionData || {};
  return Object.keys(data).filter(key => data[key]?.value).length;
});

const totalPhotosCount = computed(() => {
  const stepPhotos = props.formData.stepPhotos || {};
  let total = 0;
  Object.values(stepPhotos).forEach((photos: any) => {
    if (Array.isArray(photos)) {
      total += photos.length;
    }
  });
  return total;
});
</script>

<style scoped>
.confirmation-step {
  padding: 0;
}

.confirmation-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-group {
  margin-bottom: 0;
}

.group-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.info-grid,
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item,
.summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-weight: 500;
  color: var(--theme-color-text-soft);
}

.value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.completion-note {
  padding: 0.75rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

.completion-note p {
  margin: 0.5rem 0;
  color: var(--theme-color-text);
}

.note-hint {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

@media (max-width: 768px) {
  .info-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
