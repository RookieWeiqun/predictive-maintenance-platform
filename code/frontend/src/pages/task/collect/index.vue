<!-- 报告数据采集页 -->
<template>
  <div class="task-collect-page">
    <!-- 左侧边栏 -->
      <div class="left-sidebar">
        <div class="left-sidebar-header">
          <div class="left-sidebar-header-text">
            <div class="left-sidebar-header-title">任务导航</div>
            <div class="left-sidebar-header-subtitle">{{ taskInfo?.schemeName || '检测任务' }}</div>
          </div>
          <div class="left-sidebar-header-actions">
            <IxIconButton 
              :icon="iconChevronLeft" 
              variant="tertiary" 
              @click="goBack"
              title="返回设备列表"
            />
            <IxIconButton
              :icon="iconBulb"
              variant="primary"
              shape="circle"
              size="24"
              @click="showHelpModal = true"
              title="帮助"
            />
          </div>
        </div>
        <div ref="leftSidebarScrollRef" class="left-sidebar-scroll">
          <div class="sidebar-summary-card">
            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="task-no-input">任务编号</IxFieldLabel>
              <IxInput
                id="task-no-input"
                :model-value="String(taskInfo?.id || currentTaskId || '-')"
                readonly
                class="meta-input"
              />
            </div>

            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="serial-number-input">序列号</IxFieldLabel>
              <IxInput
                id="serial-number-input"
                v-model="serialNumber"
                placeholder="请输入序列号"
                class="meta-input"
              />
            </div>

            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="inspector-name-input">检查人员</IxFieldLabel>
              <IxInput
                id="inspector-name-input"
                v-model="inspectorName"
                placeholder="请输入姓名"
                class="meta-input"
              />
            </div>

            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="equipment-name-input">设备名称</IxFieldLabel>
              <IxInput
                id="equipment-name-input"
                v-model="equipmentName"
                placeholder="请输入设备名称"
                class="meta-input"
              />
            </div>

            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="equipment-number-input">设备号</IxFieldLabel>
              <IxInput
                id="equipment-number-input"
                v-model="equipmentNumber"
                placeholder="请输入设备号"
                class="meta-input"
              />
            </div>

            <div class="sidebar-field-block">
              <IxFieldLabel htmlFor="department-input">部门</IxFieldLabel>
              <IxInput
                id="department-input"
                v-model="department"
                placeholder="请输入所属部门"
                class="meta-input"
              />
            </div>
          </div>

        <!-- 检查类别导航 - 使用Event List -->
        <IxCard class="category-nav-card">
          <div class="card-title">检测模块</div>
          <div class="category-nav-scroll">
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
          </div>
        </IxCard>
        
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
                    <IxFieldLabel :id="`field-label-${field.id}`" :htmlFor="`field-${field.id}`">
                      {{ field.name }}
                      <span v-if="field.required" class="required-mark">*</span>
                    </IxFieldLabel>
                    <div
                      v-if="field.dataType === 'boolean' || field.dataType === 'enum'"
                      class="radio-option-group"
                      role="radiogroup"
                      :aria-labelledby="`field-label-${field.id}`"
                    >
                      <label
                        v-for="option in field.options"
                        :key="`${field.id}-${option}`"
                        class="radio-option"
                        :class="{ 'radio-option--active': field.value === option }"
                      >
                        <input
                          :name="`field-${field.id}`"
                          type="radio"
                          class="radio-option__input"
                          :value="option"
                          :checked="field.value === option"
                          @change="handleFieldUpdate(field.id, option)"
                        />
                        <span class="radio-option__icon" aria-hidden="true" />
                        <span class="radio-option__label">{{ option }}</span>
                      </label>
                    </div>
                    <div v-else-if="field.dataType === 'numeric'" class="numeric-input-wrapper">
                      <IxInput
                        :id="`field-${field.id}`"
                        v-model="field.value"
                        :placeholder="field.placeholder || '请输入'"
                        :min="field.min"
                        :max="field.max"
                        :step="field.step"
                        inputmode="decimal"
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
                      :pattern="field.pattern"
                      class="full-width-input"
                      @update:modelValue="handleFieldUpdate(field.id, $event)"
                    />
                    <div v-if="field.hint" class="data-field-hint">{{ field.hint }}</div>
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

                <div class="task-photos-section">
                  <div class="task-photos-header">
                    <div class="section-title">现场照片</div>
                    <div class="task-photos-count">{{ getTaskPhotoCount(task.id) }}/{{ MAX_TASK_PHOTOS }}</div>
                  </div>
                  <div class="task-photos-actions">
                    <IxButton
                      variant="secondary"
                      size="sm"
                      :disabled="isTaskPhotoLimitReached(task.id)"
                      @click="handleCaptureTaskPhoto(task)"
                    >
                      拍照
                    </IxButton>
                    <IxButton
                      variant="secondary"
                      size="sm"
                      :disabled="isTaskPhotoLimitReached(task.id)"
                      @click="openTaskPhotoFilePicker(task.id)"
                    >
                      从相册选择
                    </IxButton>
                  </div>
                  <div class="task-photos-hint">每项最多 {{ MAX_TASK_PHOTOS }} 张，照片先保存在本地。</div>
                  <div v-if="getTaskPhotoCount(task.id) > 0" class="task-photos-grid">
                    <div
                      v-for="photo in getTaskPhotos(task.id)"
                      :key="photo.attachment_uuid"
                      class="task-photo-card"
                    >
                      <img :src="photo.preview_url" alt="任务照片" class="task-photo-image" />
                      <button
                        type="button"
                        class="task-photo-remove"
                        @click="removeTaskPhoto(task, photo)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右侧：操作指导与结果 -->
              <div class="detection-result-section">
                <div class="section-title">
                  操作指导
                </div>
                
                <!-- 检测过程指导 -->
                <div class="detection-guide">
                  <div class="guide-text">{{ getDetectionGuide(task) }}</div>
                </div>

                <div class="result-status-card" :class="getResultStatusClass(task.result)">
                  <div class="result-status-label">{{ getResultDisplayLabel(task.result) }}</div>
                  <div class="result-status-hint">{{ getResultHint(task.result) }}</div>
                </div>

                <div v-if="task.result === 'abnormal'" class="hazard-resolution-section">
                  <div class="section-title">隐患处理</div>
                  <div
                    class="radio-option-group"
                    role="radiogroup"
                    :aria-labelledby="`hazard-resolved-label-${task.id}`"
                  >
                    <span :id="`hazard-resolved-label-${task.id}`" class="sr-only">隐患是否解决</span>
                    <label
                      class="radio-option"
                      :class="{ 'radio-option--active': task.hazardResolved === 'yes' }"
                    >
                      <input
                        :name="`hazard-resolved-${task.id}`"
                        type="radio"
                        class="radio-option__input"
                        value="yes"
                        :checked="task.hazardResolved === 'yes'"
                        @change="handleHazardResolvedUpdate(task.id, 'yes')"
                      />
                      <span class="radio-option__icon" aria-hidden="true" />
                      <span class="radio-option__label">是</span>
                    </label>
                    <label
                      class="radio-option"
                      :class="{ 'radio-option--active': task.hazardResolved === 'no' }"
                    >
                      <input
                        :name="`hazard-resolved-${task.id}`"
                        type="radio"
                        class="radio-option__input"
                        value="no"
                        :checked="task.hazardResolved === 'no'"
                        @change="handleHazardResolvedUpdate(task.id, 'no')"
                      />
                      <span class="radio-option__icon" aria-hidden="true" />
                      <span class="radio-option__label">否</span>
                    </label>
                  </div>
                  <div v-if="task.hazardResolved === 'no'" class="hazard-resolution-editor">
                    <div class="data-field-hint">未解决时自动带出模板建议，可继续编辑更新。</div>
                    <IxTextarea
                      v-model="task.recommendationContent"
                      placeholder="请输入建议内容"
                      textarea-width="400px"
                      @update:modelValue="handleRecommendationContentUpdate(task.id, $event)"
                    />
                  </div>
                  <div v-else-if="task.hazardResolved === 'yes'" class="hazard-resolution-editor">
                    <div class="data-field-hint">已解决时请填写已采取措施。</div>
                    <IxTextarea
                      v-model="task.actionTaken"
                      placeholder="请输入已采取措施"
                      textarea-width="400px"
                      @update:modelValue="handleActionTakenUpdate(task.id, $event)"
                    />
                  </div>
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
  <input
    ref="taskPhotoFileInputRef"
    type="file"
    accept="image/*"
    capture="environment"
    style="display: none"
    @change="handleTaskPhotoFileSelected"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import {
  IxButton,
  IxCard,
  IxInput,
  IxTextarea,
  IxFieldLabel,
  IxBreadcrumb,
  IxBreadcrumbItem,
  IxIconButton,
  IxEventList,
  IxEventListItem,
  IxModal,
  showToast,
} from "@siemens/ix-vue";
import { 
  iconChevronLeft,
  iconBulb
} from "@siemens/ix-icons/icons";
import {
  captureTaskPhoto,
  deleteStoredTaskPhoto,
  downloadTaskPackage,
  isPhotoCaptureCancelled,
  offlineAttachmentRepository,
  offlineOutboxRepository,
  offlineTaskItemRepository,
  offlineTaskRepository,
  resolveStoredPhotoPreviewUrl,
  saveTaskPhotoFromFile,
} from '@/android';
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
import { buildDynamicFieldConfig, evaluateFieldValueAgainstRule } from '@/pages/scheme/utils/templateRuleSchema';

