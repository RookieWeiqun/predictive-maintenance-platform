<!-- 检测项目步骤 -->
<template>
  <div class="detection-items-step">
    <div v-if="schemeItems.length === 0" class="empty-state">
      <p>暂无检测项目</p>
    </div>
    
    <div v-else class="detection-items-container">
      <DetectionItemGroup
        v-for="(item, index) in schemeItems"
        :key="item.id"
        :item="item"
        :level="0"
        :form-data="formData"
        :detection-data="formData.detectionData"
        @update:detection-data="handleUpdateDetectionData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DetectionItemGroup from './DetectionItemGroup.vue';

const props = defineProps<{
  formData: any;
  schemeItems: any[];
}>();

const emit = defineEmits<{
  'update:detection-data': [data: Record<string, any>];
}>();

const handleUpdateDetectionData = (data: Record<string, any>) => {
  emit('update:detection-data', data);
};
</script>

<style scoped>
.detection-items-step {
  padding: 0;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--theme-color-text-soft);
}

.detection-items-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
