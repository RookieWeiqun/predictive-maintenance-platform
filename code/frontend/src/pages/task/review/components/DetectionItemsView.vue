<!-- 检测项目查看组件 -->
<template>
  <div class="detection-items-view">
    <DetectionItemGroupView
      v-for="item in schemeItems"
      :key="item.id"
      :item="item"
      :level="0"
      :detection-data="detectionData"
    />
  </div>
</template>

<script setup lang="ts">
import DetectionItemGroupView from './DetectionItemGroupView.vue';

defineProps<{
  schemeItems: any[];
  detectionData: Record<string, any>;
}>();
</script>

<style scoped>
.detection-items-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