const router = useRouter();
const route = useRoute();

const routeTaskId = computed(() => String(route.params.taskId ?? ''));
const taskListRoute = computed(() => route.query.source === 'offline' ? '/task/list-offline' : '/task/list-online');
const MAX_TASK_PHOTOS = 3;

type SidebarModuleNode = {
  id: string;
  name: string;
  total: number;
  completed: number;
  moduleData: any;
};

type SidebarCategoryNode = {
  id: string;
  name: string;
  children: SidebarModuleNode[];
  total: number;
  completed: number;
};

function getTaskSchemeStorageKey(taskUuid: string, schemeId: string): string {
  return `task_scheme_${taskUuid}_${schemeId}`;
}

function readCachedTaskScheme(taskUuid: string, schemeId: string): { items?: any[] } | null {
  try {
    const raw = localStorage.getItem(getTaskSchemeStorageKey(taskUuid, schemeId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('读取离线任务模板缓存失败:', error);
    return null;
  }
}

// 任务信息
const taskInfo = ref<any>(null);


// 检查人员
const inspectorName = ref('');

// 序列号
const serialNumber = ref('');

const equipmentName = ref('');

const equipmentNumber = ref('');

const department = ref('');

// 帮助对话框显示状态
const showHelpModal = ref(false);

// 当前任务ID（用于下拉选择）
const currentTaskId = ref<string>('');

const leftSidebarScrollRef = ref<HTMLElement | null>(null);

type TaskPhotoView = {
  attachment_uuid: string;
  task_item_uuid: string;
  local_path: string;
  preview_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  sync_status: 'pending' | 'synced' | 'failed';
};

const taskPhotoMap = ref<Record<string, TaskPhotoView[]>>({});
const taskPhotoFileInputRef = ref<HTMLInputElement | null>(null);
const pendingPhotoTaskId = ref<string>('');

function resetLeftSidebarScroll(): void {
  leftSidebarScrollRef.value?.scrollTo({ top: 0, behavior: 'auto' });
}

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

async function loadProductMeta(productId: number | null | undefined) {
  if (typeof productId !== 'number' || !Number.isFinite(productId) || productId <= 0) {
    return null;
  }

  try {
    return await productsApi.getProduct(productId);
  } catch {
    return null;
  }
}

function setupFromMockTask(task: any): void {
  taskInfo.value = task;
  currentTaskId.value = routeTaskId.value;

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

async function setupFromOfflineTask(taskUuid: string): Promise<boolean> {
  const offlineTask = await offlineTaskRepository.getByTaskUuid(taskUuid);
  if (offlineTask == null || !offlineTask.scheme_id) {
    return false;
  }

  const cachedScheme = readCachedTaskScheme(taskUuid, offlineTask.scheme_id);
  if (cachedScheme?.items == null) {
    return false;
  }

  taskInfo.value = {
    id: offlineTask.task_no || taskUuid,
    schemeName: offlineTask.scheme_name || '-',
    schemeId: offlineTask.scheme_id,
    taskType: 'equipment',
    taskTypeLabel: '离线任务',
    deviceModel: offlineTask.device_model || '-',
    projectId: offlineTask.project_id || '',
    projectNo: '',
    projectName: offlineTask.project_name || '',
    isSubTask: false,
  };

  inspectorName.value = offlineTask.assigned_user_name || '';
  serialNumber.value = offlineTask.serial_no || '';
  equipmentName.value = offlineTask.equipment_name || '';
  equipmentNumber.value = offlineTask.equipment_number || '';
  department.value = offlineTask.department || '';

  currentTaskId.value = taskUuid;

  const serverTaskId = Number.parseInt(String(offlineTask.server_task_id ?? ''), 10);
  const missingTaskNo = !String(offlineTask.task_no ?? '').trim();
  const missingDeviceModel = !String(offlineTask.device_model ?? '').trim() || offlineTask.device_model === '-';

  if (Number.isFinite(serverTaskId) && serverTaskId > 0) {
    try {
      const dto = await inspectionTasksApi.getInspectionTask(serverTaskId);
      const product = await loadProductMeta(dto.productid);

      const resolvedTaskNo = (dto.taskNo ?? '').trim();
      const resolvedDeviceModel = (product?.mlfb ?? '').trim();
      const resolvedEquipmentName = offlineTask.equipment_name || product?.equipmentname?.trim() || '';
      const resolvedEquipmentNumber = offlineTask.equipment_number || product?.equipmentnumber?.trim() || '';
      const resolvedDepartment = offlineTask.department || product?.department?.trim() || '';
      if (missingTaskNo && resolvedTaskNo) {
        taskInfo.value = {
          ...taskInfo.value,
          id: resolvedTaskNo,
        };
      }

      if (missingDeviceModel && resolvedDeviceModel) {
        taskInfo.value = {
          ...taskInfo.value,
          deviceModel: resolvedDeviceModel,
        };
      }

      if (!equipmentName.value && resolvedEquipmentName) {
        equipmentName.value = resolvedEquipmentName;
      }

      if (!equipmentNumber.value && resolvedEquipmentNumber) {
        equipmentNumber.value = resolvedEquipmentNumber;
      }

      if (!department.value && resolvedDepartment) {
        department.value = resolvedDepartment;
      }

      if (
        (missingTaskNo && resolvedTaskNo)
        || (missingDeviceModel && resolvedDeviceModel)
        || (!offlineTask.equipment_name && !!resolvedEquipmentName)
        || (!offlineTask.equipment_number && !!resolvedEquipmentNumber)
        || (!offlineTask.department && !!resolvedDepartment)
      ) {
        await offlineTaskRepository.upsert({
          ...offlineTask,
          serial_no: offlineTask.serial_no,
          equipment_name: resolvedEquipmentName || offlineTask.equipment_name,
          equipment_number: resolvedEquipmentNumber || offlineTask.equipment_number,
          department: resolvedDepartment || offlineTask.department,
          assigned_user_name: offlineTask.assigned_user_name,
          task_no: resolvedTaskNo || offlineTask.task_no,
          device_model: resolvedDeviceModel || offlineTask.device_model,
        });
      }
    } catch (error) {
      console.warn('回填离线任务展示信息失败:', error);
    }
  }

  buildCategoryList(cachedScheme.items);
  loadDraft();
  updateCompletionCounts();
  return true;
}

async function setupFromApiTask(numericId: number): Promise<void> {
  const dto = await inspectionTasksApi.getInspectionTask(numericId);
  const [roots, templateMeta] = await Promise.all([
    loadTemplateItemsByTemplateId(dto.templateid),
    inspectionTemplatesApi.getInspectionTemplate(dto.templateid).catch(() => null),
  ]);

  const product = await loadProductMeta(dto.productid);
  const mlfb = (product?.mlfb ?? '-').trim() || '-';

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

  const localTask = await offlineTaskRepository.getByTaskUuid(String(numericId));
  inspectorName.value = localTask?.assigned_user_name || '';
  serialNumber.value = localTask?.serial_no || '';
  equipmentName.value = localTask?.equipment_name || product?.equipmentname?.trim() || '';
  equipmentNumber.value = localTask?.equipment_number || product?.equipmentnumber?.trim() || '';
  department.value = localTask?.department || product?.department?.trim() || '';

  currentTaskId.value = String(numericId);

  const schemeItems = apiTemplateRootsToCollectSchemeItems(roots);
  if (schemeItems.length === 0) {
    showToast({ message: '模板中暂无检测项，无法采集' });
    router.push(taskListRoute.value);
    return;
  }

  buildCategoryList(schemeItems as any[]);
  await mergeTaskitemsFromApi(numericId, roots);
  loadDraft();
  updateCompletionCounts();
}

async function initTaskCollect(): Promise<void> {
  resetLeftSidebarScroll();

  const idParam = routeTaskId.value;
  if (!idParam) {
    showToast({ message: '无效的任务参数' });
    router.push(taskListRoute.value);
    return;
  }

  expandedCategories.value = [];
  currentSubCategoryId.value = '';
  currentSubCategoryName.value = '环境检查';
  categoryList.value = [];
  currentTaskList.value = [];
  taskDataMap.value = {};
  taskPhotoMap.value = {};
  inspectorName.value = '';
  serialNumber.value = '';
  equipmentName.value = '';
  equipmentNumber.value = '';
  department.value = '';

  const mockTask = tasksData.tasks.find((t: any) => t.id === idParam);
  if (mockTask) {
    setupFromMockTask(mockTask);
    try {
      const localTask = await offlineTaskRepository.getByTaskUuid(routeTaskId.value);
      if (localTask == null) {
        await downloadTaskPackage(routeTaskId.value);
      }
      await loadOfflineTaskItems();
    } catch (error) {
      console.error('加载离线任务项失败:', error);
    }
    return;
  }

  const numericId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    showToast({ message: '未找到任务' });
    router.push(taskListRoute.value);
    return;
  }

  const shouldPreferOffline = route.query.source === 'offline';
  if (shouldPreferOffline) {
    const initialized = await setupFromOfflineTask(idParam);
    if (!initialized) {
      showToast({ message: '本地任务包不完整，请联网重新下载任务后再离线执行' });
      router.push(taskListRoute.value);
      return;
    }
    try {
      await loadOfflineTaskItems();
    } catch (error) {
      console.error('加载离线任务项失败:', error);
    }
    return;
  }

  try {
    const localTask = await offlineTaskRepository.getByTaskUuid(routeTaskId.value);
    if (localTask == null) {
      await downloadTaskPackage(routeTaskId.value);
    }

    await setupFromApiTask(numericId);

    try {
      await loadOfflineTaskItems();
    } catch (error) {
      console.error('加载离线任务项失败:', error);
    }
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '加载任务失败' });
    router.push(taskListRoute.value);
  }
}

