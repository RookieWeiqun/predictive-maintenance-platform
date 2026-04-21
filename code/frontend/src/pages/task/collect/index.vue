<!-- 报告数据采集页 -->
<template>
  <div class="task-collect-page">
    <!-- 左侧边栏 -->
      <div class="left-sidebar">
        <!-- 返回按钮 -->
        <div class="back-button-section">
          <IxIconButton 
            :icon="iconChevronLeft" 
            variant="tertiary" 
            @click="goBack"
            title="返回设备列表"
          />
        </div>
        <!-- 当前任务 -->
        <IxCard class="device-card">
          <div class="device-header">
            <div class="device-name">
              <IxSelect 
                v-model="currentTaskId"
                @update:modelValue="handleTaskChange"
                class="task-select"
              >
                <IxSelectItem
                  v-for="task in projectTaskList"
                  :key="task.id"
                  :value="task.id"
                  :label="getTaskDisplayName(task)"
                />
              </IxSelect>
            </div>
            <div class="device-model">{{ taskInfo?.schemeName || '-' }}</div>
          </div>
          <div class="device-progress">
            <div class="progress-info">
              <span>{{ overallCompleted }}/{{ overallTotal }} 已完成</span>
              <span class="progress-percent">{{ overallProgress }}% 进度</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: overallProgress + '%' }"></div>
            </div>
          </div>
        </IxCard>

        <!-- 检查人员 -->
        <IxCard class="inspector-card">
          <div class="card-title">检查人员</div>
          <IxInput
            v-model="inspectorName"
            placeholder="请输入姓名"
            class="inspector-input"
          />
        </IxCard>

        <!-- 检查类别导航 - 使用Event List -->
        <IxCard class="category-nav-card">
          <IxEventList>
            <template v-for="category in categoryList" :key="category.id">
              <IxEventListItem
                :selected="expandedCategories.includes(category.id)"
                itemColor="color-primary"
                @click="toggleCategory(category.id)"
              >
                <div class="event-item-content">
                  <span class="category-name">{{ category.name }}</span>
                  <span class="category-count">{{ category.completed }}/{{ category.total }}</span>
                </div>
              </IxEventListItem>
              <template v-if="expandedCategories.includes(category.id)">
                <IxEventListItem
                  v-for="subCategory in category.children"
                  :key="subCategory.id"
                  :selected="currentSubCategoryId === subCategory.id"
                  :itemColor="getSubCategoryItemColor(subCategory)"
                  @click="selectSubCategory(subCategory)"
                  class="sub-category-event-item"
                >
                  <div class="event-item-content">
                    <span class="sub-category-icon" :class="{ active: currentSubCategoryId === subCategory.id }">
                      {{ currentSubCategoryId === subCategory.id ? '●' : '○' }}
                    </span>
                    <span class="sub-category-name">{{ subCategory.name }}</span>
                    <span class="sub-category-count">{{ subCategory.completed }}/{{ subCategory.total }}</span>
                  </div>
                </IxEventListItem>
              </template>
            </template>
          </IxEventList>
        </IxCard>

        <!-- 帮助按钮 -->
        <div class="help-button">
          <IxIconButton
            :icon="iconBulb"
            variant="primary"
            shape="circle"
            size="24"
            @click="showHelpModal = true"
            title="帮助"
          />
        </div>
        
        <!-- 帮助对话框 -->
        <IxModal
          v-model:visible="showHelpModal"
          title="使用说明"
          :width="500"
          @ok="showHelpModal = false"
          @cancel="showHelpModal = false"
        >
          <div class="help-content">
            <p><strong>数据采集流程：</strong></p>
            <ol>
              <li>在"数据采集"区域填写检测数据</li>
              <li>在"检测过程及结果"区域选择检测结果（正常/警告/异常）</li>
              <li>如有异常或警告，请在备注中详细说明</li>
              <li>完成所有检测项后，可以保存并提交数据</li>
            </ol>
            <p><strong>检测结果说明：</strong></p>
            <ul>
              <li><strong>正常：</strong>所有参数指标符合技术标准，无需特别关注</li>
              <li><strong>警告：</strong>参数接近阈值边界，需持续观察和下次重点检查</li>
              <li><strong>异常：</strong>超出标准范围或存在明显故障，需立即处理并上报</li>
            </ul>
          </div>
        </IxModal>
      </div>

      <!-- 右侧主内容 -->
      <div class="main-content">
        <!-- 面包屑导航 -->
        <div class="breadcrumb-section">
          <IxBreadcrumb>
            <IxBreadcrumbItem>{{ currentCategoryPath }}</IxBreadcrumbItem>
            <IxBreadcrumbItem>{{ currentSubCategoryName }} 共{{ currentItemCount }}项</IxBreadcrumbItem>
          </IxBreadcrumb>
        </div>
        
        <div class="task-list">
          <div
            v-for="(task, index) in currentTaskList"
            :key="task.id"
            class="task-item"
          >
            <!-- 任务标题 -->
            <div class="task-header">
              <span class="task-number">{{ index + 1 }}</span>
              <span class="task-title">{{ task.name }}</span>
            </div>

            <!-- 任务描述 -->
            <div class="task-description">{{ task.description || '请根据实际情况进行检测并填写数据' }}</div>

            <!-- 数据采集和检测结果 - 左右布局 -->
            <div class="data-and-result-layout">
              <!-- 左侧：数据采集 -->
              <div class="data-collection-section">
                <div class="section-title">数据采集</div>
                <div class="data-fields">
                  <div
                    v-for="field in task.dataFields"
                    :key="field.id"
                    class="data-field"
                  >
                    <IxFieldLabel :htmlFor="`field-${field.id}`">
                      {{ field.name }}
                      <span v-if="field.required" class="required-mark">*</span>
                    </IxFieldLabel>
                    <!-- 布尔类型使用Toggle按钮 -->
                    <IxToggleButton
                      v-if="field.dataType === 'boolean'"
                      :id="`field-${field.id}`"
                      variant="secondary"
                      :pressed="field.value === true || field.value === 'true'"
                      @click="handleToggleField(field.id, !(field.value === true || field.value === 'true'))"
                      class="full-width-toggle"
                    >
                      {{ field.value === true || field.value === 'true' ? '是' : '否' }}
                    </IxToggleButton>
                    <!-- 数值类型使用数字输入 -->
                    <div v-else-if="field.dataType === 'numeric'" class="numeric-input-wrapper">
                      <IxInput
                        :id="`field-${field.id}`"
                        v-model="field.value"
                        :placeholder="field.placeholder || '请输入'"
                        class="full-width-input"
                        @update:modelValue="handleFieldUpdate(field.id, $event)"
                      />
                      <span v-if="field.unit" class="field-unit-inline">{{ field.unit }}</span>
                    </div>
                    <!-- 字符串类型使用文本输入 -->
                    <IxInput
                      v-else
                      :id="`field-${field.id}`"
                      v-model="field.value"
                      :placeholder="field.placeholder || '请输入'"
                      class="full-width-input"
                      @update:modelValue="handleFieldUpdate(field.id, $event)"
                    />
                  </div>
                </div>
                
                <!-- 备注说明移到数据采集下方 -->
                <div class="remarks-section">
                  <div class="section-title">备注说明</div>
                  <IxTextarea
                    v-model="task.remarks"
                    placeholder="如有异常或需要补充说明的内容..."
                    textarea-width="400px"
                    @update:modelValue="handleRemarksUpdate(task.id, $event)"
                  />
                </div>
              </div>

              <!-- 右侧：检测过程及结果 -->
              <div class="detection-result-section">
                <div class="section-title">
                  检测过程及结果
                  <span class="required-mark">*</span>
                </div>
                
                <!-- 检测过程指导 -->
                <div class="detection-guide">
                  <div class="guide-text">{{ getDetectionGuide(task) }}</div>
                </div>

                <!-- 检查结果选择 - 使用IxButton -->
                <div class="result-selection">
                  <IxButton
                    v-for="resultType in resultTypes"
                    :key="resultType.value"
                    variant="secondary"
                    :icon="resultType.icon"
                    :class="getResultButtonClass(task.result, resultType.value)"
                    @click="selectResult(task.id, resultType.value)"
                    class="result-button-ix"
                  >
                    <div class="result-button-content">
                      <div class="result-label">{{ resultType.label }}</div>
                    </div>
                  </IxButton>
                </div>

                <div class="result-hint">
                  选择"警告"或"异常"时,请在下方备注中详细说明
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部导航 -->
        <div class="bottom-navigation">
          <div 
            class="nav-button-large"
            :class="{ disabled: !hasPreviousModule }"
            @click="hasPreviousModule && goToPreviousModule()"
          >
            <div class="nav-button-text">« 上一模块</div>
          </div>
          <div 
            class="nav-button-large"
            :class="{ disabled: !hasNextModule }"
            @click="hasNextModule && goToNextModule()"
          >
            <div class="nav-button-text">下一模块 »</div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  IxButton,
  IxCard,
  IxInput,
  IxTextarea,
  IxFieldLabel,
  IxBreadcrumb,
  IxBreadcrumbItem,
  IxToggleButton,
  IxIconButton,
  IxEventList,
  IxEventListItem,
  IxSelect,
  IxSelectItem,
  IxModal,
  showToast,
} from "@siemens/ix-vue";
import { 
  iconChevronLeft,
  iconCheck,
  iconWarning,
  iconError,
  iconBulb
} from "@siemens/ix-icons/icons";
import tasksData from '@/mockdata/task/tasks.json';
import { getSchemeById } from '@/mockdata/scheme/index.ts';
import {
  inspectionTasksApi,
  inspectionTemplatesApi,
  productsApi,
  taskitemsApi,
} from '@/api';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import { isDetectionItem, type SchemeItem } from '@/pages/scheme/utils/schemeUtils';

