<!-- 方案编辑页面 -->
<template>
  <div class="scheme-edit-page">
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
      <IxButton variant="secondary" @click="handleCancel">取消</IxButton>
      <IxButton variant="primary" @click="handleSave" :disabled="!canSave">保存</IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 方案基本信息 -->
        <div class="scheme-basic-info">
          <!-- 方案类型选择（仅新建时显示） -->
          <IxSelect 
            v-if="isNew"
            v-model="schemeForm.atomicType" 
            label="方案类型"
            placeholder="请选择方案类型"
            style="flex: 1;"
          >
            <IxSelectItem label="系统外围检测方案" value="peripheral" />
            <IxSelectItem label="设备检测方案" value="equipment" />
          </IxSelect>
          
          <template v-if="schemeForm.atomicType">
            <IxInput 
              v-model="schemeForm.name" 
              label="方案名称" 
              placeholder="请输入方案名称"
              style="flex: 1;"
            />
            <IxInput 
              v-model="schemeForm.description" 
              label="方案描述" 
              placeholder="请输入方案描述（可选）"
              style="flex: 1;"
            />
            
            <!-- 外围/设备方案都需要明确产品类别和产品系列 -->
            <template v-if="schemeForm.atomicType">
              <IxSelect 
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
              <IxSelect 
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
                v-if="schemeForm.atomicType === 'equipment'"
                v-model="schemeForm.model" 
                label="适用型号" 
                placeholder="请输入适用型号（可选）"
                style="flex: 1;"
              />
            </template>
          </template>
        </div>

        <!-- 检测项目编辑（左树右表布局） -->
        <div v-if="schemeForm.atomicType && currentAtomicScheme" class="scheme-edit-container">
          <SchemeTree 
            :items="currentAtomicScheme.items"
            :selected-item-id="selectedItemId"
            @item-selected="handleItemSelected"
          >
            <template #actions>
                <input
                  ref="excelInputRef"
                  type="file"
                  accept=".xlsx,.xls"
                  style="display: none;"
                  @change="handleExcelSelected"
                />
                <IxButton variant="tertiary" size="sm" @click="triggerExcelImport">导入Excel</IxButton>
                <IxButton variant="tertiary" size="sm" @click="handleAddItem">添加根项目</IxButton>
                <IxButton 
                  v-if="selectedItemId" 
                  variant="tertiary" 
                  size="sm" 
                  @click="handleAddChildItem"
                >
                  添加子项目
                </IxButton>
            </template>
          </SchemeTree>

          <!-- 右侧：项目详情编辑表单 -->
          <div class="scheme-detail-panel">
            <div class="detail-header">
              <h3 v-if="selectedItem">{{ selectedItem.name }}</h3>
              <h3 v-else class="empty-title">请从左侧选择一个检测项目进行编辑</h3>
            </div>
            <div class="detail-form" v-if="selectedItem">
              <div class="form-section">
                <IxInput 
                  v-model="itemForm.name" 
                  label="项目名称" 
                  placeholder="请输入项目名称"
                />
                <IxInput 
                  v-model="itemForm.levelName" 
                  label="层级名称" 
                  placeholder="如：系统或设备级、装置级、模块级、检测项目、检测项明细"
                />
                <IxInput 
                  v-model="itemForm.levelStr" 
                  label="层级" 
                  placeholder="层级数字（1-5）"
                />
                <IxSelect 
                  v-model="itemForm.type" 
                  label="项目类型"
                >
                  <IxSelectItem label="外观检查" value="visual" />
                  <IxSelectItem label="电气参数" value="electrical" />
                  <IxSelectItem label="功能测试" value="functional" />
                  <IxSelectItem label="环境数据" value="environment" />
                </IxSelect>
                <div class="form-checkbox">
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input 
                      type="checkbox" 
                      v-model="itemForm.required"
                      style="cursor: pointer;"
                    />
                    <span>必填项</span>
                  </label>
                </div>
              </div>

              <div class="form-section" v-if="itemForm.type === 'electrical'">
                <h4>电气参数设置</h4>
                <IxInput 
                  v-model="itemForm.standardValueStr" 
                  label="标准值" 
                  placeholder="请输入标准值"
                />
                <IxInput 
                  v-model="itemForm.minThresholdStr" 
                  label="最小值阈值" 
                  placeholder="请输入最小值阈值"
                />
                <IxInput 
                  v-model="itemForm.maxThresholdStr" 
                  label="最大值阈值" 
                  placeholder="请输入最大值阈值"
                />
                <IxInput 
                  v-model="itemForm.unit" 
                  label="单位" 
                  placeholder="请输入单位（如：V, A, Ω）"
                />
              </div>

              <div class="form-section" v-if="itemForm.type === 'functional'">
                <h4>功能测试设置</h4>
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">测试步骤</label>
                  <textarea 
                    v-model="itemForm.testProcedure" 
                    placeholder="请输入测试步骤说明"
                    rows="4"
                    style="width: 100%; padding: 0.5rem; border: 1px solid var(--theme-color-soft-border); border-radius: 0.25rem; font-family: inherit; font-size: 0.875rem;"
                  />
                </div>
                <IxInput 
                  v-model="itemForm.expectedResult" 
                  label="预期结果" 
                  placeholder="请输入预期结果"
                />
              </div>

              <div class="form-section" v-if="itemForm.type === 'environment'">
                <h4>环境数据设置</h4>
                <IxInput 
                  v-model="itemForm.standardValueStr" 
                  label="标准值" 
                  placeholder="请输入标准值"
                />
                <IxInput 
                  v-model="itemForm.unit" 
                  label="单位" 
                  placeholder="请输入单位（如：℃, %RH）"
                />
                <IxInput 
                  v-model="itemForm.toleranceStr" 
                  label="允许偏差" 
                  placeholder="请输入允许偏差"
                />
              </div>

              <div class="form-actions">
                <IxButton variant="primary" @click="handleSaveItem">保存项目</IxButton>
                <IxButton variant="secondary" @click="handleCancelItem">取消</IxButton>
                <IxButton variant="secondary" @click="handleDeleteItem" style="color: var(--theme-color-alarm);">删除项目</IxButton>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>请从左侧树形结构中选择一个检测项目进行编辑</p>
              <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--theme-color-text-soft);">
                如果没有项目，请点击"添加根项目"按钮创建新项目
              </p>
            </div>
          </div>
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
import productCategoriesData from '@/mockdata/common/productCategories.json';
import maintenanceSchemesData from '@/mockdata/common/maintenanceSchemes.json';
import SchemeTree from '../components/SchemeTree.vue';
import {
  findItemById,
  isDetectionItem,
  type SchemeItem as SchemeItemType,
  type AtomicScheme as AtomicSchemeType,
} from '../utils/schemeUtils';
import { inspectionTemplatesApi } from '@/api';
import {
  isTemplateApiId,
  templateDtoToFormAndAtomic,
  buildTemplateDtoForSave,
  buildTemplateDtoForCreate,
} from '../utils/schemeInspectionTemplate';
import { importInspectionItemsFromExcel } from '../utils/importInspectionItemsFromExcel';
import { syncTemplateNodesWithProgress } from '../utils/syncTemplateNodes';
import { loadTemplateItemsByTemplateId } from '../utils/loadTemplateItems';

