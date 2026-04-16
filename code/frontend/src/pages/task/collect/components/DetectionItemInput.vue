<!-- 检测项目输入组件 -->
<template>
  <div class="detection-item-input">
    <!-- 环境类型：数字输入 -->
    <IxInput
      v-if="item.type === 'environment'"
      :id="id"
      :model-value="value"
      :placeholder="getPlaceholder()"
      type="number"
      @update:modelValue="$emit('update:value', $event)"
    />
    
    <!-- 电气类型：数字输入 -->
    <IxInput
      v-else-if="item.type === 'electrical'"
      :id="id"
      :model-value="value"
      :placeholder="getPlaceholder()"
      type="number"
      @update:modelValue="$emit('update:value', $event)"
    />
    
    <!-- 视觉类型：选择框（是/否） -->
    <IxSelect
      v-else-if="item.type === 'visual'"
      :id="id"
      :model-value="value"
      :placeholder="getPlaceholder()"
      @update:modelValue="$emit('update:value', $event)"
    >
      <IxSelectItem value="yes" label="是" />
      <IxSelectItem value="no" label="否" />
      <IxSelectItem value="normal" label="正常" />
      <IxSelectItem value="abnormal" label="异常" />
    </IxSelect>
    
    <!-- 其他类型：文本输入 -->
    <IxInput
      v-else
      :id="id"
      :model-value="value"
      :placeholder="getPlaceholder()"
      @update:modelValue="$emit('update:value', $event)"
    />
    
    <!-- 显示标准值和阈值 -->
    <div v-if="item.standardValue || item.minThreshold || item.maxThreshold" class="value-hints">
      <span v-if="item.standardValue" class="hint-item">
        标准值: {{ item.standardValue }}{{ item.unit || '' }}
      </span>
      <span v-if="item.minThreshold !== undefined" class="hint-item">
        最小值: {{ item.minThreshold }}{{ item.unit || '' }}
      </span>
      <span v-if="item.maxThreshold !== undefined" class="hint-item">
        最大值: {{ item.maxThreshold }}{{ item.unit || '' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IxInput, IxSelect, IxSelectItem } from '@siemens/ix-vue';

const props = defineProps<{
  id?: string;
  item: any;
  value: any;
}>();

defineEmits<{
  'update:value': [value: any];
}>();

const getPlaceholder = () => {
  if (props.item.unit) {
    return `请输入${props.item.name}（单位：${props.item.unit}）`;
  }
  return `请输入${props.item.name}`;
};
</script>

<style scoped>
.detection-item-input {
  width: 100%;
}

.value-hints {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  flex-wrap: wrap;
}

.hint-item {
  padding: 0.25rem 0.5rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}
</style>