const router = useRouter();
const route = useRoute();

const routeTaskId = computed(() => String(route.params.taskId ?? ''));

// 任务信息
const taskInfo = ref<any>(null);


// 检查人员
const inspectorName = ref('');

// 帮助对话框显示状态
const showHelpModal = ref(false);

// 当前任务ID（用于下拉选择）
const currentTaskId = ref<string>('');

// 项目任务列表
const projectTaskList = ref<any[]>([]);

// 获取任务显示名称
const getTaskDisplayName = (task: any) => {
  if (task.taskDisplayName) return task.taskDisplayName;
  if (task.taskType === 'peripheral') {
    return `${task.id} - ${task.taskTypeLabel}`;
  }
  return `${task.id} - ${task.deviceModel} (${task.taskTypeLabel})`;
};

// 切换任务
const handleTaskChange = (newTaskId: string) => {
  if (newTaskId && newTaskId !== routeTaskId.value) {
    router.push(`/task/collect/${newTaskId}`);
  }
};

function clip200(s: string): string {
  const t = s.trim();
  if (t.length <= 200) return t;
  return t.slice(0, 200);
}

/** 将模板 SchemeItem 树压平为采集页 buildCategoryList 所需的四层结构中的一层「检测模块」子项 */
function apiTemplateRootsToCollectSchemeItems(roots: SchemeItem[]): SchemeItem[] {
  const leaves: SchemeItem[] = [];
  function walk(nodes: SchemeItem[]) {
    for (const n of nodes || []) {
      if (isDetectionItem(n)) {
        leaves.push(n);
        continue;
      }
      if (n.children?.length) walk(n.children);
    }
  }
  walk(roots);
  if (leaves.length === 0) return [];

  const moduleWrapper: SchemeItem = {
    id: 'api-collect-module',
    name: '检测项',
    children: leaves,
  };
  const subWrapper: SchemeItem = {
    id: 'api-collect-sub',
    name: '全部模块',
    children: [moduleWrapper],
  };
  const catWrapper: SchemeItem = {
    id: 'api-collect-category',
    name: '巡检任务',
    children: [subWrapper],
  };
  return [catWrapper];
}

