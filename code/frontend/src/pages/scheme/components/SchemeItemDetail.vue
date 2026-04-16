<!-- 检测项目详情组件 -->
<template>
  <div class="scheme-detail-panel">
    <h3>项目详情</h3>
    <div class="detail-form" v-if="item">
      <IxInput 
        :model-value="item.name" 
        label="项目名称" 
        :readonly="readonly"
      />
      <IxInput 
        :model-value="getTypeLabel(item.type || '')" 
        label="检测类型" 
        :readonly="readonly"
      />
      <IxInput 
        :model-value="item.required !== false ? '必填' : '可选'" 
        label="是否必填" 
        :readonly="readonly"
      />
      <IxInput 
        v-if="item.unit"
        :model-value="item.unit" 
        label="单位" 
        :readonly="readonly"
      />
      <IxInput 
        v-if="item.standardValue !== undefined"
        :model-value="item.standardValue.toString()" 
        label="标准值" 
        :readonly="readonly"
      />
      <IxInput 
        v-if="item.minThreshold !== undefined"
        :model-value="item.minThreshold.toString()" 
        label="最小阈值" 
        :readonly="readonly"
      />
      <IxInput 
        v-if="item.maxThreshold !== undefined"
        :model-value="item.maxThreshold.toString()" 
        label="最大阈值" 
        :readonly="readonly"
      />
      
      <!-- 检测项明细列表 -->
      <div v-if="item.children && item.children.length > 0" class="detail-children">
        <h4>检测项明细</h4>
        <div class="detail-list">
          <div 
            v-for="child in item.children" 
            :key="child.id"
            class="detail-item"
          >
            <div class="detail-item-header">
              <span class="detail-item-name">{{ child.name }}</span>
              <span v-if="child.type" class="detail-item-type">{{ getTypeLabel(child.type) }}</span>
            </div>
            <div v-if="child.unit || child.standardValue !== undefined || child.minThreshold !== undefined || child.maxThreshold !== undefined" class="detail-item-params">
              <span v-if="child.unit">单位: {{ child.unit }}</span>
              <span v-if="child.standardValue !== undefined">标准值: {{ child.standardValue }}</span>
              <span v-if="child.minThreshold !== undefined">最小值: {{ child.minThreshold }}</span>
              <span v-if="child.maxThreshold !== undefined">最大值: {{ child.maxThreshold }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>请选择一个检测项目</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IxInput } from '@siemens/ix-vue';
import { getTypeLabel, type SchemeItem } from '../utils/schemeUtils';

interface Props {
  item: SchemeItem | null;
  readonly?: boolean;
}

withDefaults(defineProps<Props>(), {
  readonly: false,
});
</script>

<style scoped>
.scheme-detail-panel {
  flex: 1;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.scheme-detail-panel h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-children {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.detail-children h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  padding: 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
  border: 1px solid var(--theme-color-soft-border);
}

.detail-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.detail-item-name {
  font-weight: 500;
  font-size: 0.9375rem;
}

.detail-item-type {
  font-size: 0.75rem;
  color: var(--theme-color-weak-text);
  background: var(--theme-color-surface);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.detail-item-params {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--theme-color-weak-text);
}

.detail-item-params span {
  padding: 0.25rem 0.5rem;
  background: var(--theme-color-surface);
  border-radius: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--theme-color-weak-text);
}
</style>