const route = useRoute();
const router = useRouter();

const schemeId = route.params.id as string;
const isNew = schemeId === 'new';

const loadedTemplateCreatedate = ref<string | null>(null);

// 使用共享的类型定义
type SchemeItem = SchemeItemType;
type AtomicScheme = AtomicSchemeType;


// 页面标题
const pageTitle = computed(() => {
  if (isNew) {
    if (!schemeForm.value.atomicType) return '新建原子方案';
    return schemeForm.value.atomicType === 'peripheral' ? '新建系统外围检测方案' : '新建设备检测方案';
  }
  return '编辑原子方案';
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

// 选中的检测项目ID
const selectedItemId = ref<string | null>(null);

// 当前方案数据
const currentAtomicScheme = ref<AtomicScheme | null>(null);

// 分类列表
const categories = productCategoriesData.categories;

// 子分类列表
const subCategories = computed(() => {
  if (!schemeForm.value.categoryId) return [];
  const category = categories.find(c => c.id === schemeForm.value.categoryId);
  return category?.subCategories || [];
});

const productCategoryLabel = computed(() =>
  schemeForm.value.atomicType === 'peripheral' ? '产品类别' : '产品分类',
);

const productSeriesLabel = computed(() =>
  schemeForm.value.atomicType === 'peripheral' ? '产品系列' : '子分类',
);


// 选中的检测项目
const selectedItem = computed(() => {
  if (!selectedItemId.value || !currentAtomicScheme.value) return null;
  return findItemById(currentAtomicScheme.value.items, selectedItemId.value);
});

// 项目编辑表单
const itemForm = ref({
  name: '',
  type: 'visual',
  required: true,
  level: 1,
  levelStr: '1',
  levelName: '',
  standardValueStr: '',
  minThresholdStr: '',
  maxThresholdStr: '',
  unit: '',
  testProcedure: '',
  expectedResult: '',
  toleranceStr: '',
});
const excelInputRef = ref<HTMLInputElement | null>(null);
const syncProgress = ref({ visible: false, percent: 0, message: '' });

// 树形模型（已由 SchemeTree 组件管理）

// 验证是否可以保存
const canSave = computed(() => {
  if (!schemeForm.value.atomicType || !schemeForm.value.name) return false;
  if (!currentAtomicScheme.value || !currentAtomicScheme.value.items || currentAtomicScheme.value.items.length === 0) {
    return false;
  }
  return true;
});

// 使用共享的工具函数（已从 schemeUtils 导入）

// 加载项目到表单
const loadItemToForm = (item: SchemeItem) => {
  // 只有检测项目（有 type 和 required）才能编辑
  const isItem = isDetectionItem(item);
  itemForm.value = {
    name: item.name,
    type: item.type || 'visual',
    required: isItem ? (item.required !== false) : true,
    level: 1,
    levelStr: '1',
    levelName: '',
    standardValueStr: item.standardValue?.toString() || '',
    minThresholdStr: item.minThreshold?.toString() || '',
    maxThresholdStr: item.maxThreshold?.toString() || '',
    unit: item.unit || '',
    testProcedure: item.testProcedure || '',
    expectedResult: item.expectedResult || '',
    toleranceStr: item.tolerance?.toString() || '',
  };
};

// 处理项目选择（由 SchemeTree 组件调用）
const handleItemSelected = (itemId: string) => {
  selectedItemId.value = itemId;
  const item = findItemById(currentAtomicScheme.value!.items, itemId);
      if (item) {
        loadItemToForm(item);
      }
};


// 添加根项目
const handleAddItem = () => {
  if (!currentAtomicScheme.value) return;
  
  const newItem: SchemeItem = {
    id: `new-${Date.now()}`,
    name: '新检测项目',
    dataType: 'boolean',
    priority: 'High',
    ruleType: 'boolean_equal',
    operationGuide: '',
    param1: '',
    param2: '',
    type: 'visual',
    required: true,
    children: [],
  };
  
  currentAtomicScheme.value.items.push(newItem);
  // SchemeTree 组件会自动更新
  setTimeout(() => {
    selectedItemId.value = newItem.id;
      loadItemToForm(newItem);
  }, 100);
};

// 添加子项目
const handleAddChildItem = () => {
  if (!selectedItemId.value || !currentAtomicScheme.value) return;
  
  const parentItem = findItemById(currentAtomicScheme.value.items, selectedItemId.value);
  if (!parentItem) return;
  
  const newChildItem: SchemeItem = {
    id: `new-${Date.now()}`,
    name: '新子项目',
    dataType: parentItem.dataType || 'boolean',
    priority: parentItem.priority || 'High',
    ruleType: parentItem.ruleType || 'boolean_equal',
    operationGuide: parentItem.operationGuide || '',
    param1: parentItem.param1 || '',
    param2: parentItem.param2 || '',
    type: parentItem.type || 'visual',
    required: true,
  };
  
  if (!parentItem.children) {
    parentItem.children = [];
  }
  
  parentItem.children.push(newChildItem);
  // SchemeTree 组件会自动更新
  setTimeout(() => {
    selectedItemId.value = newChildItem.id;
      loadItemToForm(newChildItem);
  }, 100);
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
    selectedItemId.value = null;
    showToast({ message: `导入成功，共导入 ${importedItems.length} 个根节点` });
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : 'Excel 导入失败' });
  } finally {
    input.value = '';
  }
};