// 当前选中的子类别
const currentSubCategoryId = ref<string>('');
const currentSubCategoryName = ref('环境检查');

// 展开的类别
const expandedCategories = ref<string[]>([]);

// 类别列表（从方案数据生成）
const categoryList = ref<SidebarCategoryNode[]>([]);

// 当前任务列表
const currentTaskList = ref<any[]>([]);

// 任务数据（存储所有任务的检测结果）
const taskDataMap = ref<Record<string, any>>({});

function buildTaskItemUuid(taskItemId: string): string {
  return `${routeTaskId.value}:${taskItemId}`;
}

function getTaskPhotos(taskId: string): TaskPhotoView[] {
  return taskPhotoMap.value[taskId] ?? [];
}

function getTaskPhotoCount(taskId: string): number {
  return getTaskPhotos(taskId).length;
}

function isTaskPhotoLimitReached(taskId: string): boolean {
  return getTaskPhotoCount(taskId) >= MAX_TASK_PHOTOS;
}

async function loadTaskPhotosByTaskId(taskId: string): Promise<void> {
  const taskItemUuid = buildTaskItemUuid(taskId);
  const records = await offlineAttachmentRepository.listByTaskItemUuid(taskItemUuid);
  const photos = await Promise.all(
    records.map(async (record) => ({
      ...record,
      preview_url: await resolveStoredPhotoPreviewUrl(record.local_path),
    })),
  );
  taskPhotoMap.value[taskId] = photos;
}