function detectionItemIdToNamePath(roots: SchemeItem[]): Map<string, { name: string; categorypath: string }> {
  const map = new Map<string, { name: string; categorypath: string }>();
  function walk(nodes: SchemeItem[], path: string[]) {
    for (const n of nodes || []) {
      if (isDetectionItem(n)) {
        const cp = clip200(path.join(' / '));
        map.set(n.id, {
          name: clip200((n.name || '').trim() || '未命名'),
          categorypath: cp,
        });
        continue;
      }
      const label = (n.name || '').trim();
      walk(n.children || [], label ? [...path, label] : path);
    }
  }
  walk(roots, []);
  return map;
}

function mapBackendResultToUi(raw: string | null | undefined): '' | 'normal' | 'warning' | 'abnormal' {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s === 'normal' || s === '正常') return 'normal';
  if (s === 'warning' || s === '警告') return 'warning';
  if (s === 'abnormal' || s === '异常') return 'abnormal';
  return '';
}

async function mergeTaskitemsFromApi(taskid: number, roots: SchemeItem[]): Promise<void> {
  const idToPath = detectionItemIdToNamePath(roots);
  let items: Awaited<ReturnType<typeof taskitemsApi.listTaskitemsByTask>>;
  try {
    items = await taskitemsApi.listTaskitemsByTask(taskid);
  } catch {
    return;
  }
  for (const ti of items) {
    const rName = (ti.name ?? '').trim();
    const rPath = (ti.categorypath ?? '').trim();
    const schemeId = [...idToPath.entries()].find(
      ([, v]) => v.name === rName && v.categorypath === rPath,
    )?.[0];
    if (!schemeId) continue;
    const resultUi = mapBackendResultToUi(ti.result);
    if (!taskDataMap.value[schemeId]) taskDataMap.value[schemeId] = {};
    if (resultUi) taskDataMap.value[schemeId].result = resultUi;
  }
}

function setupFromMockTask(task: any): void {
  taskInfo.value = task;
  currentTaskId.value = routeTaskId.value;

  projectTaskList.value = tasksData.tasks.filter(
    (t: any) => t.projectId === task.projectId && !t.isSubTask,
  );

  let scheme: any = null;
  const taskSchemeKey = `task_scheme_${routeTaskId.value}_${task.schemeId}`;
  try {
    const taskSchemeData = localStorage.getItem(taskSchemeKey);
    if (taskSchemeData) {
      scheme = JSON.parse(taskSchemeData);
    }
  } catch (e) {
    console.error('读取项目方案失败:', e);
  }

  if (!scheme) {
    scheme = getSchemeById(task.schemeId);
  }

  if (scheme && scheme.items) {
    buildCategoryList(scheme.items);
  }

  loadDraft();
}

