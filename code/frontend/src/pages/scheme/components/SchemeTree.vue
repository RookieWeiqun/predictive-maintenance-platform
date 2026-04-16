<!-- 检测项目树组件 -->
<template>
  <div class="scheme-tree-panel">
    <div class="tree-header">
      <h3>检测项目</h3>
      <div class="tree-actions">
        <slot name="actions">
          <IxButton variant="tertiary" size="sm" @click="expandAll">全部展开</IxButton>
          <IxButton variant="tertiary" size="sm" @click="collapseAll">全部收缩</IxButton>
        </slot>
      </div>
    </div>
    <div class="tree-container">
      <IxTree 
        v-if="treeModel"
        root="root"
        :model="treeModel"
        :context="treeContext"
        @contextChange="handleTreeContextChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { IxTree, IxButton } from '@siemens/ix-vue';
import { TreeModel, TreeContext } from '@siemens/ix';
import { convertToTreeModel, isDetectionItem, type SchemeItem } from '../utils/schemeUtils';

interface Props {
  items: SchemeItem[];
  selectedItemId?: string | null;
}

interface Emits {
  (e: 'contextChange', context: TreeContext): void;
  (e: 'itemSelected', itemId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedItemId: null,
});

const emit = defineEmits<Emits>();

const treeModel = ref<TreeModel<any> | null>(null);
const treeContext = ref<TreeContext>({});

// 更新树模型
const updateTreeModel = () => {
  if (!props.items || props.items.length === 0) {
    treeModel.value = null;
    treeContext.value = {};
    return;
  }
  
  treeModel.value = convertToTreeModel(props.items);
  
  const context: TreeContext = {};
  let firstItemId: string | null = null;
  
  if (treeModel.value) {
    function traverse(nodeId: string) {
      const node = treeModel.value![nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: true, isSelected: false };
        if (node.children) {
          node.children.forEach(childId => traverse(childId));
        }
      } else if (node && nodeId !== 'root') {
        // 只选择检测项目（第四层）
        if (!firstItemId && node.data.isDetectionItem) {
          firstItemId = nodeId;
        }
        context[nodeId] = { isExpanded: false, isSelected: false };
      }
    }
    if (treeModel.value.root && treeModel.value.root.children) {
      treeModel.value.root.children.forEach(childId => traverse(childId));
    }
    
    // 如果有传入的选中项，使用它；否则使用第一个检测项目
    const targetItemId = props.selectedItemId || firstItemId;
    if (targetItemId) {
      context[targetItemId] = { ...context[targetItemId], isSelected: true };
      emit('itemSelected', targetItemId);
    }
  }
  treeContext.value = context;
};

// 树形上下文变化处理
const handleTreeContextChange = (event: { detail: TreeContext }) => {
  const newContext = { ...event.detail };
  
  const selectedNodeId = Object.keys(newContext).find(
    nodeId => newContext[nodeId]?.isSelected
  );
  
  if (selectedNodeId) {
    emit('itemSelected', selectedNodeId);
  }
  
  treeContext.value = newContext;
  emit('contextChange', newContext);
};

// 展开所有
const expandAll = () => {
  if (!treeModel.value) return;
  const context: TreeContext = {};
  function traverse(nodeId: string) {
    const node = treeModel.value![nodeId];
    if (node) {
      context[nodeId] = { isExpanded: true, isSelected: treeContext.value[nodeId]?.isSelected || false };
      if (node.children) {
        node.children.forEach(childId => traverse(childId));
      }
    }
  }
  if (treeModel.value.root && treeModel.value.root.children) {
    treeModel.value.root.children.forEach(childId => traverse(childId));
  }
  treeContext.value = context;
};

// 收缩所有
const collapseAll = () => {
  if (!treeModel.value) return;
  const context: TreeContext = {};
  function traverse(nodeId: string) {
    const node = treeModel.value![nodeId];
    if (node) {
      context[nodeId] = { isExpanded: false, isSelected: treeContext.value[nodeId]?.isSelected || false };
      if (node.children) {
        node.children.forEach(childId => traverse(childId));
      }
    }
  }
  if (treeModel.value.root && treeModel.value.root.children) {
    treeModel.value.root.children.forEach(childId => traverse(childId));
  }
  treeContext.value = context;
};

// 监听 items 变化
watch(() => props.items, () => {
  updateTreeModel();
}, { deep: true });

onMounted(() => {
  updateTreeModel();
});
</script>

<style scoped>
.scheme-tree-panel {
  flex: 0 0 400px;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.tree-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.tree-actions {
  display: flex;
  gap: 0.5rem;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  min-height: 400px;
}
</style>
