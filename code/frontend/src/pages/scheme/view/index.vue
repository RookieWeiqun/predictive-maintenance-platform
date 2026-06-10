<!-- 方案查看/编辑页面 -->
<template>
  <div class="scheme-view-page">
    <div v-if="syncProgress.visible" class="sync-progress-mask">
      <div class="sync-progress-card">
        <div class="sync-progress-title">正在保存检测项</div>
        <div class="sync-progress-message">{{ syncProgress.message }}</div>
        <div class="sync-progress-track">
          <div class="sync-progress-fill" :style="{ width: `${syncProgress.percent}%` }"></div>
        </div>
        <div class="sync-progress-percent">{{ syncProgress.percent }}%</div>
      </div>
    </div>
    <IxContentHeader :header-title="pageTitle">
      <IxButton variant="secondary" @click="handleBack">返回</IxButton>
      <template v-if="!isEditMode">
      <IxButton variant="primary" @click="handleEdit">编辑</IxButton>
      </template>
      <template v-else>
        <IxButton variant="secondary" @click="handleCancel">取消</IxButton>
        <IxButton variant="primary" @click="handleSave" :disabled="!canSave">保存</IxButton>
      </template>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 方案基本信息 -->
        <div class="scheme-basic-info">
          <IxInput 
            v-model="schemeForm.name" 
            label="方案名称" 
            :readonly="!isEditMode"
            placeholder="请输入方案名称"
            style="flex: 1;"
          />
          <IxInput 
            v-model="schemeForm.description" 
            label="方案描述" 
            :readonly="!isEditMode"
            placeholder="请输入方案描述（可选）"
            style="flex: 1;"
          />
          
          <!-- 外围/设备方案都需要明确产品类别和产品系列 -->
          <template v-if="schemeForm.atomicType">
            <IxSelect 
              v-if="isEditMode"
              v-model="schemeForm.categoryId" 
              :label="productCategoryLabel"
              style="flex: 1;"
            >
              <IxSelectItem 
                v-for="category in categories" 
                :key="category.id" 
                :label="category.name" 
                :value="category.id" 
              />
            </IxSelect>
            <IxInput 
              v-else
              :model-value="categoryName" 
              :label="productCategoryLabel" 
              readonly
              style="flex: 1;"
            />
            <IxSelect 
              v-if="isEditMode"
              v-model="schemeForm.subCategoryId" 
              :label="productSeriesLabel"
              style="flex: 1;"
            >
              <IxSelectItem 
                v-for="subCategory in subCategories" 
                :key="subCategory.id" 
                :label="subCategory.name" 
                :value="subCategory.id" 
              />
            </IxSelect>
            <IxInput 
              v-else
              :model-value="subCategoryName" 
              :label="productSeriesLabel" 
              readonly
              style="flex: 1;"
            />
            <template v-if="schemeForm.atomicType === 'equipment'">
              <IxSelect
                v-if="isEditMode"
                v-model="schemeForm.series"
                label="系列"
                placeholder="请选择系列"
                style="flex: 1;"
              >
                <IxSelectItem
                  v-for="option in seriesOptions"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </IxSelect>
              <IxInput
                v-else
                :model-value="schemeForm.series"
                label="系列"
                readonly
                style="flex: 1;"
              />
              <IxSelect
                v-if="isEditMode"
                v-model="schemeForm.size"
                label="尺寸"
                placeholder="请选择尺寸"
                style="flex: 1;"
              >
                <IxSelectItem
                  v-for="option in sizeOptions"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </IxSelect>
              <IxInput
                v-else
                :model-value="schemeForm.size"
                label="尺寸"
                readonly
                style="flex: 1;"
              />
            </template>
          </template>
        </div>

        <!-- 检测项目表格（查看和编辑模式共用） -->
        <div v-if="schemeForm.atomicType && currentAtomicScheme && gridOptions" class="scheme-table-container">
          <div class="table-actions">
            <div class="table-actions-left">
              <IxButton variant="tertiary" size="sm" @click="handleExpandAll">全部展开</IxButton>
              <IxButton variant="tertiary" size="sm" @click="handleCollapseAll">全部收缩</IxButton>
            </div>
            <div v-if="isEditMode" class="table-actions-right">
              <input
                ref="excelInputRef"
                type="file"
                accept=".xlsx,.xls"
                style="display: none;"
                @change="handleExcelSelected"
              />
              <IxButton variant="tertiary" size="sm" @click="triggerExcelImport">导入Excel</IxButton>
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
            style="flex: 1; width: 100%; min-height: 0;"
            :gridOptions="gridOptions"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  IxSelect,
  IxSelectItem,
  showToast,
} from '@siemens/ix-vue';
import { AgGridVue } from 'ag-grid-vue3';
import {
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';
import { getSchemeById, saveScheme } from '@/mockdata/scheme/index.ts';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import { inspectionTemplatesApi, templatemappingsApi } from '@/api';
import type { TemplateMappingDto } from '@/api/modules/templatemappings';
import { dedupeTemplateMappingField } from '@/util/templateMappings';
import {
  isTemplateApiId,
  templateDtoToFormAndAtomic,
  buildTemplateDtoForSave,
} from '../utils/schemeInspectionTemplate';
import { 
  type AtomicScheme, 
  type SchemeItem, 
} from '../utils/schemeUtils';
import { updateGridOptionsForEdit, updateGridOptionsForView } from '../utils/gridEditUtils';
import { useSchemeGridEditor } from '../utils/useSchemeGridEditor';
import { importInspectionItemsFromExcel } from '../utils/importInspectionItemsFromExcel';
import { syncTemplateNodesWithProgress } from '../utils/syncTemplateNodes';
import { loadTemplateItemsByTemplateId } from '../utils/loadTemplateItems';

ModuleRegistry.registerModules([AllCommunityModule]);

const route = useRoute();
const router = useRouter();

const schemeId = route.params.id as string;
// 从任务列表进入时的参数
const taskId = route.query.taskId as string | undefined;
const returnPath = route.query.returnPath as string | undefined;

const loadedTemplateCreatedate = ref<string | null>(null);
const excelInputRef = ref<HTMLInputElement | null>(null);
const syncProgress = ref({ visible: false, percent: 0, message: '' });
const templateMappings = ref<TemplateMappingDto[]>([]);

// 编辑模式
const isEditMode = ref(false);

// 页面标题
const pageTitle = computed(() => {
  if (!schemeForm.value.atomicType) return isEditMode.value ? '编辑方案' : '查看方案';
  const typeName = schemeForm.value.atomicType === 'peripheral' ? '系统外围检测方案' : '设备检测方案';
  return isEditMode.value ? `编辑${typeName}` : `查看${typeName}`;
});

// 方案基本信息表单
const schemeForm = ref({
  name: '',
  description: '',
  atomicType: '' as 'peripheral' | 'equipment' | '',
  categoryId: '',
  subCategoryId: '',
  model: '',
  series: '',
  size: '',
});

// 当前方案数据
const currentAtomicScheme = ref<AtomicScheme | null>(null);

// 原始方案数据（用于取消编辑时恢复）
const originalAtomicScheme = ref<AtomicScheme | null>(null);
const originalSchemeForm = ref({
  name: '',
  description: '',
  atomicType: '' as 'peripheral' | 'equipment' | '',
  categoryId: '',
  subCategoryId: '',
  model: '',
  series: '',
  size: '',
});

// 分类列表
const categories = productCategoriesData.categories;

// 子分类列表
const subCategories = computed(() => {
  if (!schemeForm.value.categoryId) return [];
  const category = categories.find(c => c.id === schemeForm.value.categoryId);
  return category?.subCategories || [];
});

const productCategoryLabel = computed(() => '产品类型');

const productSeriesLabel = computed(() => '产品系列');

function withCurrentOption(options: string[], currentValue: string): string[] {
  const value = currentValue.trim();
  if (!value || options.includes(value)) {
    return options;
  }
  return [value, ...options];
}

const seriesOptions = computed(() =>
  withCurrentOption(dedupeTemplateMappingField(templateMappings.value, 'series'), schemeForm.value.series),
);

const sizeOptions = computed(() =>
  withCurrentOption(dedupeTemplateMappingField(templateMappings.value, 'size'), schemeForm.value.size),
);

async function loadTemplateMappings(): Promise<void> {
  try {
    templateMappings.value = await templatemappingsApi.listTemplateMappings();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '型号尺寸匹配表加载失败' });
  }
}

