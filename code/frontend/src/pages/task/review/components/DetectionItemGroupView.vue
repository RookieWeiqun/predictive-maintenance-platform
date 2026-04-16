<!-- 检测项目组查看（递归组件） -->
<template>
  <div class="detection-item-group-view" :class="`level-${level}`">
    <!-- 如果是检测项目（有type字段），显示数据 -->
    <div v-if="item.type && item.required !== undefined" class="detection-item-view">
      <div class="item-header">
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.unit" class="unit-badge">{{ item.unit }}</span>
      </div>
      
      <!-- 如果有子项，显示子项 -->
      <div v-if="item.children && item.children.length > 0" class="item-children">
        <DetectionItemGroupView
          v-for="child in item.children"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :detection-data="detectionData"
        />
      </div>
      
      <!-- 如果没有子项，显示数据值 -->
      <div v-else class="item-value">
        <div class="value-display">
          <span class="value-label">检测值：</span>
          <span class="value-text">{{ getDisplayValue(item.id) }}</span>
        </div>
        <div v-if="getNotes(item.id)" class="notes-display">
          <span class="notes-label">备注：</span>
          <span class="notes-text">{{ getNotes(item.id) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 如果不是检测项目，只是分组，显示标题并递归子项 -->
    <div v-else class="detection-group-view">
      <div class="group-header">
        <h4 class="group-title">{{ item.name }}</h4>
      </div>
      <div v-if="item.children && item.children.length > 0" class="group-children">
        <DetectionItemGroupView
          v-for="child in item.children"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :detection-data="detectionData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  item: any;
  level: number;
  detectionData: Record<string, any>;
}>();

const getDisplayValue = (itemId: string) => {
  const data = props.detectionData[itemId];
  if (!data || !data.value) {
    return '-';
  }
  
  // 根据类型格式化显示
  if (typeof data.value === 'boolean') {
    return data.value ? '是' : '否';
  }
  
  return data.value;
};

const getNotes = (itemId: string) => {
  const data = props.detectionData[itemId];
  return data?.notes || '';
};
</script>

<style scoped>
.detection-item-group-view {
  margin-bottom: 0.75rem;
}

.detection-item-view {
  padding: 0.75rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
  border: 1px solid var(--theme-color-soft-border);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.item-name {
  font-weight: 500;
  color: var(--theme-color-text);
}

.unit-badge {
  padding: 0.125rem 0.5rem;
  background: var(--theme-color-info-soft);
  color: var(--theme-color-info);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.item-children {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.item-value {
  margin-top: 0.25rem;
}

.value-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.value-label {
  font-weight: 500;
  color: var(--theme-color-text-soft);
}

.value-text {
  color: var(--theme-color-text);
  font-weight: 500;
}

.notes-display {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--theme-color-background);
  border-radius: 0.25rem;
}

.notes-label {
  font-weight: 500;
  color: var(--theme-color-text-soft);
  white-space: nowrap;
}

.notes-text {
  color: var(--theme-color-text);
  flex: 1;
}

.detection-group-view {
  margin-bottom: 1rem;
}

.group-header {
  margin-bottom: 1rem;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin: 0;
}

.group-children {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.level-0 .group-title {
  font-size: 1.25rem;
}

.level-1 .group-title {
  font-size: 1.125rem;
}

.level-2 .group-title {
  font-size: 1rem;
}
</style>