async function loadVisibleTaskPhotos(): Promise<void> {
  const taskIds = currentTaskList.value.map((task) => String(task.id));
  await Promise.all(taskIds.map((taskId) => loadTaskPhotosByTaskId(taskId)));
}

function parseOfflineResult(raw: string | null): {
  value?: string;
  result?: string;
  resultState?: string;
  remarks?: string;
  dataFields?: Record<string, any>;
  hazardResolved?: boolean | null;
  recommendationContent?: string;
  actionTaken?: string;
} {
  if (raw == null || raw === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const value = typeof parsed.value === 'string'
        ? parsed.value
        : parsed.dataFields && typeof parsed.dataFields === 'object' && parsed.dataFields.value != null
          ? String(parsed.dataFields.value)
          : undefined;

      return {
        ...parsed,
        value,
        resultState: typeof parsed.resultState === 'string'
          ? parsed.resultState
          : typeof parsed.result === 'string' && ['normal', 'warning', 'abnormal'].includes(parsed.result)
            ? parsed.result
            : undefined,
        hazardResolved:
          typeof parsed.hazardResolved === 'boolean'
            ? parsed.hazardResolved
            : typeof parsed.hazardResolved === 'string'
              ? parsed.hazardResolved.toLowerCase() === 'true'
              : typeof parsed.hazard_resolved === 'boolean'
                ? parsed.hazard_resolved
                : typeof parsed.hazard_resolved === 'string'
                  ? parsed.hazard_resolved.toLowerCase() === 'true'
                  : undefined,
        recommendationContent:
          typeof parsed.recommendationContent === 'string'
            ? parsed.recommendationContent
            : typeof parsed.recommendation_content === 'string'
              ? parsed.recommendation_content
              : undefined,
        actionTaken:
          typeof parsed.actionTaken === 'string'
            ? parsed.actionTaken
            : typeof parsed.action_taken === 'string'
              ? parsed.action_taken
              : undefined,
      };
    }
  } catch {
    return { value: raw };
  }

  return {};
}

function serializeTaskValue(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
}

function getPrimaryTaskFieldValue(task: any): string | null {
  const fields = Array.isArray(task.dataFields) ? task.dataFields : [];
  const primaryField = fields[0];
  return primaryField ? serializeTaskValue(primaryField.value) : null;
}

function buildOfflineResult(task: any): string {
  return JSON.stringify({
    value: getPrimaryTaskFieldValue(task),
    remarks: task.remarks || '',
    resultState: task.result || '',
    hazardResolved:
      task.hazardResolved === 'yes'
        ? true
        : task.hazardResolved === 'no'
          ? false
          : null,
    recommendationContent: task.recommendationContent || '',
    actionTaken: task.actionTaken || '',
  });
}

