<!-- 方案查看/编辑页面 -->
<template>
  <div class="scheme-view-page">
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
          
          <!-- 设备方案显示分类和型号 -->
          <template v-if="schemeForm.atomicType === 'equipment'">
            <IxSelect 
              v-if="isEditMode"
              v-model="schemeForm.categoryId" 
              label="产品分类"
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
              label="产品分类" 
              readonly
              style="flex: 1;"
            />
            <IxSelect 
              v-if="isEditMode"
              v-model="schemeForm.subCategoryId" 
              label="子分类"
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
              label="子分类" 
              readonly
              style="flex: 1;"
            />
            <IxInput 
              v-model="schemeForm.model" 
              label="适用型号" 
              :readonly="!isEditMode"
              placeholder="请输入适用型号（可选）"
              style="flex: 1;"
            />
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
} from "@siemens/ix-vue";
import { AgGridVue } from 'ag-grid-vue3';
import {
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';
import { getSchemeById, saveScheme } from '@/mockdata/scheme/index.ts';
import productCategoriesData from '@/mockdata/common/productCategories.json';
import { 
  type AtomicScheme, 
  type SchemeItem, 
} from '../utils/schemeUtils';
import { updateGridOptionsForEdit, updateGridOptionsForView } from '../utils/gridEditUtils';
import { useSchemeGridEditor } from '../utils/useSchemeGridEditor';

ModuleRegistry.registerModules([AllCommunityModule]);

const route = useRoute();
const router = useRouter();

const schemeId = route.params.id as string;
// 从任务列表进入时的参数
const taskId = route.query.taskId as string | undefined;
const returnPath = route.query.returnPath as string | undefined;

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
});

// 分类列表
const categories = productCategoriesData.categories;

// 子分类列表
const subCategories = computed(() => {
  if (!schemeForm.value.categoryId) return [];
  const category = categories.find(c => c.id === schemeForm.value.categoryId);
  return category?.subCategories || [];
});

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

// 验证是否可以保存
const canSave = computed(() => {
  if (!schemeForm.value.atomicType || !schemeForm.value.name) return false;
  if (schemeForm.value.atomicType === 'equipment' && !schemeForm.value.categoryId) return false;
  if (!currentAtomicScheme.value || !currentAtomicScheme.value.items || currentAtomicScheme.value.items.length === 0) {
    return false;
  }
  return true;
});


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
  
  if (schemeForm.value.atomicType === 'equipment') {
    atomicScheme.categoryId = schemeForm.value.categoryId;
    atomicScheme.subCategoryId = schemeForm.value.subCategoryId;
    atomicScheme.model = schemeForm.value.model;
    atomicScheme.deviceTypes = schemeForm.value.subCategoryId ? [schemeForm.value.subCategoryId] : [];
  }
  
  try {
    // 保存方案到 localStorage 和 scheme 系统
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
      // 保存到标准方案系统（会更新 localStorage）
      saveScheme(schemeData);
    }
    
    console.log('保存原子方案:', atomicScheme);
    
    // 更新原始数据
    originalSchemeForm.value = { ...schemeForm.value };
    if (currentAtomicScheme.value) {
      originalAtomicScheme.value = JSON.parse(JSON.stringify(currentAtomicScheme.value));
    }
    
    isEditMode.value = false;
    // 恢复表格配置为只读
    updateGridOptionsForViewLocal();
    updateGridData();
    
    alert('保存成功！');
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败，请重试');
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

// 初始化数据
onMounted(() => {
  // 如果是从任务列表进入，优先加载项目方案
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
  
  // 如果没有项目方案，加载标准方案
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
watch(() => schemeForm.value.categoryId, () => {
  if (schemeForm.value.categoryId) {
    schemeForm.value.subCategoryId = '';
  }
});
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
</style>

<style>
</style>