// 分类名称
const categoryName = computed(() => {
  if (!schemeForm.value.categoryId) return '-';
  const category = categories.find(c => c.id === schemeForm.value.categoryId);
  return category?.name || '-';
});

// 子分类名称
const subCategoryName = computed(() => {
  if (!schemeForm.value.subCategoryId) return '-';
  for (const category of categories) {
    const subCategory = category.subCategories.find(sc => sc.id === schemeForm.value.subCategoryId);
    if (subCategory) {
      return subCategory.name;
    }
  }
  return '-';
});

// 使用方案表格编辑器 composable
const {
  gridOptions,
  gridApi,
  selectedRows,
  hasSelectedRow,
  handleExpandAll,
  handleCollapseAll,
  updateGridData,
  findItemByRowId,
  handleAddRootItem,
  handleAddChildItemToSelected,
  handleDeleteSelectedItems,
  initGridOptions,
} = useSchemeGridEditor(
  currentAtomicScheme,
  isEditMode
);

// 处理单元格值变化（编辑逻辑已在 valueSetter 中处理，这里只更新显示）
const handleCellValueChanged = () => {
  if (!isEditMode.value) return;
  updateGridData();
};

const triggerExcelImport = () => {
  excelInputRef.value?.click();
};

const handleExcelSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !currentAtomicScheme.value) {
    return;
  }
  try {
    const importedItems = await importInspectionItemsFromExcel(file);
    currentAtomicScheme.value.items = importedItems;
    selectedRows.value = [];
    updateGridData();
    showToast({ message: `导入成功，共导入 ${importedItems.length} 个根节点` });
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : 'Excel 导入失败' });
  } finally {
    input.value = '';
  }
};

