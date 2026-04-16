<!-- 报告数据查看页 -->
<template>
  <div>
    <IxContentHeader header-title="任务详情">
      <IxButton variant="secondary" @click="handleBack">返回</IxButton>
      <IxButton variant="secondary" @click="handleEdit">编辑数据</IxButton>
      <IxButton variant="primary" @click="handleSync">同步到云端</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 任务信息 -->
        <div class="task-info-section">
          <h3 class="section-title">任务信息</h3>
          <div class="task-info-content">
            <div class="task-info-item">
              <span class="label">任务ID：</span>
              <span class="value">{{ taskInfo?.id }}</span>
            </div>
            <div class="task-info-item">
              <span class="label">任务类型：</span>
              <span class="value">{{ taskInfo?.taskTypeLabel }}</span>
            </div>
            <div class="task-info-item">
              <span class="label">设备型号：</span>
              <span class="value">{{ taskInfo?.deviceModel || '-' }}</span>
            </div>
            <div class="task-info-item">
              <span class="label">维护方案：</span>
              <span class="value">{{ taskInfo?.schemeName }}</span>
            </div>
            <div class="task-info-item">
              <span class="label">完成时间：</span>
              <span class="value">{{ completedAt || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 数据展示 -->
        <div v-if="taskData" class="data-sections">
          <!-- 基本信息 -->
          <div class="data-section">
            <h3 class="section-title">基本信息</h3>
            <div class="data-grid">
              <div class="data-item">
                <span class="label">环境温度：</span>
                <span class="value">{{ taskData.formData.environmentData.temperature || '-' }}°C</span>
              </div>
              <div class="data-item">
                <span class="label">环境湿度：</span>
                <span class="value">{{ taskData.formData.environmentData.humidity || '-' }}%</span>
              </div>
              <div class="data-item">
                <span class="label">车间名称：</span>
                <span class="value">{{ taskData.formData.workshopData.workshopName || '-' }}</span>
              </div>
              <div class="data-item">
                <span class="label">柜体类型：</span>
                <span class="value">{{ taskData.formData.cabinetData.cabinetType || '-' }}</span>
              </div>
            </div>
          </div>

          <!-- 设备信息 -->
          <div class="data-section">
            <h3 class="section-title">设备信息</h3>
            <div class="data-grid">
              <div class="data-item">
                <span class="label">设备序列号：</span>
                <span class="value">{{ taskData.formData.deviceSerial || '-' }}</span>
              </div>
              <div class="data-item">
                <span class="label">尺寸：</span>
                <span class="value">{{ taskData.formData.physicalParams.dimensions || '-' }}</span>
              </div>
              <div class="data-item">
                <span class="label">重量：</span>
                <span class="value">{{ taskData.formData.physicalParams.weight || '-' }}kg</span>
              </div>
              <div class="data-item">
                <span class="label">电压：</span>
                <span class="value">{{ taskData.formData.electricalParams.voltage || '-' }}V</span>
              </div>
              <div class="data-item">
                <span class="label">电流：</span>
                <span class="value">{{ taskData.formData.electricalParams.current || '-' }}A</span>
              </div>
              <div class="data-item">
                <span class="label">功率：</span>
                <span class="value">{{ taskData.formData.electricalParams.power || '-' }}W</span>
              </div>
            </div>
          </div>

          <!-- 检测项目 -->
          <div class="data-section">
            <h3 class="section-title">检测项目</h3>
            <div class="detection-items-view">
              <DetectionItemsView
                :scheme-items="schemeItems"
                :detection-data="taskData.formData.detectionData"
              />
            </div>
          </div>

          <!-- 现场照片 -->
          <div v-if="hasPhotos" class="data-section">
            <h3 class="section-title">现场照片</h3>
            <div class="photos-grid">
              <div
                v-for="(photo, index) in allPhotos"
                :key="index"
                class="photo-item"
              >
                <img :src="photo" alt="现场照片" @click="viewPhoto(photo)" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>未找到任务数据</p>
        </div>
      </div>
    </section>

    <!-- 照片查看模态框 -->
    <IxModal
      v-model:visible="showPhotoModal"
      header="查看照片"
      width="800"
    >
      <div class="photo-modal-content">
        <img v-if="currentPhoto" :src="currentPhoto" alt="现场照片" />
      </div>
    </IxModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IxContentHeader, IxButton, IxModal } from "@siemens/ix-vue";
import DetectionItemsView from './components/DetectionItemsView.vue';
import tasksData from '@/mockdata/task/tasks.json';
import { getSchemeById } from '@/mockdata/scheme/index.ts';

const router = useRouter();
const route = useRoute();

const taskId = route.params.taskId as string;

const taskInfo = ref<any>(null);
const taskData = ref<any>(null);
const schemeItems = ref<any[]>([]);
const completedAt = ref<string>('');
const showPhotoModal = ref(false);
const currentPhoto = ref<string>('');

onMounted(() => {
  // 加载任务信息
  const task = tasksData.tasks.find(t => t.id === taskId);
  if (!task) {
    alert('未找到任务');
    router.push('/task/list');
    return;
  }
  
  taskInfo.value = task;
  
  // 加载任务数据
  const taskDataKey = `task_data_${taskId}`;
  try {
    const savedData = localStorage.getItem(taskDataKey);
    if (savedData) {
      taskData.value = JSON.parse(savedData);
      completedAt.value = taskData.value.completedAt 
        ? new Date(taskData.value.completedAt).toLocaleString('zh-CN')
        : '';
    }
  } catch (e) {
    console.error('加载任务数据失败:', e);
  }
  
  // 加载方案数据
  let scheme: any = null;
  const taskSchemeKey = `task_scheme_${taskId}_${task.schemeId}`;
  try {
    const taskSchemeData = localStorage.getItem(taskSchemeKey);
    if (taskSchemeData) {
      scheme = JSON.parse(taskSchemeData);
    }
  } catch (e) {
    console.error('读取项目方案失败:', e);
  }
  
  if (!scheme) {
    scheme = getSchemeById(task.schemeId);
  }
  
  if (scheme && scheme.items) {
    schemeItems.value = scheme.items;
  }
});

const handleBack = () => {
  router.push('/task/list');
};

const handleEdit = () => {
  router.push(`/task/collect/${taskId}`);
};

const handleSync = () => {
  // TODO: 实现同步到云端功能
  alert('数据已同步到云端');
};

// 获取所有照片（包括各步骤的照片）
const allPhotos = computed(() => {
  if (!taskData.value) return [];
  const photos: string[] = [];
  
  // 旧格式：直接存储在 photos 数组中
  if (taskData.value.formData.photos && Array.isArray(taskData.value.formData.photos)) {
    photos.push(...taskData.value.formData.photos);
  }
  
  // 新格式：存储在 stepPhotos 对象中
  if (taskData.value.formData.stepPhotos) {
    Object.values(taskData.value.formData.stepPhotos).forEach((stepPhotos: any) => {
      if (Array.isArray(stepPhotos)) {
        photos.push(...stepPhotos);
      }
    });
  }
  
  return photos;
});

const hasPhotos = computed(() => allPhotos.value.length > 0);

const viewPhoto = (photo: string) => {
  currentPhoto.value = photo;
  showPhotoModal.value = true;
};
</script>

<style scoped>
.page-section {
  padding: 1rem;
}

.page-content {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

.task-info-content {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.5rem;
}

.task-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

.task-info-item .label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--theme-color-text-soft);
}

.task-info-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.task-info-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.data-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.data-section {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.data-section:last-child {
  border-bottom: none;
}

.task-info-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.data-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.data-section {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.data-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--theme-color-text);
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--theme-color-primary);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.data-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

.data-item .label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--theme-color-text-soft);
}

.data-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.detection-items-view {
  padding: 1rem 0;
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.photo-item {
  position: relative;
  width: 100%;
  padding-top: 75%;
  background: var(--theme-color-soft);
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
}

.photo-item img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-item:hover {
  opacity: 0.9;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}

.photo-modal-content {
  text-align: center;
}

.photo-modal-content img {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 0.5rem;
}

@media (max-width: 1024px) {
  .data-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .task-info-content {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .data-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .task-info-content {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