async function persistTaskRecord(task: any): Promise<void> {
  const taskItemUuid = buildTaskItemUuid(task.id);
  const existing = await offlineTaskItemRepository.getByTaskItemUuid(taskItemUuid);
  const taskValue = getPrimaryTaskFieldValue(task);
  const executionStatus = taskValue || task.result ? 'completed' : 'pending';

  await offlineTaskItemRepository.upsert({
    task_item_uuid: taskItemUuid,
    server_item_id: existing?.server_item_id ?? null,
    task_uuid: routeTaskId.value,
    source_type: existing?.source_type ?? 'system_generated',
    item_name: task.name,
    category_path: existing?.category_path ?? `${currentCategoryPath.value} / ${currentSubCategoryName.value}`,
    result: buildOfflineResult(task),
    display_condition: task.displayCondition ?? existing?.display_condition ?? null,
    operation_guide: task.operationGuide ?? existing?.operation_guide ?? null,
    recommended_rules: task.suggestionRule ?? existing?.recommended_rules ?? null,
    recommendation_content: task.suggestionContent ?? existing?.recommendation_content ?? null,
    hidden_hazard_content: task.hazardContent ?? existing?.hidden_hazard_content ?? null,
    maintenance_instructions: task.maintenanceDescription ?? existing?.maintenance_instructions ?? null,
    execution_status: executionStatus,
    is_normal: task.result === 'normal',
    is_recheck: false,
    sync_status: 'pending',
  });

  await offlineTaskRepository.markDirty(routeTaskId.value);
  await offlineOutboxRepository.replacePending({
    entity_type: 'task_item',
    entity_uuid: taskItemUuid,
    action: 'upsert_task_item',
    payload_json: buildOfflineResult(task),
  });
}

async function loadOfflineTaskItems(): Promise<void> {
  const records = await offlineTaskItemRepository.listByTaskUuid(routeTaskId.value);
  if (records.length === 0) {
    return;
  }

  for (const record of records) {
    const itemId = record.task_item_uuid.startsWith(`${routeTaskId.value}:`)
      ? record.task_item_uuid.slice(routeTaskId.value.length + 1)
      : record.task_item_uuid;
    const payload = parseOfflineResult(record.result);
    taskDataMap.value[itemId] = {
      ...(taskDataMap.value[itemId] ?? {}),
      value: payload.value ?? '',
      result: payload.resultState ?? payload.result ?? '',
      remarks: payload.remarks ?? '',
      dataFields: payload.dataFields ?? {},
      displayCondition: record.display_condition ?? '',
      operationGuide: record.operation_guide ?? '',
      suggestionRule: record.recommended_rules ?? '',
      suggestionContent: record.recommendation_content ?? '',
      hazardContent: record.hidden_hazard_content ?? '',
      maintenanceDescription: record.maintenance_instructions ?? '',
      hazardResolved:
        payload.hazardResolved === true ? 'yes' : payload.hazardResolved === false ? 'no' : '',
      recommendationContent: payload.recommendationContent ?? '',
      actionTaken: payload.actionTaken ?? '',
    };
  }

  if (currentSubCategoryId.value) {
    const subCategory = categoryList.value
      .flatMap((category) => category.children || [])
      .find((sub: any) => sub.id === currentSubCategoryId.value);
    if (subCategory) {
      buildTaskList(subCategory);
    }
  }
  updateCompletionCounts();
}

async function persistTaskPhoto(task: any, photo: TaskPhotoView): Promise<void> {
  await persistTaskRecord(task);
  await offlineAttachmentRepository.upsert({
    attachment_uuid: photo.attachment_uuid,
    task_item_uuid: photo.task_item_uuid,
    local_path: photo.local_path,
    mime_type: photo.mime_type,
    size_bytes: photo.size_bytes,
    created_at: photo.created_at,
    sync_status: 'pending',
  });

  await offlineTaskRepository.markDirty(routeTaskId.value);
  await offlineOutboxRepository.replacePending({
    entity_type: 'attachment',
    entity_uuid: photo.attachment_uuid,
    action: 'upsert_attachment',
    payload_json: JSON.stringify({
      attachment_uuid: photo.attachment_uuid,
      task_item_uuid: photo.task_item_uuid,
      local_path: photo.local_path,
      mime_type: photo.mime_type,
      size_bytes: photo.size_bytes,
      created_at: photo.created_at,
    }),
  });

  await loadTaskPhotosByTaskId(task.id);
}

async function handleCaptureTaskPhoto(task: any): Promise<void> {
  if (isTaskPhotoLimitReached(task.id)) {
    showToast({ message: `每项最多上传 ${MAX_TASK_PHOTOS} 张照片` });
    return;
  }

  try {
    const taskItemUuid = buildTaskItemUuid(task.id);
    const captured = await captureTaskPhoto(routeTaskId.value, taskItemUuid);
    await persistTaskPhoto(task, {
      ...captured,
      preview_url: await resolveStoredPhotoPreviewUrl(captured.local_path),
    });
  } catch (error) {
    if (isPhotoCaptureCancelled(error)) {
      return;
    }
    showToast({ message: error instanceof Error ? error.message : '拍照失败，请重试' });
  }
}

function openTaskPhotoFilePicker(taskId: string): void {
  if (isTaskPhotoLimitReached(taskId)) {
    showToast({ message: `每项最多上传 ${MAX_TASK_PHOTOS} 张照片` });
    return;
  }

  pendingPhotoTaskId.value = taskId;
  if (taskPhotoFileInputRef.value) {
    taskPhotoFileInputRef.value.value = '';
    taskPhotoFileInputRef.value.click();
  }
}

async function handleTaskPhotoFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const taskId = pendingPhotoTaskId.value;
  pendingPhotoTaskId.value = '';

  if (!file || !taskId) {
    return;
  }

  const task = currentTaskList.value.find((item) => String(item.id) === taskId);
  if (!task) {
    return;
  }

  if (isTaskPhotoLimitReached(task.id)) {
    showToast({ message: `每项最多上传 ${MAX_TASK_PHOTOS} 张照片` });
    return;
  }

  try {
    const taskItemUuid = buildTaskItemUuid(task.id);
    const saved = await saveTaskPhotoFromFile(routeTaskId.value, taskItemUuid, file);
    await persistTaskPhoto(task, {
      ...saved,
      preview_url: await resolveStoredPhotoPreviewUrl(saved.local_path),
    });
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '保存照片失败，请重试' });
  }
}

async function removeTaskPhoto(task: any, photo: TaskPhotoView): Promise<void> {
  try {
    await deleteStoredTaskPhoto(photo.local_path);
    await offlineAttachmentRepository.deleteByAttachmentUuid(photo.attachment_uuid);
    await offlineOutboxRepository.deletePending('attachment', photo.attachment_uuid, 'upsert_attachment');
    await offlineTaskRepository.markDirty(routeTaskId.value);
    await persistTaskRecord(task);
    await loadTaskPhotosByTaskId(task.id);
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '删除照片失败，请重试' });
  }
}

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
  return task.operationGuide || '';
};