// 验证是否可以保存
const canSave = computed(() => {
  if (!schemeForm.value.atomicType || !schemeForm.value.name) return false;
  if (!schemeForm.value.categoryId || !schemeForm.value.subCategoryId) return false;
  if (
    schemeForm.value.atomicType === 'equipment'
    && (!schemeForm.value.series.trim() || !schemeForm.value.size.trim())
  ) {
    return false;
  }
  if (!currentAtomicScheme.value || !currentAtomicScheme.value.items || currentAtomicScheme.value.items.length === 0) {
    return false;
  }
  return true;
});

watch(
  () => schemeForm.value.atomicType,
  (type) => {
    if (type === 'peripheral') {
      schemeForm.value.series = '';
      schemeForm.value.size = '';
    }
  },
  { immediate: true },
);


// 进入编辑模式
const handleEdit = () => {
  // 保存原始数据
  originalSchemeForm.value = { ...schemeForm.value };
  if (currentAtomicScheme.value) {
    originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
  }
  isEditMode.value = true;
  // 更新表格配置以支持编辑
  updateGridOptionsForEditLocal();
};

// 取消编辑
const handleCancel = () => {
  if (confirm('确定要取消编辑吗？未保存的更改将丢失。')) {
    // 恢复原始数据
    schemeForm.value = { ...originalSchemeForm.value };
    if (originalAtomicScheme.value) {
      currentAtomicScheme.value = JSON.parse(JSON.stringify(originalAtomicScheme.value));
    }
    isEditMode.value = false;
    // 恢复表格配置为只读
    updateGridOptionsForViewLocal();
    updateGridData();
  }
};

