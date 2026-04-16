<template>
  <div class="step-content">
    <h2 class="step-title">调整维护方案</h2>
    <p class="step-description">您可以根据实际需求对匹配到的维护方案进行调整，删除或增加检测项目。</p>

    <!-- 方案选择卡片 -->
    <div v-if="devices && devices.length > 0 && matchedSchemes.length > 0" class="matched-schemes">
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
          @click="handleSelectScheme(scheme.id)"
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

    <!-- 检测项目表格 -->
    <div v-if="currentAtomicScheme && gridOptions" class="scheme-table-container">
      <div class="action-buttons-top">
        <IxButton variant="secondary" @click="handleResetScheme">重置为原始方案</IxButton>
      </div>
      <div class="table-actions">
        <div class="table-actions-left">
          <IxButton variant="tertiary" size="sm" @click="handleExpandAll">全部展开</IxButton>
          <IxButton variant="tertiary" size="sm" @click="handleCollapseAll">全部收缩</IxButton>
        </div>
        <div class="table-actions-right">
          <IxButton variant="tertiary" size="sm" @click="handleAddRootItem">添加项目</IxButton>
          <IxButton 
            variant="tertiary" 
            size="sm" 
            @click="handleAddChildItemToSelected"
            :disabled="!hasSelectedRow"
          >
            添加子项目
          </IxButton>
          <IxButton 
            variant="tertiary" 
            size="sm" 
            @click="handleDeleteSelectedItems"
            :disabled="!hasSelectedRow"
            style="color: var(--theme-color-alarm);"
          >
            删除选中项目
          </IxButton>
        </div>
      </div>
      <AgGridVue
        class="scheme-grid"
        :style="{ width: '100%', height: gridHeight + 'px' }"
        :gridOptions="gridOptions"
      /> 
    </div>
    <div v-else class="empty-state">
      <p>请先完成"匹配方案"步骤</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { 
  IxButton,
  IxCard,
} from "@siemens/ix-vue";
import { AgGridVue } from 'ag-grid-vue3';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';
import {
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';
import { 
  type AtomicScheme, 
  type SchemeItem, 
} from '@/pages/scheme/utils/schemeUtils';
import { useSchemeGridEditor } from '@/pages/scheme/utils/useSchemeGridEditor';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Device {
  id: string;
  model: string;
  quantity: number;
}

interface Props {
  adjustedSchemeTreeModel?: any;
  adjustedSchemeTreeContext?: any;
  originalSchemeItems?: SchemeItem[];
  devices?: Device[];
  selectedSchemeId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update-tree-context': [context: any];
  'reset-scheme': [];
  'add-custom-item': [];
  'update-items': [items: SchemeItem[]];
  'select-scheme': [schemeId: string];
}>();

// 编辑模式（始终为 true，因为这是调整页面）
const isEditMode = ref(true);

// 当前方案数据
const currentAtomicScheme = ref<AtomicScheme | null>(null);

// 原始方案数据（用于重置）
const originalAtomicScheme = ref<AtomicScheme | null>(null);

// 使用方案表格编辑器 composable
const {
  gridOptions,
  gridApi,
  selectedRows,
  hasSelectedRow,
  toggleRow,
  handleExpandAll,
  handleCollapseAll,
  updateGridData,
  handleAddRootItem,
  handleAddChildItemToSelected,
  handleDeleteSelectedItems,
  initGridOptions,
} = useSchemeGridEditor(
  currentAtomicScheme,
  isEditMode,
  (items: SchemeItem[]) => {
    // 通知父组件更新
    emit('update-items', items);
  }
);

// 表格高度（自适应，带最大高度限制）
const gridHeight = ref(400);
const maxGridHeight = 800;
const minGridHeight = 400;

// 计算表格高度
const calculateGridHeight = () => {
  // 获取视口高度
  const viewportHeight = window.innerHeight;
  // 估算固定元素的高度：header(60) + workflow steps(80) + title/description(100) + buttons(120) + padding(40) = 400px
  const fixedHeight = 400;
  // 计算可用高度
  const availableHeight = viewportHeight - fixedHeight;
  // 应用最小和最大高度限制
  gridHeight.value = Math.max(minGridHeight, Math.min(maxGridHeight, availableHeight));
};

// 方案选择相关
const selectedSchemeId = computed(() => props.selectedSchemeId || '');

// 计算匹配到的方案
const matchedSchemes = computed(() => {
  if (!props.devices || props.devices.length === 0) return [];
  
  const models = props.devices.map(d => d.model).filter(Boolean);
  if (models.length === 0) return [];
  
  const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
  return schemes.filter((s: any) => models.includes(s.model));
});

// 设备统计
const totalDeviceQuantity = computed(() => {
  if (!props.devices) return 0;
  return props.devices.reduce((sum, device) => sum + device.quantity, 0);
});

const uniqueModels = computed(() => {
  if (!props.devices) return [];
  const models = props.devices.map(d => d.model).filter(Boolean);
  return [...new Set(models)];
});

// 处理方案选择
const handleSelectScheme = (schemeId: string) => {
  emit('select-scheme', schemeId);
};


// 重置方案
const handleResetScheme = () => {
  if (confirm('确定要重置为原始方案吗？当前所有调整将丢失。')) {
    if (originalAtomicScheme.value) {
      currentAtomicScheme.value = JSON.parse(JSON.stringify(originalAtomicScheme.value));
      updateGridData();
      emit('reset-scheme');
    }
  }
};

// 初始化数据
onMounted(() => {
  // 计算表格高度
  calculateGridHeight();
  // 监听窗口大小变化
  window.addEventListener('resize', calculateGridHeight);
  
  // 从 props 获取方案数据
  if (props.originalSchemeItems && props.originalSchemeItems.length > 0) {
    const schemeItems: SchemeItem[] = (props.originalSchemeItems || []).map((item: any) => ({
      ...item,
      type: item.type || '',
      required: item.required !== undefined ? item.required : false,
    })) as SchemeItem[];
    
    currentAtomicScheme.value = {
      id: 'adjustment-scheme',
      name: '调整方案',
      type: 'equipment',
      description: '',
      deviceTypes: [],
      items: schemeItems,
    };
    
    // 保存原始方案数据
    originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
    
    // 使用 composable 初始化 gridOptions
    initGridOptions();
  }
});

// 监听原始方案项目数据变化
watch(() => props.originalSchemeItems, (newItems) => {
  if (newItems && newItems.length > 0) {
    const schemeItems: SchemeItem[] = (newItems || []).map((item: any) => ({
      ...item,
      type: item.type || '',
      required: item.required !== undefined ? item.required : false,
    })) as SchemeItem[];
    
    currentAtomicScheme.value = {
      id: 'adjustment-scheme',
      name: '调整方案',
      type: 'equipment',
      description: '',
      deviceTypes: [],
      items: schemeItems,
    };
    
    // 保存原始方案数据
    originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
    
    // 如果 gridOptions 已创建，更新数据
    if (gridApi.value) {
      updateGridData();
    } else {
      // 如果 gridOptions 未创建，重新初始化
      initGridOptions();
    }
  } else {
    currentAtomicScheme.value = null;
    originalAtomicScheme.value = null;
    if (gridApi.value) {
      gridApi.value.setGridOption('rowData', []);
    }
  }
}, { immediate: true, deep: true });

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('resize', calculateGridHeight);
});

</script>

<style scoped>
.step-content {
  flex: 1;
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
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

.scheme-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  overflow: hidden;
}

.action-buttons-top {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
  flex-shrink: 0;
}

.table-actions-left {
  display: flex;
  gap: 0.5rem;
}

.table-actions-right {
  display: flex;
  gap: 0.5rem;
}

.scheme-grid {
  /* 高度由 JavaScript 动态计算，这里只设置宽度 */
  width: 100%;
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
</style>