// 保存项目
const handleSaveItem = () => {
  if (!selectedItem.value) return;
  
  Object.assign(selectedItem.value, {
    name: itemForm.value.name,
    type: itemForm.value.type,
    required: itemForm.value.required,
    standardValue: itemForm.value.standardValueStr ? parseFloat(itemForm.value.standardValueStr) : undefined,
    minThreshold: itemForm.value.minThresholdStr ? parseFloat(itemForm.value.minThresholdStr) : undefined,
    maxThreshold: itemForm.value.maxThresholdStr ? parseFloat(itemForm.value.maxThresholdStr) : undefined,
    unit: itemForm.value.unit,
    testProcedure: itemForm.value.testProcedure,
    expectedResult: itemForm.value.expectedResult,
    tolerance: itemForm.value.toleranceStr ? parseFloat(itemForm.value.toleranceStr) : undefined,
  });
  
  // SchemeTree 组件会自动更新
};

// 取消编辑
const handleCancelItem = () => {
  selectedItemId.value = null;
  itemForm.value = {
    name: '',
    type: 'visual',
    required: true,
    level: 1,
    levelStr: '1',
    levelName: '',
    standardValueStr: '',
    minThresholdStr: '',
    maxThresholdStr: '',
    unit: '',
    testProcedure: '',
    expectedResult: '',
    toleranceStr: '',
  };
};