// 检测结果类型
const getResultDisplayLabel = (result: string): string => {
  if (result === 'normal') return '自动判定：正常';
  if (result === 'abnormal') return '自动判定：异常';
  return '待判定';
};

const getResultHint = (result: string): string => {
  if (result === 'normal') return '当前录入值满足模板规则';
  if (result === 'abnormal') return '当前录入值不满足模板规则，请复核并补充备注';
  return '录入值后系统会按模板规则自动判定结果';
};

const getResultStatusClass = (result: string): string => {
  if (result === 'normal') return 'result-status-normal';
  if (result === 'abnormal') return 'result-status-abnormal';
  return 'result-status-pending';
};

const hasPreviousModule = computed(() => {
  const currentIndex = categoryList.value.findIndex(cat => 
    cat.children?.some((sub: any) => sub.id === currentSubCategoryId.value)
  );
  if (currentIndex === -1) return false;
  
  // 检查当前类别内是否有上一个子类别
  const category = categoryList.value[currentIndex];
  const subIndex = category.children?.findIndex((sub: any) => sub.id === currentSubCategoryId.value) ?? -1;
  
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
  const subIndex = category.children?.findIndex((sub: any) => sub.id === currentSubCategoryId.value) ?? -1;
  
  if (subIndex !== -1 && subIndex < category.children.length - 1) return true;
  if (currentIndex < categoryList.value.length - 1) return true;
  return false;
});

onMounted(() => {
  resetLeftSidebarScroll();
  void initTaskCollect();
  window.addEventListener('beforeunload', flushDraftOnExit);
  document.addEventListener('visibilitychange', handlePageVisibilityChange);
});

onBeforeUnmount(() => {
  flushDraftOnExit();
  window.removeEventListener('beforeunload', flushDraftOnExit);
  document.removeEventListener('visibilitychange', handlePageVisibilityChange);
});

onBeforeRouteLeave(() => {
  flushDraftOnExit();
});

watch(
  () => route.params.taskId,
  (next, prev) => {
    if (next === prev) return;
    resetLeftSidebarScroll();
    void initTaskCollect();
  },
);

// 构建类别列表
function collectLeafModules(nodes: any[], prefix: string[] = []): SidebarModuleNode[] {
  const modules: SidebarModuleNode[] = [];

  for (const node of nodes || []) {
    const currentName = String(node?.name || '').trim();
    const nextPrefix = currentName ? [...prefix, currentName] : prefix;
    const children = Array.isArray(node?.children) ? node.children : [];

    if (children.length === 0) {
      continue;
    }

    const hasDetectionChild = children.some((child: any) => child?.type && child?.required !== undefined);
    if (hasDetectionChild) {
      const total = countTasks(children);
      if (total > 0) {
        modules.push({
          id: String(node.id || nextPrefix.join('/')),
          name: currentName || '未命名模块',
          total,
          completed: 0,
          moduleData: {
            ...node,
            children,
          },
        });
      }
      continue;
    }

    modules.push(...collectLeafModules(children, nextPrefix));
  }

  return modules;
}

const buildCategoryList = (items: any[]) => {
  const categories: SidebarCategoryNode[] = [];

  items.forEach((item: any) => {
    const modules = collectLeafModules(item?.children || []);
    if (modules.length === 0) {
      return;
    }

    categories.push({
      id: item.id,
      name: item.name,
      children: modules,
      total: modules.reduce((sum, module) => sum + module.total, 0),
      completed: 0,
    });
  });

  expandedCategories.value = categories.length > 0 ? [categories[0].id] : [];
  categoryList.value = categories;

  if (categories.length > 0 && categories[0].children.length > 0) {
    selectSubCategory(categories[0].children[0]);
  }

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
const selectSubCategory = (subCategory: SidebarModuleNode) => {
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
        restoreFieldValue(field, existingData.dataFields[field.id]);
      }
    });
  } else if (existingData.value !== undefined && dataFields.length === 1) {
    const [field] = dataFields;
    restoreFieldValue(field, existingData.value);
  }
  const computedResult = evaluateTaskResult({ dataFields });
  
  return {
    id: item.id,
    name: item.name,
    description: getTaskDescription(item),
    dataFields,
    result: existingData.result || computedResult,
    remarks: existingData.remarks || '',
    displayCondition: existingData.displayCondition || item.displayCondition || '',
    operationGuide: existingData.operationGuide || item.operationGuide || '',
    suggestionRule: existingData.suggestionRule || item.suggestionRule || '',
    suggestionContent: existingData.suggestionContent || item.suggestionContent || '',
    hazardContent: existingData.hazardContent || item.hazardContent || '',
    maintenanceDescription: existingData.maintenanceDescription || item.maintenanceDescription || '',
    hazardResolved: existingData.hazardResolved || '',
    recommendationContent: existingData.recommendationContent || '',
    actionTaken: existingData.actionTaken || '',
  };
};

