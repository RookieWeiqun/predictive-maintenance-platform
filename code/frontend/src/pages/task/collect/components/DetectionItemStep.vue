<!-- 单个检测项目步骤 -->
<template>
  <div class="detection-item-step">
    <!-- 检测项目数据录入 -->
    <div v-if="!currentPage || currentPage === 'detection'" class="detection-data-section">
      <DetectionItemGroup
        v-for="child in detectionItem.children"
        :key="child.id"
        :item="child"
        :level="0"
        :form-data="formData"
        :detection-data="formData.detectionData"
        @update:detection-data="handleUpdateDetectionData"
      />
    </div>

    <!-- 照片上传 -->
    <div v-if="!currentPage || currentPage === 'photos'" class="photos-section">
      <h3 class="section-title">现场照片</h3>
      <div class="photos-container">
        <div v-if="localPhotos.length === 0" class="empty-state">
          <p>暂无照片，请上传现场照片</p>
        </div>
        
        <div v-else class="photos-grid">
          <div
            v-for="(photo, index) in localPhotos"
            :key="index"
            class="photo-item"
          >
            <div class="photo-preview">
              <img :src="photo" alt="现场照片" />
              <button class="remove-btn" @click="removePhoto(index)">×</button>
            </div>
          </div>
        </div>
        
        <div class="upload-section">
          <IxButton variant="secondary" @click="handleUpload">
            上传照片
          </IxButton>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            style="display: none;"
            @change="handleFileChange"
          />
          <p class="upload-hint">支持多张照片上传，建议每张照片不超过5MB</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { IxButton } from '@siemens/ix-vue';
import DetectionItemGroup from './DetectionItemGroup.vue';

const props = defineProps<{
  formData: any;
  detectionItem: any;
  currentPage?: string;
}>();

const emit = defineEmits<{
  'update:detection-data': [data: Record<string, any>];
  'update:photos': [itemId: string, photos: string[]];
}>();

const itemId = computed(() => props.detectionItem?.id || '');

const localPhotos = ref<string[]>(props.formData.stepPhotos[itemId.value] || []);
const fileInput = ref<HTMLInputElement | null>(null);

watch(() => props.formData.stepPhotos[itemId.value], (newPhotos) => {
  localPhotos.value = [...(newPhotos || [])];
}, { deep: true });

const handleUpdateDetectionData = (data: Record<string, any>) => {
  emit('update:detection-data', data);
};

const handleUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          localPhotos.value.push(result);
          emit('update:photos', itemId.value, [...localPhotos.value]);
        }
      };
      reader.readAsDataURL(file);
    }
  });
  
  // 重置input
  if (target) {
    target.value = '';
  }
};

const removePhoto = (index: number) => {
  localPhotos.value.splice(index, 1);
  emit('update:photos', itemId.value, [...localPhotos.value]);
};
</script>

<style scoped>
.detection-item-step {
  padding: 0;
}

.detection-data-section {
  margin-bottom: 1.5rem;
}

.photos-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--theme-color-text);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--theme-color-text-soft);
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.photo-item {
  position: relative;
}

.photo-preview {
  position: relative;
  width: 100%;
  padding-top: 75%;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
  overflow: hidden;
  border: 1px solid var(--theme-color-soft-border);
}

.photo-preview img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.upload-section {
  padding: 1rem 0;
  text-align: center;
}

.upload-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}
</style>