async function setupFromApiTask(numericId: number): Promise<void> {
  const dto = await inspectionTasksApi.getInspectionTask(numericId);
  const [roots, templateMeta] = await Promise.all([
    loadTemplateItemsByTemplateId(dto.templateid),
    inspectionTemplatesApi.getInspectionTemplate(dto.templateid).catch(() => null),
  ]);

  const products = await productsApi.searchProducts({ productid: dto.productid }).catch(() => []);
  const mlfb = (products[0]?.mlfb ?? '-').trim() || '-';

  const displayTaskNo = (dto.taskNo ?? '').trim() || `任务#${numericId}`;
  const inspType = templateMeta?.inspectiontype === 1 ? 'equipment' : 'peripheral';
  const inspLabel = templateMeta?.inspectiontype === 1 ? '设备检测' : '外围检测';

  taskInfo.value = {
    id: displayTaskNo,
    schemeName: templateMeta?.name?.trim() || `模板 #${dto.templateid}`,
    schemeId: String(dto.templateid),
    taskType: inspType,
    taskTypeLabel: inspLabel,
    deviceModel: mlfb,
    projectId: String(dto.projectid),
    projectNo: '',
    projectName: '',
    isSubTask: false,
  };

  currentTaskId.value = String(numericId);

  const siblings = await inspectionTasksApi.searchInspectionTasks({ projectid: dto.projectid });
  const sorted = siblings
    .filter((t) => t.taskid != null && t.taskid > 0)
    .sort((a, b) => (a.taskid ?? 0) - (b.taskid ?? 0));

  const productIds = [...new Set(sorted.map((t) => t.productid))];
  const productMlfb = new Map<number, string>();
  await Promise.all(
    productIds.map(async (pid) => {
      const list = await productsApi.searchProducts({ productid: pid }).catch(() => []);
      productMlfb.set(pid, (list[0]?.mlfb ?? '-').trim() || '-');
    }),
  );

  projectTaskList.value = sorted.map((t) => {
    const tid = t.taskid as number;
    const dm = productMlfb.get(t.productid) ?? '-';
    const label = (t.taskNo ?? '').trim() || `任务#${tid}`;
    return {
      id: String(tid),
      taskType: 'equipment',
      taskTypeLabel: '巡检',
      deviceModel: dm,
      taskDisplayName: `${label} — ${dm}`,
    };
  });

  const schemeItems = apiTemplateRootsToCollectSchemeItems(roots);
  if (schemeItems.length === 0) {
    showToast({ message: '模板中暂无检测项，无法采集' });
    router.push('/task/list');
    return;
  }

  buildCategoryList(schemeItems as any[]);
  await mergeTaskitemsFromApi(numericId, roots);
  loadDraft();
  updateCompletionCounts();
}

async function initTaskCollect(): Promise<void> {
  const idParam = routeTaskId.value;
  if (!idParam) {
    showToast({ message: '无效的任务参数' });
    router.push('/task/list');
    return;
  }

  expandedCategories.value = [];
  currentSubCategoryId.value = '';
  currentSubCategoryName.value = '环境检查';
  categoryList.value = [];
  currentTaskList.value = [];
  taskDataMap.value = {};

  const mockTask = tasksData.tasks.find((t: any) => t.id === idParam);
  if (mockTask) {
    setupFromMockTask(mockTask);
    return;
  }

  const numericId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    showToast({ message: '未找到任务' });
    router.push('/task/list');
    return;
  }

  try {
    await setupFromApiTask(numericId);
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '加载任务失败' });
    router.push('/task/list');
  }
}

// 当前选中的子类别
const currentSubCategoryId = ref<string>('');
const currentSubCategoryName = ref('环境检查');

// 展开的类别
const expandedCategories = ref<string[]>([]);

// 类别列表（从方案数据生成）
const categoryList = ref<any[]>([]);

// 当前任务列表
const currentTaskList = ref<any[]>([]);

// 任务数据（存储所有任务的检测结果）
const taskDataMap = ref<Record<string, any>>({});

// 计算属性
const currentCategoryPath = computed(() => {
  const category = categoryList.value.find(cat => 
    cat.children?.some((sub: any) => sub.id === currentSubCategoryId.value)
  );
  return category?.name || '系统外围';
});

const currentItemCount = computed(() => {
  return currentTaskList.value.length;
});

// 获取检测过程指导文字
const getDetectionGuide = (task: any): string => {
  const name = task.name || '';
  
  if (name.includes('温度')) {
    return '1. 使用温度计测量电气室内的环境温度；\n2. 记录测量值，确保在标准范围内（通常为-10°C至+40°C）；\n3. 如发现异常，检查空调系统或通风设备是否正常工作。';
  } else if (name.includes('湿度')) {
    return '1. 使用湿度计测量电气室内的相对湿度；\n2. 记录测量值，确保在标准范围内（通常为10%至90%RH）；\n3. 如发现异常，检查除湿设备或通风系统是否正常工作。';
  } else if (name.includes('凝露')) {
    return '1. 目视检查柜内是否有水珠或凝露现象；\n2. 检查柜体密封性是否良好；\n3. 如发现凝露，检查环境湿度和温度是否过高，必要时启动除湿设备。';
  } else if (name.includes('电压') || name.includes('电流')) {
    return '1. 使用万用表或钳形表测量相关电气参数；\n2. 记录测量值，与标准值进行对比；\n3. 如发现异常，检查接线是否松动，设备是否正常运行。';
  } else if (name.includes('绝缘')) {
    return '1. 使用绝缘电阻测试仪测量绝缘电阻值；\n2. 确保测量值符合标准要求（通常≥1MΩ）；\n3. 如发现异常，检查设备是否有受潮或损坏现象。';
  }
  
  return '1. 按照标准检测流程进行检测；\n2. 记录检测数据和观察结果；\n3. 如发现异常情况，及时记录并上报。';
};