// 删除项目
const handleDeleteItem = () => {
  if (!selectedItemId.value || !currentAtomicScheme.value) return;
  
  if (confirm('确定要删除这个检测项目吗？删除后其子项目也会被删除。')) {
    const removeItem = (items: SchemeItem[], itemId: string): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          items.splice(i, 1);
          return true;
        }
        if (items[i].children) {
          if (removeItem(items[i].children!, itemId)) {
            return true;
          }
        }
      }
      return false;
    };
    
    removeItem(currentAtomicScheme.value.items, selectedItemId.value);
    selectedItemId.value = null;
    // SchemeTree 组件会自动更新
    handleCancelItem();
  }
};

const handleSave = async () => {
  if (!canSave.value) {
    alert('请完善方案信息');
    return;
  }

  const atomicScheme: AtomicScheme = {
    id: isNew ? '0' : currentAtomicScheme.value?.id || '',
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
    if (isNew) {
      const payload = buildTemplateDtoForCreate(schemeForm.value, atomicScheme);
      const newId = await inspectionTemplatesApi.createInspectionTemplate(payload);
      syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
      await syncTemplateNodesWithProgress(newId, atomicScheme.items, (p) => {
        syncProgress.value = { visible: true, percent: p.percent, message: p.message };
      });
      syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
      showToast({ message: '保存成功' });
      router.push(`/scheme/view/${newId}`);
      return;
    }
    if (isTemplateApiId(schemeId)) {
      const templateId = Number.parseInt(schemeId, 10);
      await inspectionTemplatesApi.updateInspectionTemplate(
        buildTemplateDtoForSave(
          templateId,
          schemeForm.value,
          atomicScheme,
          loadedTemplateCreatedate.value,
        ),
      );
      syncProgress.value = { visible: true, percent: 1, message: '准备同步检测项...' };
      await syncTemplateNodesWithProgress(templateId, atomicScheme.items, (p) => {
        syncProgress.value = { visible: true, percent: p.percent, message: p.message };
      });
      syncProgress.value = { visible: true, percent: 100, message: '同步完成' };
      showToast({ message: '保存成功' });
      router.push('/scheme/list');
      return;
    }
    console.log('保存原子方案（本地 mock）:', atomicScheme);
    router.push('/scheme/list');
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '保存失败' });
  } finally {
    setTimeout(() => {
      syncProgress.value.visible = false;
    }, 300);
  }
};

// 取消
const handleCancel = () => {
  router.push('/scheme/list');
};

onMounted(() => {
  void (async () => {
    if (isNew) {
      return;
    }
    if (isTemplateApiId(schemeId)) {
      try {
        const dto = await inspectionTemplatesApi.getInspectionTemplate(Number.parseInt(schemeId, 10));
        loadedTemplateCreatedate.value = dto.createdate ?? null;
        const { schemeForm: sf, atomic } = templateDtoToFormAndAtomic(dto);
        const apiItems = await loadTemplateItemsByTemplateId(Number.parseInt(schemeId, 10));
        if (apiItems.length > 0) {
          atomic.items = apiItems;
        }
        schemeForm.value = sf;
        currentAtomicScheme.value = atomic;
        return;
      } catch (e) {
        console.error(e);
        alert('未找到该方案或加载失败');
        router.push('/scheme/list');
        return;
      }
    }
    const schemes = Array.isArray(maintenanceSchemesData) ? maintenanceSchemesData : [];
    const scheme = schemes.find((s) => s.id === schemeId);

    if (!scheme) {
      alert('未找到该方案');
      router.push('/scheme/list');
      return;
    }

    schemeForm.value = {
      name: scheme.name || '',
      description: scheme.description || '',
      atomicType:
        scheme.type === 'peripheral' || scheme.type === 'equipment'
          ? scheme.type
          : ('' as 'peripheral' | 'equipment' | ''),
      categoryId: scheme.categoryId || '',
      subCategoryId: scheme.subCategoryId || '',
      model: scheme.model || '',
    };

    const schemeItems: SchemeItem[] = (scheme.items || []).map((item: any) => ({
      ...item,
      type: item.type || '',
      required: item.required !== undefined ? item.required : false,
    })) as SchemeItem[];

    currentAtomicScheme.value = {
      id: scheme.id,
      name: scheme.name,
      type: scheme.type === 'peripheral' || scheme.type === 'equipment' ? scheme.type : 'peripheral',
      description: scheme.description,
      deviceTypes: scheme.deviceTypes || [],
      categoryId: scheme.categoryId,
      subCategoryId: scheme.subCategoryId,
      model: scheme.model,
      items: schemeItems,
    };
  })();
});