// 构建任务列表
const buildTaskList = (subCategory: SidebarModuleNode) => {
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
  void loadVisibleTaskPhotos();
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

const buildFieldHint = (field: any): string => {
  if (field.dataType === 'numeric') {
    const hintParts: string[] = [];
    hintParts.push(field.precision > 0 ? `最多 ${field.precision} 位小数` : '仅支持整数');
    if (field.min != null) {
      hintParts.push(`最小值 ${field.min}`);
    }
    if (field.max != null) {
      hintParts.push(`最大值 ${field.max}`);
    }
    return hintParts.join('，');
  }

  if ((field.dataType === 'string' || field.dataType === 'text') && field.validationMessage) {
    return field.validationMessage;
  }
  if ((field.dataType === 'string' || field.dataType === 'text') && field.pattern) {
    return `格式要求：${field.pattern}`;
  }
  if (field.dataType === 'enum' && Array.isArray(field.normalValues) && field.normalValues.length > 0) {
    return `正常值：${field.normalValues.join(' / ')}`;
  }
  if (field.dataType === 'boolean' && field.normalValue != null) {
    return `正常值：${String(field.normalValue)}`;
  }
  return '';
};

const createFieldDefinition = (sourceItem: any, fieldId: string, fieldName: string) => {
  const dynamicConfig = buildDynamicFieldConfig({
    dataType: sourceItem.dataType,
    ruleType: sourceItem.ruleType,
    thresholdRaw: sourceItem.thresholdRaw,
    unit: sourceItem.unit,
    minThreshold: sourceItem.minThreshold,
    maxThreshold: sourceItem.maxThreshold,
  });

  const field = {
    id: fieldId,
    name: fieldName,
    sourceDataType: sourceItem.dataType,
    sourceRuleType: sourceItem.ruleType,
    sourceThresholdRaw: sourceItem.thresholdRaw,
    placeholder:
      dynamicConfig.dataType === 'numeric'
        ? dynamicConfig.precision > 0
          ? '请输入数值'
          : '请输入整数'
        : dynamicConfig.dataType === 'boolean' || dynamicConfig.dataType === 'enum'
          ? '请选择'
          : '请输入',
    dataType: dynamicConfig.dataType,
    type: dynamicConfig.dataType === 'numeric' ? 'number' : 'text',
    required: sourceItem.required !== false,
    unit: dynamicConfig.unit || sourceItem.unit || '',
    min: dynamicConfig.min,
    max: dynamicConfig.max,
    step: dynamicConfig.step,
    precision: dynamicConfig.precision,
    pattern: dynamicConfig.pattern,
    validationMessage: dynamicConfig.message,
    options: dynamicConfig.options || [],
    normalValue: dynamicConfig.normalValue,
    normalValues: dynamicConfig.normalValues,
    suggestionContent: sourceItem.suggestionContent || '',
    value: '',
  };

  return {
    ...field,
    hint: buildFieldHint(field),
  };
};

const restoreFieldValue = (field: any, rawValue: any) => {
  if (rawValue == null || rawValue === '') {
    field.value = '';
    return;
  }

  if (field.dataType === 'boolean') {
    if (rawValue === true || rawValue === 'true') {
      field.value = field.options?.[0] ?? 'true';
      return;
    }
    if (rawValue === false || rawValue === 'false') {
      field.value = field.options?.[1] ?? 'false';
      return;
    }
  }

  field.value = String(rawValue);
};

const getTaskSuggestionContent = (task: any): string => {
  if (typeof task?.suggestionContent === 'string' && task.suggestionContent.trim()) {
    return task.suggestionContent;
  }

  const fields = Array.isArray(task?.dataFields) ? task.dataFields : [];
  const fieldWithSuggestion = fields.find(
    (field: any) => typeof field?.suggestionContent === 'string' && field.suggestionContent.trim(),
  );
  return fieldWithSuggestion?.suggestionContent || '';
};

const evaluateTaskResult = (task: any): string => {
  const fields = Array.isArray(task.dataFields) ? task.dataFields : [];
  const nonEmptyFields = fields.filter((field: any) => String(field.value ?? '').trim() !== '');
  if (nonEmptyFields.length === 0) {
    return '';
  }

  let hasAbnormal = false;
  let hasNormal = false;
  for (const field of nonEmptyFields) {
    const result = evaluateFieldValueAgainstRule({
      dataType: field.sourceDataType,
      ruleType: field.sourceRuleType,
      thresholdRaw: field.sourceThresholdRaw,
      value: field.value,
    });
    if (result === 'abnormal') {
      hasAbnormal = true;
      break;
    }
    if (result === 'normal') {
      hasNormal = true;
    }
  }

  if (hasAbnormal) {
    return 'abnormal';
  }
  return hasNormal ? 'normal' : '';
};

// 构建数据字段
const buildDataFields = (item: any): any[] => {
  const fields: any[] = [];
  
  // 如果有子项，为每个子项创建字段
  if (item.children && item.children.length > 0) {
    item.children.forEach((child: any) => {
      const fieldName = child.name || item.name;

      fields.push(createFieldDefinition(child, child.id, fieldName));
    });
  } else {
    // 没有子项，为当前项创建字段

    fields.push(createFieldDefinition(item, item.id + '_value', item.name));
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
  
  field.value = value == null ? '' : value;
  task.result = evaluateTaskResult(task);
  if (task.result !== 'abnormal') {
    task.hazardResolved = '';
    task.recommendationContent = '';
    task.actionTaken = '';
  }
  
  // 保存到任务数据
  if (!taskDataMap.value[task.id]) {
    taskDataMap.value[task.id] = {};
  }
  if (!taskDataMap.value[task.id].dataFields) {
    taskDataMap.value[task.id].dataFields = {};
  }
  taskDataMap.value[task.id].dataFields[fieldId] = field.value;
  taskDataMap.value[task.id].result = task.result;
  if (task.result !== 'abnormal') {
    taskDataMap.value[task.id].hazardResolved = '';
    taskDataMap.value[task.id].recommendationContent = '';
    taskDataMap.value[task.id].actionTaken = '';
  }
  
  saveDraft();
  void persistTaskRecord(task);
  updateCompletionCounts();
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
  void persistTaskRecord(task);
};

// 更新备注
const handleRemarksUpdate = (taskId: string, remarks: string) => {
  updateTaskData(taskId, { remarks });
};

const handleHazardResolvedUpdate = (taskId: string, value: 'yes' | 'no') => {
  const task = currentTaskList.value.find(t => t.id === taskId);
  if (!task) return;

  const updates: Record<string, any> = {
    hazardResolved: value,
  };

  if (value === 'no') {
    updates.actionTaken = '';
    updates.recommendationContent = (task.recommendationContent || '').trim()
      ? task.recommendationContent
      : getTaskSuggestionContent(task);
  } else {
    updates.recommendationContent = '';
    updates.actionTaken = '';
  }

  updateTaskData(taskId, updates);
};

const handleRecommendationContentUpdate = (taskId: string, recommendationContent: string) => {
  updateTaskData(taskId, { recommendationContent });
};

const handleActionTakenUpdate = (taskId: string, actionTaken: string) => {
  updateTaskData(taskId, { actionTaken });
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
      if (typeof draft.serialNumber === 'string') {
        serialNumber.value = draft.serialNumber;
      }
      if (typeof draft.equipmentName === 'string') {
        equipmentName.value = draft.equipmentName;
      }
      if (typeof draft.equipmentNumber === 'string') {
        equipmentNumber.value = draft.equipmentNumber;
      }
      if (typeof draft.department === 'string') {
        department.value = draft.department;
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
      serialNumber: serialNumber.value,
      equipmentName: equipmentName.value,
      equipmentNumber: equipmentNumber.value,
      department: department.value,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch (e) {
    console.error('保存草稿失败:', e);
  }
};

function flushDraftOnExit(): void {
  saveDraft();
}

async function persistTaskMeta(): Promise<void> {
  const existing = await offlineTaskRepository.getByTaskUuid(routeTaskId.value);
  if (existing == null) {
    return;
  }

  await offlineTaskRepository.updateCollectedMeta(routeTaskId.value, {
    serialNo: serialNumber.value.trim() || null,
    equipmentName: equipmentName.value.trim() || null,
    equipmentNumber: equipmentNumber.value.trim() || null,
    department: department.value.trim() || null,
    assignedUserName: inspectorName.value.trim() || null,
  });

  await offlineOutboxRepository.replacePending({
    entity_type: 'task',
    entity_uuid: routeTaskId.value,
    action: 'upsert_task',
    payload_json: JSON.stringify({
      serial_no: serialNumber.value.trim() || null,
      equipment_name: equipmentName.value.trim() || null,
      equipment_number: equipmentNumber.value.trim() || null,
      department: department.value.trim() || null,
      assigned_user_name: inspectorName.value.trim() || null,
    }),
  });
}

function handlePageVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    flushDraftOnExit();
  }
}

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
  router.push(taskListRoute.value);
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
  void persistTaskMeta();
});