// 检测结果类型
const resultTypes = [
  { value: 'normal', icon: iconCheck, label: '正常' },
  { value: 'warning', icon: iconWarning, label: '警告' },
  { value: 'abnormal', icon: iconError, label: '异常' },
];

const overallTotal = computed(() => {
  let total = 0;
  categoryList.value.forEach(category => {
    category.children?.forEach((sub: any) => {
      total += sub.total;
    });
  });
  return total;
});

const overallCompleted = computed(() => {
  let completed = 0;
  categoryList.value.forEach(category => {
    category.children?.forEach((sub: any) => {
      completed += sub.completed;
    });
  });
  return completed;
});

const overallProgress = computed(() => {
  if (overallTotal.value === 0) return 0;
  return Math.round((overallCompleted.value / overallTotal.value) * 100);
});

const hasPreviousModule = computed(() => {
  const currentIndex = categoryList.value.findIndex(cat => 
    cat.children?.some((sub: any) => sub.id === currentSubCategoryId.value)
  );
  if (currentIndex === -1) return false;
  
  // 检查当前类别内是否有上一个子类别
  const category = categoryList.value[currentIndex];
  const subIndex = category.children?.findIndex((sub: any) => sub.id === currentSubCategoryId.value) || -1;
  
  if (subIndex > 0) return true;
  if (currentIndex > 0) return true;
  return false;
});

const hasNextModule = computed(() => {
  const currentIndex = categoryList.value.findIndex(cat => 
    cat.children?.some((sub: any) => sub.id === currentSubCategoryId.value)
  );
  if (currentIndex === -1) return false;
  
  const category = categoryList.value[currentIndex];
  const subIndex = category.children?.findIndex((sub: any) => sub.id === currentSubCategoryId.value) || -1;
  
  if (subIndex !== -1 && subIndex < category.children.length - 1) return true;
  if (currentIndex < categoryList.value.length - 1) return true;
  return false;
});

onMounted(() => {
  void initTaskCollect();
});

watch(
  () => route.params.taskId,
  (next, prev) => {
    if (next === prev) return;
    void initTaskCollect();
  },
);

// 构建类别列表
const buildCategoryList = (items: any[]) => {
  const categories: any[] = [];
  
  items.forEach(item => {
    if (item.children && item.children.length > 0) {
      const category: any = {
        id: item.id,
        name: item.name,
        children: [],
        total: 0,
        completed: 0,
      };
      
      item.children.forEach((subItem: any) => {
        if (subItem.children && subItem.children.length > 0) {
          // 查找第三层（检测模块）
          subItem.children.forEach((module: any) => {
            if (module.children && module.children.length > 0) {
              // 计算该子类别的任务总数
              const taskCount = countTasks(module.children);
              category.total += taskCount;
              
              const subCategory: any = {
                id: subItem.id,
                name: subItem.name,
                total: taskCount,
                completed: 0,
                moduleId: module.id,
                moduleData: module,
              };
              
              category.children.push(subCategory);
            }
          });
        }
      });
      
      if (category.children.length > 0) {
        categories.push(category);
        // 默认展开第一个类别
        if (categories.length === 1) {
          expandedCategories.value.push(category.id);
        }
      }
    }
  });
  
  categoryList.value = categories;
  
  // 默认选择第一个子类别
  if (categories.length > 0 && categories[0].children.length > 0) {
    selectSubCategory(categories[0].children[0]);
  }
  
  // 初始化完成数量
  updateCompletionCounts();
};

// 计算任务数量（递归计算检测项目）
const countTasks = (items: any[]): number => {
  let count = 0;
  items.forEach(item => {
    if (item.type && item.required !== undefined) {
      // 这是一个检测项目
      if (item.children && item.children.length > 0) {
        // 有子项，计算子项数量
        count += item.children.filter((child: any) => child.type).length;
      } else {
        // 没有子项，算作一个任务
        count += 1;
      }
    } else if (item.children) {
      // 继续递归
      count += countTasks(item.children);
    }
  });
  return count;
};

// 切换类别展开/折叠
const toggleCategory = (categoryId: string) => {
  const index = expandedCategories.value.indexOf(categoryId);
  if (index > -1) {
    expandedCategories.value.splice(index, 1);
  } else {
    expandedCategories.value.push(categoryId);
  }
};

// 选择子类别
const selectSubCategory = (subCategory: any) => {
  currentSubCategoryId.value = subCategory.id;
  currentSubCategoryName.value = subCategory.name;
  
  // 构建当前子类别的任务列表
  buildTaskList(subCategory);
  
  // 更新完成数量
  updateCompletionCounts();
};

// 创建任务项
const createTaskItem = (item: any, existingData: any) => {
  const dataFields = buildDataFields(item);
  // 恢复数据字段的值
  if (existingData.dataFields) {
    dataFields.forEach((field: any) => {
      if (existingData.dataFields[field.id] !== undefined) {
        field.value = existingData.dataFields[field.id];
      }
    });
  }
  
  return {
    id: item.id,
    name: item.name,
    description: getTaskDescription(item),
    dataFields,
    result: existingData.result || '',
    remarks: existingData.remarks || '',
  };
};