// 监听原子类型变化
watch(() => schemeForm.value.atomicType, (newType) => {
  if (newType) {
    // 初始化原子方案
    currentAtomicScheme.value = {
      id: '',
      name: '',
      type: newType as 'peripheral' | 'equipment',
      items: [],
    };
  }
});

// 监听分类变化，更新子分类
watch(() => schemeForm.value.categoryId, () => {
  if (schemeForm.value.categoryId) {
    schemeForm.value.subCategoryId = '';
  }
});
</script>

<style scoped>
.scheme-edit-page {
  height: 100%;
}

.page-section {
  padding: 1rem;
  height: calc(100vh - 80px);
  overflow-y: auto;
}

.page-content {
  max-width: 100%;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 方案类型选择 */
.scheme-type-selection {
  margin-bottom: 1rem;
}

.scheme-type-selection h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.selection-hint {
  margin: 0 0 1rem 0;
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.type-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.type-card {
  cursor: pointer;
  transition: all 0.2s;
}

.type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.card-content p {
  margin: 0 0 0.75rem 0;
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.card-content ul {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.card-content li {
  margin: 0.25rem 0;
}

/* 方案基本信息 */
.scheme-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

/* 原子方案选择 */
.atomic-scheme-selection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.atomic-scheme-selection h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.selection-info {
  padding: 0.75rem 1rem;
  background: var(--theme-color-primary-soft);
  border-radius: 0.25rem;
}

.info-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--theme-color-primary);
}

.required-indicator {
  color: var(--theme-color-alarm);
  margin-right: 0.25rem;
}

.scheme-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scheme-group h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.scheme-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.scheme-card {
  cursor: pointer;
  transition: all 0.2s;
}

.scheme-card:hover {
  transform: translateY(-2px);
}

.scheme-card-content h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.scheme-desc {
  margin: 0 0 0.5rem 0;
  color: var(--theme-color-text-soft);
  font-size: 0.875rem;
}

.scheme-info {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
}

.scheme-info span {
  font-weight: 500;
}

/* 方案预览 */
.scheme-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.25rem;
}

.scheme-preview h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.preview-tree {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--theme-color-background);
  border-radius: 0.25rem;
}

/* 左树右表布局 */
.scheme-edit-container {
  display: flex;
  gap: 1rem;
  height: calc(100% - 200px);
  min-height: 500px;
}

.scheme-tree-panel {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  background: var(--theme-color-background);
  overflow: hidden;
}

.tree-header {
  padding: 1rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
  background: var(--theme-color-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tree-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.tree-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tree-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0.5rem;
}

.tree-container :deep(.ix-tree-item) {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.tree-container :deep(.ix-tree-item:hover) {
  background-color: var(--theme-color-soft-hover);
}

.tree-container :deep(.ix-tree-item.selected) {
  background-color: var(--theme-color-primary-soft);
  color: var(--theme-color-primary);
}

.scheme-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  background: var(--theme-color-background);
  overflow: hidden;
}

.detail-header {
  padding: 1rem;
  border-bottom: 1px solid var(--theme-color-soft-border);
  background: var(--theme-color-soft);
}

.detail-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.detail-header .empty-title {
  color: var(--theme-color-text-soft);
  font-weight: 400;
}

.detail-form {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section h4 {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color-text-soft);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-checkbox {
  margin-top: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--theme-color-text-soft);
  text-align: center;
  padding: 2rem;
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