watch(serialNumber, () => {
  saveDraft();
  void persistTaskMeta();
});

watch(equipmentName, () => {
  saveDraft();
  void persistTaskMeta();
});

watch(equipmentNumber, () => {
  saveDraft();
  void persistTaskMeta();
});

watch(department, () => {
  saveDraft();
  void persistTaskMeta();
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
  width: clamp(300px, 28vw, 360px);
  background: var(--theme-color-surface);
  border-right: 1px solid var(--theme-color-soft-border);
  padding: 0.5rem;
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.left-sidebar-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0.9rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.75rem;
  background: var(--theme-color-background);
}

.left-sidebar-header-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.left-sidebar-header-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--theme-color-text);
}

.left-sidebar-header-subtitle {
  font-size: 0.8rem;
  color: var(--theme-color-text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left-sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.left-sidebar-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.sidebar-summary-card,
.category-nav-card {
  width: 100%;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  padding: 1rem;
}

.sidebar-summary-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-field-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meta-input {
  width: 100%;
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--theme-color-text);
  margin-bottom: 0.75rem;
}

.category-nav-card {
  flex: 0 0 auto;
}

@media (max-width: 1024px) {
  .task-collect-page {
    height: 100dvh;
  }

  .left-sidebar {
    width: clamp(320px, 34vw, 380px);
  }

  .left-sidebar-header {
    padding: 0.65rem 0.75rem 0.8rem;
  }

  .sidebar-summary-card,
  .category-nav-card {
    padding: 0.875rem;
  }

  .left-sidebar-scroll {
    gap: 1rem;
  }
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

.hazard-resolution-section {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hazard-resolution-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.task-photos-section {
  margin-top: 0.25rem;
  padding-top: 0.85rem;
  border-top: 1px dashed var(--theme-color-soft-border);
}

.task-photos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-photos-count {
  font-size: 0.8rem;
  color: var(--theme-color-text-soft);
}

.task-photos-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.task-photos-hint {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
}

.task-photos-grid {
  margin-top: 0.65rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.task-photo-card {
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.4rem;
  overflow: hidden;
  background: var(--theme-color-background);
}

.task-photo-image {
  display: block;
  width: 100%;
  height: 6rem;
  object-fit: cover;
}

.task-photo-remove {
  width: 100%;
  border: none;
  border-top: 1px solid var(--theme-color-soft-border);
  background: transparent;
  color: var(--theme-color-alarm);
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1.8;
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

.radio-option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  width: 100%;
}

.radio-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 999px;
  background: var(--theme-color-surface);
  color: var(--theme-color-text);
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.radio-option--active {
  border-color: color-mix(in srgb, var(--theme-color-primary) 55%, var(--theme-color-soft-border));
  background: color-mix(in srgb, var(--theme-color-primary) 10%, white);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-color-primary) 18%, transparent);
}

.radio-option__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio-option__icon {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--theme-color-soft-border);
  border-radius: 999px;
  background: var(--theme-color-surface);
  box-sizing: border-box;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.radio-option--active .radio-option__icon {
  border-color: var(--theme-color-primary);
  box-shadow: inset 0 0 0 3px var(--theme-color-surface), inset 0 0 0 999px var(--theme-color-primary);
}

.radio-option__label {
  font-size: 0.875rem;
  line-height: 1.2;
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

.data-field-hint {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  line-height: 1.4;
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

.result-status-card {
  border-radius: 0.5rem;
  border: 1px solid var(--theme-color-soft-border);
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
}

.result-status-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.result-status-hint {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--theme-color-text-soft);
  line-height: 1.5;
}

.result-status-normal {
  background: color-mix(in srgb, var(--theme-color-success) 10%, white);
  border-color: color-mix(in srgb, var(--theme-color-success) 35%, var(--theme-color-soft-border));
}

.result-status-abnormal {
  background: color-mix(in srgb, var(--theme-color-alarm) 10%, white);
  border-color: color-mix(in srgb, var(--theme-color-alarm) 35%, var(--theme-color-soft-border));
}

.result-status-pending {
  background: var(--theme-color-soft);
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