// 构建任务列表
const buildTaskList = (subCategory: any) => {
  const tasks: any[] = [];
  
  if (!subCategory.moduleData?.children) {
    currentTaskList.value = tasks;
    return;
  }
  
  subCategory.moduleData.children.forEach((item: any) => {
    if (!(item.type && item.required !== undefined)) return;
    
    const itemsToProcess = item.children?.length > 0 
      ? item.children.filter((child: any) => child.type)
      : [item];
    
    itemsToProcess.forEach((processItem: any) => {
      const existingData = taskDataMap.value[processItem.id] || {};
      tasks.push(createTaskItem(processItem, existingData));
    });
  });
  
  currentTaskList.value = tasks;
};

// 获取任务描述
const getTaskDescription = (item: any): string => {
  // 根据任务类型生成描述
  if (item.name.includes('温度')) {
    return '检测电气室内温度和湿度是否在正常范围内';
  } else if (item.name.includes('湿度')) {
    return '检测电气室内温度和湿度是否在正常范围内';
  } else if (item.name.includes('凝露')) {
    return '检查柜内是否有凝露现象';
  }
  return '请根据实际情况进行检测并填写数据';
};

// 判断数据类型
const getDataType = (item: any): 'boolean' | 'numeric' | 'string' => {
  const name = item.name || '';
  const type = item.type || '';
  const unit = item.unit || '';
  
  // 如果名称包含"是否"、"是否正常"、"是否符合"等，判断为布尔类型
  if (name.includes('是否') || name.includes('是否正常') || name.includes('是否符合')) {
    return 'boolean';
  }
  
  // 如果有单位或者是electrical/environment类型，判断为数值类型
  if (unit || type === 'electrical' || type === 'environment') {
    return 'numeric';
  }
  
  // 默认字符串类型
  return 'string';
};

// 构建数据字段
const buildDataFields = (item: any): any[] => {
  const fields: any[] = [];
  
  // 如果有子项，为每个子项创建字段
  if (item.children && item.children.length > 0) {
    item.children.forEach((child: any) => {
      const dataType = getDataType(child);
      const fieldName = child.name || item.name;
      
      fields.push({
        id: child.id,
        name: fieldName,
        placeholder: dataType === 'boolean' ? '' : '请输入',
        dataType: dataType,
        type: dataType === 'numeric' ? 'number' : 'text',
        required: child.required !== false,
        unit: child.unit || '',
        value: dataType === 'boolean' ? false : '',
      });
    });
  } else {
    // 没有子项，为当前项创建字段
    const dataType = getDataType(item);
    
    fields.push({
      id: item.id + '_value',
      name: item.name,
      placeholder: dataType === 'boolean' ? '' : '请输入',
      dataType: dataType,
      type: dataType === 'numeric' ? 'number' : 'text',
      required: item.required !== false,
      unit: item.unit || '',
      value: dataType === 'boolean' ? false : '',
    });
  }
  
  return fields;
};

// 更新字段值
const handleFieldUpdate = (fieldId: string, value: any) => {
  const task = currentTaskList.value.find(t => 
    t.dataFields.some((f: any) => f.id === fieldId)
  );
  if (!task) return;
  
  const field = task.dataFields.find((f: any) => f.id === fieldId);
  if (!field) return;
  
  // 数值类型转换为数字
  field.value = field.dataType === 'numeric' && value !== '' 
    ? Number(value) 
    : value;
  
  // 保存到任务数据
  if (!taskDataMap.value[task.id]) {
    taskDataMap.value[task.id] = {};
  }
  if (!taskDataMap.value[task.id].dataFields) {
    taskDataMap.value[task.id].dataFields = {};
  }
  taskDataMap.value[task.id].dataFields[fieldId] = field.value;
  
  saveDraft();
};

// 处理Toggle按钮切换
const handleToggleField = (fieldId: string, value: boolean) => {
  handleFieldUpdate(fieldId, value);
};

// 更新任务数据
const updateTaskData = (taskId: string, updates: Record<string, any>) => {
  const task = currentTaskList.value.find(t => t.id === taskId);
  if (!task) return;
  
  Object.assign(task, updates);
  
  if (!taskDataMap.value[taskId]) {
    taskDataMap.value[taskId] = {};
  }
  Object.assign(taskDataMap.value[taskId], updates);
  
  saveDraft();
};

// 获取检测结果按钮的类名
const getResultButtonClass = (currentResult: string, resultType: string) => {
  const classes: string[] = [];
  
  if (currentResult === resultType) {
    classes.push('result-button-active');
    // 根据结果类型添加对应的颜色类
    if (resultType === 'normal') {
      classes.push('result-button-success');
    } else if (resultType === 'warning') {
      classes.push('result-button-warning');
    } else if (resultType === 'abnormal') {
      classes.push('result-button-error');
    }
  }
  
  return classes.join(' ');
};

// 选择检测结果
const selectResult = (taskId: string, result: string) => {
  const task = currentTaskList.value.find(t => t.id === taskId);
  if (task) {
    task.result = result;
  }
  updateTaskData(taskId, { result });
  updateCompletionCounts();
};

