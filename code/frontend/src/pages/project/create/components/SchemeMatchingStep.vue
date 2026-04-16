<template>
  <div class="step-content">
    <h2 class="step-title">匹配维护方案</h2>
    <p class="step-description">系统将根据您选择的设备信息自动匹配维护方案。</p>
    
    <div v-if="devices.length === 0" class="empty-state">
      <p>请先完成"选择设备"步骤</p>
    </div>
    <div v-else>
      <!-- 匹配结果 -->
      <div v-if="matchedSchemes.length > 0" class="matched-schemes">
        <div class="schemes-header">
          <h3>匹配到的维护方案</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">设备总数</span>
              <span class="stat-value">{{ totalDeviceQuantity }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">设备型号数</span>
              <span class="stat-value">{{ uniqueModels.length }}</span>
            </div>
          </div>
        </div>
        <div class="scheme-cards-grid">
          <IxCard
            v-for="scheme in matchedSchemes"
            :key="scheme.id"
            :variant="selectedSchemeId === scheme.id ? 'primary' : 'outline'"
            :selected="selectedSchemeId === scheme.id"
            @click="$emit('select-scheme', scheme.id)"
            class="scheme-card"
          >
            <div class="scheme-card-content">
              <h4 class="scheme-title">{{ scheme.name }}</h4>
              <p class="scheme-info">
                <span class="info-label">适用型号：</span>
                <span class="info-value">{{ scheme.model }}</span>
              </p>
              <p class="scheme-description">标准维护方案</p>
            </div>
          </IxCard>
        </div>
      </div>
      
      <!-- 方案预览 -->
      <div v-if="schemeTreeModel" class="scheme-preview">
        <div class="tree-header">
          <h3>方案预览</h3>
          <div class="tree-actions">
            <IxButton variant="tertiary" size="sm" @click="expandAll">全部展开</IxButton>
            <IxButton variant="tertiary" size="sm" @click="collapseAll">全部收缩</IxButton>
          </div>
        </div>
        <div class="tree-container">
          <IxTree 
            root="root"
            :model="schemeTreeModel"
            :context="schemeTreeContext || defaultExpandedContext"
            @contextChange="({ detail }) => $emit('update-tree-context', detail)"
          />
        </div>
      </div>
      <div v-else-if="selectedSchemeId" class="scheme-preview">
        <h3>方案预览</h3>
        <p style="color: var(--theme-color-text-soft);">方案数据加载中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { TreeModel, TreeContext } from '@siemens/ix';
import {
  IxButton,
  IxCard,
  IxTree,
} from "@siemens/ix-vue";
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';

interface Device {
  id: string;
  model: string;
  quantity: number;
}

interface Props {
  devices: Device[];
  selectedSchemeId: string;
  schemeTreeModel?: TreeModel<any>;
  schemeTreeContext?: TreeContext;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'select-scheme': [schemeId: string];
  'update-tree-context': [context: TreeContext];
}>();

const totalDeviceQuantity = computed(() => {
  return props.devices.reduce((sum, device) => sum + device.quantity, 0);
});

const uniqueModels = computed(() => {
  const models = props.devices.map(d => d.model).filter(Boolean);
  return [...new Set(models)];
});

const matchedSchemes = computed(() => {
  if (props.devices.length === 0) return [];
  
  const models = props.devices.map(d => d.model).filter(Boolean);
  if (models.length === 0) return [];
  
  const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
  return schemes.filter(s => 
    models.includes(s.model)
  );
});

// 默认展开的上下文
const defaultExpandedContext = ref<TreeContext>({});

// 当方案树模型变化时，默认展开所有节点
watch(() => props.schemeTreeModel, (newModel: TreeModel<any> | undefined) => {
  if (!newModel) return;
  
  const model = newModel; // 保存到局部变量，确保类型推断正确
  const context: TreeContext = {};
  function traverse(nodeId: string) {
    const node = model[nodeId];
    if (node && node.hasChildren) {
      context[nodeId] = { isExpanded: true, isSelected: false };
      if (node.children) {
        node.children.forEach(childId => traverse(childId));
      }
    }
  }
  if (model.root && model.root.children) {
    model.root.children.forEach(childId => traverse(childId));
  }
  defaultExpandedContext.value = context;
  emit('update-tree-context', context);
}, { immediate: true });

const expandAll = () => {
  if (props.schemeTreeModel) {
    const context: TreeContext = {};
    function traverse(nodeId: string) {
      const node = props.schemeTreeModel![nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: true, isSelected: false };
        if (node.children) {
          node.children.forEach(childId => traverse(childId));
        }
      }
    }
    if (props.schemeTreeModel.root && props.schemeTreeModel.root.children) {
      props.schemeTreeModel.root.children.forEach(childId => traverse(childId));
    }
    emit('update-tree-context', context);
  }
};

const collapseAll = () => {
  if (props.schemeTreeModel) {
    const context: TreeContext = {};
    function traverse(nodeId: string) {
      const node = props.schemeTreeModel![nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: false, isSelected: false };
        if (node.children) {
          node.children.forEach(childId => traverse(childId));
        }
      }
    }
    if (props.schemeTreeModel.root && props.schemeTreeModel.root.children) {
      props.schemeTreeModel.root.children.forEach(childId => traverse(childId));
    }
    emit('update-tree-context', context);
  }
};
</script>

<style scoped>
.step-content {
  min-height: 400px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
}

.step-description {
  color: var(--theme-color-text-soft);
  margin-bottom: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}

.matched-schemes {
  margin-bottom: 2rem;
}

.schemes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.schemes-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.summary-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  line-height: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--theme-color-primary, #0054a6);
  line-height: 1.2;
}

.scheme-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

.scheme-card {
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  width: 100%;
  box-sizing: border-box;
}

.scheme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.scheme-card-content {
  padding: 1rem;
}

.scheme-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.scheme-info {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  color: var(--theme-color-text-soft);
}

.info-value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.scheme-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.scheme-preview {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--theme-color-soft);
  border-radius: 0.5rem;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tree-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.tree-actions {
  display: flex;
  gap: 0.5rem;
}

.tree-container {
  display: block;
  position: relative;
  width: 100%;
  height: 30rem;
  overflow: auto;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  padding: 1rem;
  background: var(--theme-color-background);
}

/* 树形结构层级样式 */
.tree-container :deep(.ix-tree-item) {
  margin-bottom: 0.25rem;
}

.tree-container :deep(.ix-tree-item[data-level="0"]) {
  font-weight: 600;
  font-size: 1rem;
  color: var(--theme-color-text);
  margin-bottom: 0.5rem;
}

.tree-container :deep(.ix-tree-item[data-level="1"]) {
  font-weight: 500;
  font-size: 0.9375rem;
  color: var(--theme-color-text);
  padding-left: 1.5rem;
  margin-bottom: 0.375rem;
}

.tree-container :deep(.ix-tree-item[data-level="2"]) {
  font-weight: 400;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  padding-left: 3rem;
  margin-bottom: 0.25rem;
}

.tree-container :deep(.ix-tree-item[data-level="3"]) {
  font-weight: 400;
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
  padding-left: 4.5rem;
  margin-bottom: 0.25rem;
}
</style>
