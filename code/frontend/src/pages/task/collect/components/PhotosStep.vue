<!-- 现场照片步骤 -->
<template>
  <div class="photos-step">
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IxButton } from '@siemens/ix-vue';

const props = defineProps<{
  formData: any;
}>();

const emit = defineEmits<{
  'update:photos': [photos: string[]];
}>();

const localPhotos = ref<string[]>([...props.formData.photos]);
const fileInput = ref<HTMLInputElement | null>(null);

watch(() => props.formData.photos, (newPhotos) => {
  localPhotos.value = [...newPhotos];
}, { deep: true });

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
          emit('update:photos', [...localPhotos.value]);
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
  emit('update:photos', [...localPhotos.value]);
};
</script>

<style scoped>
.photos-step {
  padding: 0;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--theme-color-text-soft);
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.photo-item {
  position: relative;
}

.photo-preview {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 比例 */
  background: var(--theme-color-soft);
  border-radius: 0.5rem;
  overflow: hidden;
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
  width: 2rem;
  height: 2rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
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