// 保存方案
const handleSave = async () => {
  if (!canSave.value) {
    alert('请完善方案信息');
    return;
  }
  
  // 更新当前方案数据
  if (currentAtomicScheme.value) {
    currentAtomicScheme.value.name = schemeForm.value.name;
    currentAtomicScheme.value.type = schemeForm.value.atomicType as 'peripheral' | 'equipment';
    currentAtomicScheme.value.description = schemeForm.value.description;
  }
  
  const schemeIdToSave = currentAtomicScheme.value?.id || schemeId;
  
  // 保存原子方案
  const atomicScheme: AtomicScheme = {
    id: schemeIdToSave,
    name: schemeForm.value.name,
    type: schemeForm.value.atomicType as 'peripheral' | 'equipment',
    description: schemeForm.value.description,
    items: currentAtomicScheme.value?.items || [],
  };

  atomicScheme.categoryId = schemeForm.value.categoryId;
  atomicScheme.subCategoryId = schemeForm.value.subCategoryId;
  atomicScheme.deviceTypes = schemeForm.value.subCategoryId ? [schemeForm.value.subCategoryId] : [];

  if (schemeForm.value.atomicType === 'equipment') {
    atomicScheme.model = schemeForm.value.model;
  }
  
  try {
    const schemeData = {
      id: atomicScheme.id,
      name: atomicScheme.name,
      type: atomicScheme.type,
      description: atomicScheme.description || '',
      items: atomicScheme.items,
      categoryId: atomicScheme.categoryId || '',
      subCategoryId: atomicScheme.subCategoryId || '',
      model: atomicScheme.model || '',
      deviceTypes: atomicScheme.deviceTypes || [],
    };

    if (!taskId && isTemplateApiId(String(schemeIdToSave))) {
      await inspectionTemplatesApi.updateInspectionTemplate(
        buildTemplateDtoForSave(
          Number.parseInt(String(schemeIdToSave), 10),
          schemeForm.value,
          atomicScheme,
          loadedTemplateCreatedate.value,
        ),
      );
      syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
      await syncTemplateNodesWithProgress(Number.parseInt(String(schemeIdToSave), 10), atomicScheme.items, (p) => {
        syncProgress.value = { visible: true, percent: p.percent, message: p.message };
      });
      syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
      originalSchemeForm.value = { ...schemeForm.value };
      if (currentAtomicScheme.value) {
        originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
      }
      isEditMode.value = false;
      updateGridOptionsForViewLocal();
      updateGridData();
      showToast({ message: '保存成功' });
      return;
    }

    // 如果是从任务列表进入，保存为项目方案（不影响标准方案）
    if (taskId) {
      // 保存项目方案到独立的存储空间
      const taskSchemeKey = `task_scheme_${taskId}_${schemeId}`;
      try {
        localStorage.setItem(taskSchemeKey, JSON.stringify(schemeData));
        console.log(`项目方案已保存: ${taskSchemeKey}`);
      } catch (e) {
        console.error('保存项目方案失败:', e);
      }
    } else {
      saveScheme(schemeData);
    }

    originalSchemeForm.value = { ...schemeForm.value };
    if (currentAtomicScheme.value) {
      originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
    }

    isEditMode.value = false;
    updateGridOptionsForViewLocal();
    updateGridData();

    showToast({ message: '保存成功' });
  } catch (error) {
    console.error('保存失败:', error);
    showToast({ message: error instanceof Error ? error.message : '保存失败，请重试' });
  } finally {
    setTimeout(() => {
      syncProgress.value.visible = false;
    }, 300);
  }
};

// 返回
const handleBack = () => {
  if (isEditMode.value) {
    if (confirm('当前有未保存的编辑，确定要返回吗？')) {
      // 如果是从任务列表进入，返回到任务列表；否则返回到方案列表
      router.push(returnPath || '/scheme/list');
    }
  } else {
    router.push(returnPath || '/scheme/list');
  }
};

// 更新表格配置为编辑模式（使用可复用的工具函数）
const updateGridOptionsForEditLocal = () => {
  updateGridOptionsForEdit(
    gridOptions,
    gridApi,
    findItemByRowId,
    updateGridData,
    selectedRows,
    handleCellValueChanged,
    isEditMode
  );
};

// 更新表格配置为查看模式（使用可复用的工具函数）
const updateGridOptionsForViewLocal = () => {
  updateGridOptionsForView(
    gridOptions,
    gridApi,
    selectedRows
  );
};

