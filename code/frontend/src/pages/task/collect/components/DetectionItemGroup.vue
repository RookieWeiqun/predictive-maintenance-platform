<!-- 检测项目组（递归组件） -->
<template>
  <div class="detection-item-group" :class="`level-${level}`">
    <!-- 如果是检测项目（有type字段），显示输入表单 -->
    <div v-if="item.type && item.required !== undefined" class="detection-item">
      <div class="item-header">
        <span class="item-name">{{ item.name }}</span>
        <span v-if="item.required" class="required-badge">必填</span>
        <span v-if="item.unit" class="unit-badge">{{ item.unit }}</span>
      </div>
      
      <!-- 如果有子项，显示子项 -->
      <div v-if="item.children && item.children.length > 0" class="item-children">
        <DetectionItemGroup
          v-for="child in item.children"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :form-data="formData"
          :detection-data="detectionData"
          @update:detection-data="handleUpdateDetectionData"
        />
      </div>
      
      <!-- 如果没有子项，显示输入框 -->
      <div v-else class="item-input">
        <IxLayoutAuto>
          <IxFieldLabel :htmlFor="`detection-${item.id}`">
            {{ item.name }}
            <span v-if="item.required" class="required">*</span>
            <span v-if="item.unit" class="unit">({{ item.unit }})</span>
          </IxFieldLabel>
          <DetectionItemInput
            :id="`detection-${item.id}`"
            :item="item"
            :value="detectionData[item.id]?.value || ''"
            @update:value="handleUpdateValue(item.id, $event)"
          />
          <IxFieldLabel :htmlFor="`notes-${item.id}`">备注</IxFieldLabel>
          <IxTextarea
            :id="`notes-${item.id}`"
            :model-value="detectionData[item.id]?.notes || ''"
            placeholder="备注（可选）"
            rows="2"
            @update:modelValue="handleUpdateNotes(item.id, $event)"
          />
        </IxLayoutAuto>
      </div>
    </div>
    
    <!-- 如果不是检测项目，只是分组，显示标题并递归子项 -->
    <div v-else class="detection-group">
      <div class="group-header">
        <h4 class="group-title">{{ item.name }}</h4>
      </div>
      <div v-if="item.children && item.children.length > 0" class="group-children">
        <DetectionItemGroup
          v-for="child in item.children"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :form-data="formData"
          :detection-data="detectionData"
          @update:detection-data="handleUpdateDetectionData"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IxTextarea, IxLayoutAuto, IxFieldLabel } from '@siemens/ix-vue';
import DetectionItemInput from './DetectionItemInput.vue';

const props = defineProps<{
  item: any;
  level: number;
  formData: any;
  detectionData: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:detection-data': [data: Record<string, any>];
}>();

const handleUpdateValue = (itemId: string, value: any) => {
  const newData = { ...props.detectionData };
  if (!newData[itemId]) {
    newData[itemId] = {};
  }
  newData[itemId].value = value;
  emit('update:detection-data', newData);
};

const handleUpdateNotes = (itemId: string, notes: string) => {
  const newData = { ...props.detectionData };
  if (!newData[itemId]) {
    newData[itemId] = {};
  }
  newData[itemId].notes = notes;
  emit('update:detection-data', newData);
};

const handleUpdateDetectionData = (data: Record<string, any>) => {
  emit('update:detection-data', data);
};
</script>

<style scoped>
.detection-item-group {
  margin-bottom: 0.5rem;
}

.detection-item {
  padding: 0.75rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  margin-bottom: 0.75rem;
  background: var(--theme-color-background);
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

.required-badge {
  padding: 0.125rem 0.5rem;
  background: var(--theme-color-alarm-soft);
  color: var(--theme-color-alarm);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.unit-badge {
  padding: 0.125rem 0.5rem;
  background: var(--theme-color-info-soft);
  color: var(--theme-color-info);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.required {
  color: var(--theme-color-alarm);
  margin-left: 0.25rem;
}

.unit {
  color: var(--theme-color-text-soft);
  font-weight: normal;
  margin-left: 0.25rem;
}

.item-children {
  margin-top: 0.75rem;
  padding-left: 0.5rem;
}

.item-input {
  margin-top: 0.25rem;
}

.detection-group {
  margin-bottom: 1rem;
}

.group-header {
  margin-bottom: 0.75rem;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin: 0;
}

.group-children {
  margin-left: 0.75rem;
  margin-top: 0.75rem;
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