// 更新备注
const handleRemarksUpdate = (taskId: string, remarks: string) => {
  updateTaskData(taskId, { remarks });
};


// 获取子类别的 itemColor
const getSubCategoryItemColor = (subCategory: any): string => {
  // 获取该子类别的所有任务结果
  let hasAbnormal = false;
  let hasWarning = false;
  
  if (subCategory.moduleData && subCategory.moduleData.children) {
    subCategory.moduleData.children.forEach((item: any) => {
      if (item.type && item.required !== undefined) {
        const itemsToCheck = item.children && item.children.length > 0
          ? item.children.filter((child: any) => child.type)
          : [item];
        
        itemsToCheck.forEach((checkItem: any) => {
          const taskId = checkItem.id;
          const taskData = taskDataMap.value[taskId];
          if (taskData && taskData.result) {
            if (taskData.result === 'abnormal') {
              hasAbnormal = true;
            } else if (taskData.result === 'warning') {
              hasWarning = true;
            }
          }
        });
      }
    });
  }
  
  // 根据状态返回对应的 itemColor
  if (subCategory.completed === 0) {
    // 未检测：使用默认颜色（不设置或使用 neutral）
    return '';
  } else if (hasAbnormal) {
    // 有异常：红色
    return 'color-alarm';
  } else if (hasWarning) {
    // 有警告：黄色
    return 'color-warning';
  } else if (subCategory.completed === subCategory.total) {
    // 都通过：绿色
    return 'color-success';
  } else {
    // 部分完成但没有异常和警告：使用默认颜色
    return '';
  }
};

// 更新完成数量
const updateCompletionCounts = () => {
  // 重新计算所有子类别的完成数量
  categoryList.value.forEach(category => {
    category.completed = 0;
    category.children.forEach((sub: any) => {
      // 计算该子类别的完成数量
      let completed = 0;
      if (sub.moduleData && sub.moduleData.children) {
        sub.moduleData.children.forEach((item: any) => {
          if (item.type && item.required !== undefined) {
            if (item.children && item.children.length > 0) {
              item.children.forEach((child: any) => {
                if (child.type) {
                  const taskId = child.id;
                  if (taskDataMap.value[taskId] && taskDataMap.value[taskId].result) {
                    completed++;
                  }
                }
              });
            } else {
              const taskId = item.id;
              if (taskDataMap.value[taskId] && taskDataMap.value[taskId].result) {
                completed++;
              }
            }
          }
        });
      }
      sub.completed = completed;
      category.completed += completed;
    });
  });
};

// 加载草稿
const loadDraft = () => {
  const draftKey = `task_draft_${routeTaskId.value}`;
  try {
    const draftData = localStorage.getItem(draftKey);
    if (draftData) {
      const draft = JSON.parse(draftData);
      if (draft.taskDataMap) {
        taskDataMap.value = draft.taskDataMap;
      }
      if (draft.inspectorName) {
        inspectorName.value = draft.inspectorName;
      }
      // 如果已经选择了子类别，重新构建任务列表以恢复数据
      if (currentSubCategoryId.value) {
        const subCategory = categoryList.value
          .flatMap(cat => cat.children || [])
          .find(sub => sub.id === currentSubCategoryId.value);
        if (subCategory) {
          buildTaskList(subCategory);
        }
      }
      // 更新完成数量
      updateCompletionCounts();
    }
  } catch (e) {
    console.error('加载草稿失败:', e);
  }
};