async function bootstrapView() {
  let scheme: any = null;
  if (taskId) {
    const taskSchemeKey = `task_scheme_${taskId}_${schemeId}`;
    try {
      const taskSchemeData = localStorage.getItem(taskSchemeKey);
      if (taskSchemeData) {
        scheme = JSON.parse(taskSchemeData);
      }
    } catch (e) {
      console.error('读取项目方案失败:', e);
    }
  }

  if (!scheme && isTemplateApiId(schemeId)) {
    try {
      const dto = await inspectionTemplatesApi.getInspectionTemplate(Number.parseInt(schemeId, 10));
      loadedTemplateCreatedate.value = dto.createdate ?? null;
      const { schemeForm: sf, atomic } = templateDtoToFormAndAtomic(dto);
      const apiItems = await loadTemplateItemsByTemplateId(Number.parseInt(schemeId, 10));
      if (apiItems.length > 0) {
        atomic.items = apiItems;
      }
      schemeForm.value = sf;
      originalSchemeForm.value = { ...sf };
      currentAtomicScheme.value = atomic;
      originalAtomicScheme.value = JSON.parse(JSON.stringify(atomic));
      if (currentAtomicScheme.value && currentAtomicScheme.value.items.length > 0) {
        initGridOptions();
      }
      return;
    } catch (e) {
      console.error(e);
      alert('未找到该方案或加载失败');
      router.push(returnPath || '/scheme/list');
      return;
    }
  }

  if (!scheme) {
    scheme = getSchemeById(schemeId);
  }

  if (!scheme) {
    alert('未找到该方案');
    router.push(returnPath || '/scheme/list');
    return;
  }
  
  // 填充表单数据
  schemeForm.value = {
    name: scheme.name || '',
    description: scheme.description || '',
    atomicType: (scheme.type === 'peripheral' || scheme.type === 'equipment') 
      ? scheme.type 
      : '' as 'peripheral' | 'equipment' | '',
    categoryId: scheme.categoryId || '',
    subCategoryId: scheme.subCategoryId || '',
    model: scheme.model || '',
    series: '',
    size: '',
  };
  
  // 保存原始数据
  originalSchemeForm.value = { ...schemeForm.value };
  
  // 设置当前方案数据
  const schemeItems: SchemeItem[] = (scheme.items || []).map((item: any) => ({
    ...item,
    type: item.type || '',
    required: item.required !== undefined ? item.required : false,
  })) as SchemeItem[];
  
  currentAtomicScheme.value = {
    id: scheme.id,
    name: scheme.name,
    type: (scheme.type === 'peripheral' || scheme.type === 'equipment') 
      ? scheme.type 
      : 'peripheral',
    description: scheme.description,
    deviceTypes: scheme.deviceTypes || [],
    categoryId: scheme.categoryId,
    subCategoryId: scheme.subCategoryId,
    model: scheme.model,
    items: schemeItems,
  };
  
  // 保存原始方案数据
  originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
  
  // 使用 composable 初始化 gridOptions
  if (currentAtomicScheme.value && currentAtomicScheme.value.items.length > 0) {
    initGridOptions();
  }
}

onMounted(() => {
  void loadTemplateMappings();
  void bootstrapView();
});

// 监听编辑模式变化，更新表格配置
watch(isEditMode, (newValue) => {
  if (newValue) {
    updateGridOptionsForEditLocal();
    // 确保选择监听已设置
    if (gridApi.value) {
      gridApi.value.addEventListener('selectionChanged', () => {
        const selectedNodes = gridApi.value.getSelectedNodes();
        selectedRows.value = selectedNodes.map((node: any) => node.data).filter(Boolean);
        console.log('Watch - 选中行更新:', selectedRows.value.length);
      });
    }
  } else {
    updateGridOptionsForViewLocal();
  }
  updateGridData();
});

// 监听分类变化，更新子分类
watch(
  () => schemeForm.value.categoryId,
  (nextCategoryId, previousCategoryId) => {
    if (!nextCategoryId || !previousCategoryId || nextCategoryId === previousCategoryId) {
      return;
    }
    schemeForm.value.subCategoryId = '';
  },
);
</script>

<style scoped>
.scheme-view-page {
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-section {
  flex: 1;
  padding: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scheme-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  /* margin-bottom: 1rem; */
  padding: 0.5rem;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  flex-shrink: 0;
}

.scheme-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  overflow: hidden;
  /* min-height: 0; */
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

.sync-progress-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-progress-card {
  width: min(440px, calc(100vw - 2rem));
  background: var(--theme-color-surface);
  border-radius: 0.5rem;
  padding: 1rem;
}

.sync-progress-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.sync-progress-message {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  margin-bottom: 0.75rem;
}

.sync-progress-track {
  width: 100%;
  height: 8px;
  background: var(--theme-color-soft);
  border-radius: 999px;
  overflow: hidden;
}

.sync-progress-fill {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 0.2s ease;
}

.sync-progress-percent {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
  text-align: right;
}
</style>

<style>
</style>