// 保存草稿
const saveDraft = () => {
  const draftKey = `task_draft_${routeTaskId.value}`;
  try {
    const draft = {
      taskDataMap: taskDataMap.value,
      inspectorName: inspectorName.value,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch (e) {
    console.error('保存草稿失败:', e);
  }
};

// 获取当前类别和子类别索引
const getCurrentIndices = () => {
  const categoryIndex = categoryList.value.findIndex(cat => 
    cat.children?.some((sub: any) => sub.id === currentSubCategoryId.value)
  );
  if (categoryIndex === -1) return null;
  
  const category = categoryList.value[categoryIndex];
  const subIndex = category.children?.findIndex((sub: any) => sub.id === currentSubCategoryId.value) ?? -1;
  
  return { categoryIndex, category, subIndex };
};

// 导航方法
const goBack = () => {
  router.push('/task/list');
};

const goToPreviousModule = () => {
  const indices = getCurrentIndices();
  if (!indices) return;
  
  const { categoryIndex, category, subIndex } = indices;
  
  if (subIndex > 0) {
    selectSubCategory(category.children[subIndex - 1]);
  } else if (categoryIndex > 0) {
    const prevCategory = categoryList.value[categoryIndex - 1];
    if (prevCategory.children?.length) {
      selectSubCategory(prevCategory.children[prevCategory.children.length - 1]);
    }
  }
};

const goToNextModule = () => {
  const indices = getCurrentIndices();
  if (!indices) return;
  
  const { categoryIndex, category, subIndex } = indices;
  
  if (subIndex < category.children.length - 1) {
    selectSubCategory(category.children[subIndex + 1]);
  } else if (categoryIndex < categoryList.value.length - 1) {
    const nextCategory = categoryList.value[categoryIndex + 1];
    if (nextCategory.children?.length) {
      selectSubCategory(nextCategory.children[0]);
    }
  }
};

// 监听检查人员变化
watch(inspectorName, () => {
  saveDraft();
});
</script>

<style scoped>
.task-collect-page {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 90vh;
  background: var(--theme-color-background);
}

/* 左侧边栏 */
.left-sidebar {
  width: 280px;
  background: var(--theme-color-surface);
  border-right: 1px solid var(--theme-color-soft-border);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  position: relative;
}

/* 返回按钮区域 */
.back-button-section {
  margin-bottom: 0.5rem;
}

.device-card,
.inspector-card,
.category-nav-card {
  width: 100%;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.device-header {
  margin-bottom: 1rem;
}

.device-name {
  width: 100%;
  margin-bottom: 0.5rem;
}

.task-select {
  width: 100%;
}

.device-model {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.device-progress {
  margin-top: 1rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  margin-bottom: 0.5rem;
}

.progress-percent {
  font-weight: 500;
  color: var(--theme-color-text);
}

.progress-bar-container {
  height: 8px;
  background: var(--theme-color-soft);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--theme-color-primary);
  transition: width 0.3s ease;
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin-bottom: 0.75rem;
}

.inspector-input {
  width: 100%;
}

/* Event List 样式 */
.event-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.5rem;
}

.category-name {
  font-weight: 500;
  color: var(--theme-color-text);
}

.category-count {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.sub-category-event-item {
  padding-left: 1.5rem;
}

.sub-category-icon {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  width: 1rem;
  text-align: center;
  flex-shrink: 0;
}

.sub-category-icon.active {
  color: var(--theme-color-primary);
}

.sub-category-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--theme-color-text);
}

.sub-category-count {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
}

.help-button {
  position: absolute;
  bottom: 1.5rem;
  left: 1.5rem;
}

/* 右侧主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--theme-color-background);
}

/* 面包屑区域 */
.breadcrumb-section {
  padding: 0.5rem 1.5rem;
  background: var(--theme-color-surface);
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.task-item {
  background: var(--theme-color-surface);
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  width: 100%;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.task-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--theme-color-primary-soft);
  color: var(--theme-color-primary);
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
}

.task-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.task-description {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  margin-bottom: 1rem;
  line-height: 1.5;
}

/* 数据采集和检测结果 - 左右布局 */
.data-and-result-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 1024px) {
  .data-and-result-layout {
    grid-template-columns: 1fr;
  }
}

.data-collection-section,
.detection-result-section {
  background: var(--theme-color-soft);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0;
}

.data-collection-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.data-collection-section .remarks-section {
  padding-top: 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin-bottom: 0.5rem;
}

.required-mark {
  color: var(--theme-color-alarm);
  margin-left: 0.25rem;
}

.data-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.data-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.full-width-input,
.full-width-toggle {
  width: 100%;
}

.numeric-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.numeric-input-wrapper .full-width-input {
  flex: 1;
}

.field-unit-inline {
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
  white-space: nowrap;
  flex-shrink: 0;
}

.detection-guide {
  background: var(--theme-color-soft);
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.25rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.guide-text {
  color: var(--theme-color-text);
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-line;
}

.result-selection {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  width: 100%;
}

.result-button-ix {
  flex: 1;
  padding: 0;
  min-height: auto;
  height: auto;
}

.result-button-ix .result-button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem;
  width: 100%;
}

.result-button-ix :deep(ix-icon) {
  width: 1.5rem;
  height: 1.5rem;
}

.result-button-ix.result-button-active {
  border-width: 2px !important;
  font-weight: 600;
}

.result-button-ix.result-button-success {
  background: var(--theme-color-success-soft) !important;
  border-color: var(--theme-color-success) !important;
}

.result-button-ix.result-button-success :deep(button) {
  background: var(--theme-color-success-soft) !important;
  border-color: var(--theme-color-success) !important;
}

.result-button-ix.result-button-warning {
  background: var(--theme-color-warning-soft) !important;
  border-color: var(--theme-color-warning) !important;
}

.result-button-ix.result-button-warning :deep(button) {
  background: var(--theme-color-warning-soft) !important;
  border-color: var(--theme-color-warning) !important;
}

.result-button-ix.result-button-error {
  background: var(--theme-color-alarm-soft) !important;
  border-color: var(--theme-color-alarm) !important;
}

.result-button-ix.result-button-error :deep(button) {
  background: var(--theme-color-alarm-soft) !important;
  border-color: var(--theme-color-alarm) !important;
}

.result-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--theme-color-text);
}

.result-hint {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  font-style: italic;
  margin-top: 0.25rem;
}

.bottom-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
  background: var(--theme-color-surface);
}

.nav-button-large {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--theme-color-surface);
  min-height: 50px;
  justify-content: center;
}

.nav-button-large:hover:not(.disabled) {
  border-color: var(--theme-color-primary);
  background: var(--theme-color-primary-soft);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.nav-button-large.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--theme-color-soft);
}

.nav-button-text {
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
  color: var(--theme-color-primary);
}

.nav-button-large.disabled .nav-button-text {
  color: var(--theme-color-text-soft);
}
</style>
