<!-- 维护任务清单页 -->
<template>
  <div>
    <IxContentHeader header-title="维护任务清单 - 在线版">
      <IxButton 
        variant="secondary" 
        @click="handleOpenAndroidDebug"
      >
        Android调试
      </IxButton>
      <IxButton 
        variant="secondary" 
        :disabled="selectedDownloadTaskIds.size === 0"
        @click="handleDownloadTasks"
      >
        下载任务
      </IxButton>
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <!-- 搜索和筛选区域 -->
        <div class="filter-section">
          <IxInput 
            v-model="searchText" 
            placeholder="搜索任务ID、设备型号或方案名称" 
            style="flex: 1; max-width: 300px;"
            @input="handleSearch"
          />
          <IxSelect 
            v-model="selectedProject" 
            placeholder="请选择项目" 
            style="min-width: 240px;"
            @update:modelValue="handleProjectFilter"
          >
            <IxSelectItem 
              v-for="project in projectList" 
              :key="project.id" 
              :label="`${project.projectNo} - ${project.name}`" 
              :value="project.id" 
            />
          </IxSelect>
        </div>

        <!-- 任务列表表格 - 使用 ag-grid -->
        <div class="table-container">
          <div class="table-header">
            <div class="table-header-left">
              <span class="table-title">任务列表</span>
            </div>
            <div class="table-header-right">
              <IxButton 
                variant="secondary" 
                size="sm"
                :disabled="!selectedTask || selectedTask.isSubTask || selectedTask.deviceCount <= 1"
                @click="handleCreateSubTask(selectedTask)"
              >
                创建子任务
              </IxButton>
            </div>
          </div>
          <div class="table-grid-wrap">
            <AgGridVue
              v-if="gridOptions"
              class="task-grid"
              :gridOptions="gridOptions"
            />
            <div
              v-if="tasksLoading"
              class="table-loading-mask"
              aria-busy="true"
              aria-live="polite"
            >
              <span class="table-loading-text">任务加载中…</span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxContentHeader, IxInput, IxSelect, IxSelectItem, IxButton, showToast } from "@siemens/ix-vue";
import {
  downloadTaskPackage,
  offlineTaskRepository,
} from '@/android';
import {
  projectsApi,
  inspectionTasksApi,
  inspectionTemplatesApi,
  productsApi,
  taskitemsApi,
} from '@/api';
import type { ProjectDto } from '@/api/modules/projects';
import type { InspectionTaskDto } from '@/api/modules/inspectionTasks';

ModuleRegistry.registerModules([AllCommunityModule]);

/** 离开页面再返回时恢复所选项目（sessionStorage，关闭标签页后清除） */
const TASK_LIST_SELECTED_PROJECT_KEY = 'isp:taskList:selectedProjectId';

const router = useRouter();

type TaskListRow = {
  id: string;
  projectId: string;
  projectNo: string;
  projectName: string;
  taskType: string;
  taskTypeLabel: string;
  deviceModel: string;
  serialNo: string;
  schemeId: string;
  schemeName: string;
  deviceCount: number;
  remark: string;
  cloudStatus: number | string | null;
  localDownloadStatus: 'not-downloaded' | 'downloaded' | 'uploaded';
  engineer: string;
  parentId: string | null;
  isSubTask: boolean;
  rawTaskid: number;
};

const searchText = ref('');
const selectedProject = ref('');
const selectedTask = ref<TaskListRow | null>(null);
const selectedDownloadTaskIds = ref<Set<string>>(new Set());

const projects = ref<ProjectDto[]>([]);
const allTasks = ref<TaskListRow[]>([]);
const tasksLoading = ref(false);

watch(selectedProject, (id) => {
  try {
    if (id) sessionStorage.setItem(TASK_LIST_SELECTED_PROJECT_KEY, id);
    else sessionStorage.removeItem(TASK_LIST_SELECTED_PROJECT_KEY);
  } catch {
    /* 隐私模式等 */
  }
});

function formatProjectNo(p: ProjectDto): string {
  if (p.projectid == null) return '—';
  return `P-${String(p.projectid).padStart(4, '0')}`;
}

function taskTypeFromInspectionType(inspectiontype: number): { taskType: string; taskTypeLabel: string } {
  if (inspectiontype === 1) return { taskType: 'equipment', taskTypeLabel: '设备检测' };
  return { taskType: 'peripheral', taskTypeLabel: '外围检测' };
}

function getOnlineLifecycleMeta(status: TaskListRow['cloudStatus']): {
  key: 'pending' | 'in-progress' | 'completed';
  label: string;
  percent: number;
} {
  const normalized = Number(status);
  if (normalized === 3) {
    return { key: 'completed', label: '已完成', percent: 100 };
  }
  if (normalized === 2) {
    return { key: 'in-progress', label: '进行中', percent: 60 };
  }
  return { key: 'pending', label: '未下载', percent: 15 };
}

async function mapInspectionTasksToRows(
  tasks: InspectionTaskDto[],
  projectId: number,
  projectNo: string,
  projectName: string,
): Promise<TaskListRow[]> {
  const templateCache = new Map<number, { name: string; inspectiontype: number }>();
  const productCache = new Map<number, { mlfb: string; serialno: string }>();

  const rows = await Promise.all(
    tasks
      .filter((t) => t.taskid != null && t.taskid > 0)
      .map(async (t) => {
        const taskid = t.taskid as number;
        const templateid = Number(t.templateid || 0);
        const productid = Number(t.productid || 0);

        if (templateid > 0 && !templateCache.has(templateid)) {
          try {
            const dto = await inspectionTemplatesApi.getInspectionTemplate(templateid);
            templateCache.set(templateid, {
              name: dto.name?.trim() || `模板 #${templateid}`,
              inspectiontype: Number(dto.inspectiontype ?? 0),
            });
          } catch {
            templateCache.set(templateid, { name: `模板 #${templateid}`, inspectiontype: 2 });
          }
        }

        if (productid > 0 && !productCache.has(productid)) {
          try {
            const list = await productsApi.searchProducts({ productid });
            const p0 = list[0];
            productCache.set(productid, {
              mlfb: p0?.mlfb?.trim() || '-',
              serialno: p0?.serialno?.trim() || '-',
            });
          } catch {
            productCache.set(productid, { mlfb: '-', serialno: '-' });
          }
        }

        const tmpl = templateid > 0 ? templateCache.get(templateid) : undefined;
        const { taskType, taskTypeLabel } = taskTypeFromInspectionType(tmpl?.inspectiontype ?? 2);
        const schemeName = tmpl?.name ?? (templateid > 0 ? `模板 #${templateid}` : '-');
        const prod = productid > 0 ? productCache.get(productid) : undefined;
        const displayId = (t.taskNo ?? '').trim() || `任务#${taskid}`;

        return {
          id: displayId,
          projectId: String(projectId),
          projectNo,
          projectName,
          taskType,
          taskTypeLabel,
          deviceModel: prod?.mlfb ?? '-',
          serialNo: t.serialno?.trim() || (prod?.serialno ?? '-'),
          schemeId: templateid > 0 ? String(templateid) : '',
          schemeName,
          deviceCount: 1,
          remark: (t.serialno?.trim() || prod?.serialno) ? `序列号：${t.serialno?.trim() || prod?.serialno}` : '',
          cloudStatus: t.status ?? null,
          localDownloadStatus: 'not-downloaded',
          engineer: t.assignedusername?.trim() || (t.assigneduserid != null ? `用户#${t.assigneduserid}` : ''),
          parentId: null,
          isSubTask: false,
          rawTaskid: taskid,
        } satisfies TaskListRow;
      }),
  );

  return rows.sort((a, b) => a.rawTaskid - b.rawTaskid);
}

// 项目列表（用于下拉框）
const projectList = computed(() =>
  projects.value
    .filter((p) => p.projectid != null && Number(p.projectid) > 0)
    .map((p) => ({
      id: String(p.projectid),
      projectNo: formatProjectNo(p),
      name: p.projectname ?? '',
    })),
);

async function loadProjects(): Promise<void> {
  try {
    projects.value = await projectsApi.listProjects();
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '项目列表加载失败' });
    projects.value = [];
  }
}

async function fetchTasksForSelectedProject(): Promise<void> {
  const key = selectedProject.value;
  expandedRows.value.clear();
  selectedTask.value = null;
  selectedDownloadTaskIds.value = new Set();

  if (!key) {
    tasksLoading.value = false;
    allTasks.value = [];
    updateGridData();
    return;
  }

  const pid = Number(key);
  if (!Number.isFinite(pid) || pid <= 0) {
    tasksLoading.value = false;
    allTasks.value = [];
    updateGridData();
    return;
  }

  tasksLoading.value = true;
  try {
    const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: pid });
    const project = projects.value.find((p) => Number(p.projectid) === pid);
    const projectNo = project ? formatProjectNo(project) : `P-${String(pid).padStart(4, '0')}`;
    const projectName = project?.projectname ?? '';
    allTasks.value = await mapInspectionTasksToRows(tasks, pid, projectNo, projectName);
    await refreshOfflineStatuses();
    if (allTasks.value.length === 0) {
      showToast({ message: '当前项目暂无巡检任务' });
    }
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '任务列表加载失败' });
    allTasks.value = [];
  } finally {
    tasksLoading.value = false;
    updateGridData();
  }
}

async function restoreSessionProjectIfValid(): Promise<void> {
  let saved = '';
  try {
    saved = sessionStorage.getItem(TASK_LIST_SELECTED_PROJECT_KEY)?.trim() ?? '';
  } catch {
    return;
  }
  if (!saved) return;
  const exists = projects.value.some((p) => String(p.projectid) === saved);
  if (!exists) {
    try {
      sessionStorage.removeItem(TASK_LIST_SELECTED_PROJECT_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  selectedProject.value = saved;
  await fetchTasksForSelectedProject();
}

function resolveOfflineStatus(localTask: { status: string; sync_status: string } | null): TaskListRow['localDownloadStatus'] {
  if (localTask == null) {
    return 'not-downloaded';
  }
  if (localTask.status === 'uploaded') {
    return 'uploaded';
  }
  return 'downloaded';
}

async function refreshOfflineStatuses(): Promise<void> {
  const localTasks = await offlineTaskRepository.listAll();
  const localTaskMap = new Map(
    localTasks.flatMap((task) => {
      const keys = [task.task_uuid];
      if (task.server_task_id) {
        keys.push(task.server_task_id);
      }
      return keys.map((key) => [key, task] as const);
    }),
  );

  allTasks.value = allTasks.value.map((task) => ({
    ...task,
    localDownloadStatus: resolveOfflineStatus(
      localTaskMap.get(String(task.rawTaskid)) ?? localTaskMap.get(task.id) ?? null,
    ),
  }));
}

function isDownloadSelectable(task: TaskListRow): boolean {
  return task.rawTaskid > 0 && !task.isSubTask;
}

function isTaskChecked(taskId: string): boolean {
  return selectedDownloadTaskIds.value.has(taskId);
}

function toggleTaskChecked(task: TaskListRow): void {
  if (!isDownloadSelectable(task)) {
    return;
  }

  const next = new Set(selectedDownloadTaskIds.value);
  if (next.has(task.id)) {
    next.delete(task.id);
  } else {
    next.add(task.id);
  }
  selectedDownloadTaskIds.value = next;
  updateGridData();
}

// 过滤后的任务列表（当前项目数据已由接口限定，仅本地搜索）
const filteredTasks = computed(() => {
  let tasks = allTasks.value;

  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        String(t.id).toLowerCase().includes(searchLower) ||
        String(t.deviceModel).toLowerCase().includes(searchLower) ||
        String(t.serialNo).toLowerCase().includes(searchLower) ||
        String(t.engineer).toLowerCase().includes(searchLower) ||
        String(t.schemeName).toLowerCase().includes(searchLower),
    );
  }

  return tasks;
});

// 转换为扁平化的行数据（用于显示树形结构）
const convertToFlatRows = (tasks: any[]): any[] => {
  const parentTasks = tasks.filter(t => !t.parentId).sort((a, b) => a.id.localeCompare(b.id));
  const childTasksMap = new Map<string, any[]>();
  
  // 按父任务ID分组子任务
  tasks.filter(t => t.parentId).forEach(child => {
    if (!childTasksMap.has(child.parentId)) {
      childTasksMap.set(child.parentId, []);
    }
    childTasksMap.get(child.parentId)!.push(child);
  });
  
  // 排序子任务
  childTasksMap.forEach((children) => {
    children.sort((a, b) => a.id.localeCompare(b.id));
  });
  
  // 构建扁平化列表
  const flatRows: any[] = [];
  
  parentTasks.forEach(parent => {
    flatRows.push({
      ...parent,
      level: 0,
      hasChildren: childTasksMap.has(parent.id),
    });
    
    // 如果父任务展开，添加子任务
    if (expandedRows.value.has(parent.id) && childTasksMap.has(parent.id)) {
      const children = childTasksMap.get(parent.id)!;
      children.forEach(child => {
        flatRows.push({
          ...child,
          level: 1,
          hasChildren: false,
        });
      });
    }
  });
  
  return flatRows;
};

// 展开/收缩状态
const expandedRows = ref<Set<string>>(new Set());

// ag-grid 配置
const gridOptions = ref<GridOptions | null>(null);
const gridApi = ref<any>(null);

let taskGridResizeTimer: ReturnType<typeof setTimeout> | null = null;
function fitTaskGridColumns() {
  const api = gridApi.value as { sizeColumnsToFit?: () => void } | null;
  api?.sizeColumnsToFit?.();
}
function scheduleFitTaskGridColumns() {
  if (taskGridResizeTimer != null) clearTimeout(taskGridResizeTimer);
  taskGridResizeTimer = setTimeout(() => {
    taskGridResizeTimer = null;
    fitTaskGridColumns();
  }, 100);
}
function onTaskGridWindowResize() {
  scheduleFitTaskGridColumns();
}

// 创建子任务（每次只创建一个；后端按产品拆任务时 deviceCount 为 1，按钮将保持禁用）
const handleCreateSubTask = (task: TaskListRow | null) => {
  if (!task) {
    alert('请先选择任务');
    return;
  }
  
  if (task.isSubTask) {
    alert('子任务不能再创建子任务');
    return;
  }
  
  if (task.deviceCount <= 1) {
    alert('设备数量不足，无法创建子任务');
    return;
  }
  
  // 查找已存在的子任务数量
  const existingSubTasks = allTasks.value.filter(t => t.parentId === task.id);
  const nextSubTaskIndex = existingSubTasks.length + 1;
  
  // 检查是否已达到设备数量上限
  if (nextSubTaskIndex > task.deviceCount) {
    alert(`已达到设备数量上限（${task.deviceCount}），无法创建更多子任务`);
    return;
  }
  
  // 创建新的子任务
  const subTaskId = `${task.id}-${nextSubTaskIndex}`;
  
  // 检查是否已存在（防止重复）
  if (allTasks.value.find(t => t.id === subTaskId)) {
    alert('子任务已存在');
    return;
  }
  
  const newSubTask: TaskListRow = {
    id: subTaskId,
    projectId: task.projectId,
    projectNo: task.projectNo,
    projectName: task.projectName,
    taskType: task.taskType,
    taskTypeLabel: task.taskTypeLabel,
    deviceModel: task.deviceModel,
    serialNo: task.serialNo,
    schemeId: task.schemeId,
    schemeName: task.schemeName,
    deviceCount: 1,
    remark: `设备序列号：SN-${String(nextSubTaskIndex).padStart(3, '0')}`,
    cloudStatus: null,
    localDownloadStatus: 'not-downloaded',
    engineer: '',
    parentId: task.id,
    isSubTask: true,
    rawTaskid: 0,
  };
  
  // 添加到任务列表
  allTasks.value.push(newSubTask);
  
  // 自动展开父任务以显示新创建的子任务
  if (!expandedRows.value.has(task.id)) {
    expandedRows.value.add(task.id);
  }
  
  // 更新表格
  updateGridData();
};


// 查看方案
const handleViewScheme = (task: TaskListRow) => {
  if (!task.schemeId) {
    showToast({ message: '该任务未关联维护模板' });
    return;
  }
  // 从任务列表进入，传递任务ID和返回路径
  router.push({
    path: `/scheme/view/${task.schemeId}`,
    query: {
      taskId: task.rawTaskid > 0 ? String(task.rawTaskid) : task.id,
      returnPath: '/task/list-online',
      source: 'online',
    },
  });
};

// 查看任务
const handleReviewTask = (task: TaskListRow) => {
  const tid = task.rawTaskid > 0 ? String(task.rawTaskid) : task.id;
  router.push({
    path: `/task/review/${tid}`,
    query: { source: 'online' },
  });
};

const handleOpenAndroidDebug = () => {
  router.push('/android/debug');
};

// 删除任务（后端：先删 Taskitems，再 DELETE /api/InspectionTasks/{id}）
const handleDeleteTask = async (task: TaskListRow) => {
  const tid = task.rawTaskid;
  if (tid > 0) {
    if (
      !confirm(
        `确定删除巡检任务「${task.id}」吗？将调用接口删除该任务及其下所有任务项，且不可恢复。`,
      )
    ) {
      return;
    }
    try {
      const items = await taskitemsApi.listTaskitemsByTask(tid);
      for (const it of items) {
        const iid = it.itemid;
        if (iid != null && iid > 0) await taskitemsApi.deleteTaskitem(iid);
      }
      await inspectionTasksApi.deleteInspectionTask(tid);
      if (selectedTask.value?.rawTaskid === tid) {
        selectedTask.value = null;
      }
      await fetchTasksForSelectedProject();
      showToast({ message: '已删除巡检任务' });
    } catch (e) {
      showToast({ message: e instanceof Error ? e.message : '删除任务失败' });
    }
    return;
  }

  if (
    !confirm(`确定移除本地条目「${task.id}」吗？（未关联后端任务 id，仅从列表移除）`)
  ) {
    return;
  }

  if (task.isSubTask) {
    allTasks.value = allTasks.value.filter((t) => t.id !== task.id);
  } else {
    allTasks.value = allTasks.value.filter((t) => t.id !== task.id && t.parentId !== task.id);
  }
  updateGridData();
};

// 搜索
const handleSearch = () => {
  updateGridData();
};

// 项目切换：拉取该项目下的巡检任务
const handleProjectFilter = () => {
  void fetchTasksForSelectedProject();
};

// 下载任务（从云端下载任务到本地）
const handleDownloadTasks = async () => {
  if (!selectedProject.value) {
    showToast({ message: '请先选择项目' });
    return;
  }

  const downloadableTasks = allTasks.value.filter(
    (task) => isDownloadSelectable(task) && selectedDownloadTaskIds.value.has(task.id),
  );
  if (downloadableTasks.length === 0) {
    showToast({ message: '请先勾选要下载的任务' });
    return;
  }

  const existingDownloadedTasks = downloadableTasks.filter(
    (task) => task.localDownloadStatus !== 'not-downloaded',
  );
  if (existingDownloadedTasks.length > 0) {
    const taskNames = existingDownloadedTasks.slice(0, 3).map((task) => task.id).join('、');
    const suffix = existingDownloadedTasks.length > 3 ? ' 等任务' : '';
    const confirmed = confirm(
      `以下任务已下载到本地：${taskNames}${suffix}。\n此任务已由用户下载，是否继续？`,
    );
    if (!confirmed) {
      return;
    }
  }

  try {
    let taskCount = 0;
    let itemCount = 0;
    for (const task of downloadableTasks) {
      const downloaded = await downloadTaskPackage(String(task.rawTaskid), {
        projectName: task.projectName,
        deviceModel: task.deviceModel,
      });
      task.cloudStatus = 2;
      taskCount += downloaded.taskCount;
      itemCount += downloaded.itemCount;
    }

    await refreshOfflineStatuses();
    selectedDownloadTaskIds.value = new Set();
    updateGridData();
    showToast({ message: `已下载 ${taskCount} 个任务包，共 ${itemCount} 条任务项` });
  } catch (error) {
    console.error('下载任务失败:', error);
    showToast({ message: error instanceof Error ? error.message : '下载任务失败，请稍后重试' });
  }
};

// 更新表格数据
const updateGridData = () => {
  if (!gridApi.value) return;
  
  const filtered = filteredTasks.value;
  const flatRows = convertToFlatRows(filtered);
  
  gridApi.value.setGridOption('rowData', flatRows);
};

// 切换展开/收缩
const toggleRow = (taskId: string) => {
  if (expandedRows.value.has(taskId)) {
    expandedRows.value.delete(taskId);
  } else {
    expandedRows.value.add(taskId);
  }
  updateGridData();
};

onMounted(() => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    rowHeight: 64,
    columnDefs: [
      {
        field: 'downloadSelect',
        headerName: '下载',
        resizable: false,
        sortable: false,
        filter: false,
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        cellRenderer: (params: any) => {
          const task = params.data as TaskListRow;
          if (!isDownloadSelectable(task)) {
            return '';
          }
          const checked = isTaskChecked(task.id) ? 'checked' : '';
          return `<input type="checkbox" class="task-download-checkbox" ${checked} aria-label="选择下载任务" />`;
        },
        onCellClicked: (params: any) => {
          toggleTaskChecked(params.data as TaskListRow);
        },
      },
      {
        field: 'taskTypeLabel',
        headerName: '任务类型',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 0.95,
        minWidth: 108,
        cellRenderer: (params: any) => {
          const task = params.data;
          const indent = task.level > 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
          const expandIcon = task.hasChildren
            ? expandedRows.value.has(task.id)
              ? '<span style="cursor: pointer; margin-right: 4px;">▼</span>'
              : '<span style="cursor: pointer; margin-right: 4px;">▶</span>'
            : '<span style="margin-right: 12px;"></span>';
          return `${indent}${expandIcon}${params.value ?? ''}`;
        },
        onCellClicked: (params: any) => {
          const task = params.data;
          if (task.hasChildren) {
            toggleRow(task.id);
          }
        },
        cellStyle: (params: any) => {
          return {
            fontWeight: params.data.level === 0 ? 600 : 400,
            color:
              params.data.level === 0
                ? 'var(--theme-color-text)'
                : 'var(--theme-color-text-soft)',
          };
        },
      },
      {
        field: 'deviceModel',
        headerName: '设备型号',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 0.85,
        minWidth: 96,
      },
      {
        field: 'serialNo',
        headerName: '序列号',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 120,
      },
      {
        field: 'engineer',
        headerName: '检查人员',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 0.9,
        minWidth: 110,
      },
      {
        field: 'schemeName',
        headerName: '维护方案',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1.5,
        minWidth: 100,
      },
      {
        field: 'deviceCount',
        headerName: '设备数量',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 0.55,
        minWidth: 72,
        maxWidth: 110,
        cellRenderer: (params: any) => {
          if (params.data.isSubTask) {
            return '1';
          }
          return params.value || '-';
        },
      },
      {
        field: 'cloudStatus',
        headerName: '状态',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1.05,
        minWidth: 150,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
        },
        cellRenderer: (params: any) => {
          const meta = getOnlineLifecycleMeta(params.value as TaskListRow['cloudStatus']);
          return `
            <div class="task-status-progress task-status-progress-online">
              <div class="task-status-progress-header">
                <span>${meta.label}</span>
                <span>${meta.percent}%</span>
              </div>
              <div class="task-status-progress-track">
                <div class="task-status-progress-fill task-status-progress-${meta.key}" style="width: ${meta.percent}%"></div>
              </div>
            </div>
          `;
        },
      },
      {
        field: 'actions',
        headerName: '操作',
        resizable: true,
        sortable: false,
        filter: false,
        flex: 2.35,
        minWidth: 280,
        cellRenderer: (params: any) => {
          const task = params.data;
          const taskId = task.id;
          
          let buttons = '';
          
          buttons += `<button type="button" class="ag-action-btn ag-action-btn-view" data-action="view" data-id="${taskId}">查看方案</button>`;
          buttons += `<button type="button" class="ag-action-btn ag-action-btn-review" data-action="review" data-id="${taskId}">查看任务</button>`;
          buttons += `<button type="button" class="ag-action-btn ag-action-btn-delete" data-action="delete" data-id="${taskId}">删除任务</button>`;
          
          return `<div class="ag-action-buttons">${buttons}</div>`;
        },
        onCellClicked: (params: any) => {
          const target = params.event?.target as HTMLElement | undefined;
          const btn = target?.closest?.('.ag-action-btn') as HTMLElement | null;
          const task = params.data;
          if (btn) {
            const action = btn.getAttribute('data-action');
            if (action === 'view') {
              handleViewScheme(task);
            } else if (action === 'review') {
              handleReviewTask(task);
            } else if (action === 'delete') {
              void handleDeleteTask(task);
            }
            return;
          }
          selectedTask.value = task;
        },
      },
    ],
    rowData: convertToFlatRows(filteredTasks.value),
    suppressCellFocus: true,
    onRowClicked: (params: any) => {
      // 点击行时选中任务（用于创建子任务）
      selectedTask.value = params.data;
      // 同时设置行选中状态（用于视觉反馈）
      params.api.deselectAll();
      params.node.setSelected(true);
    },
    onGridReady: (params: any) => {
      gridApi.value = params.api;
      updateGridData();
      scheduleFitTaskGridColumns();
    },
    onFirstDataRendered: () => {
      scheduleFitTaskGridColumns();
    },
  };

  window.addEventListener('resize', onTaskGridWindowResize);

  void (async () => {
    await loadProjects();
    await restoreSessionProjectIfValid();
  })();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onTaskGridWindowResize);
  if (taskGridResizeTimer != null) {
    clearTimeout(taskGridResizeTimer);
    taskGridResizeTimer = null;
  }
});
</script>

<style scoped>
.page-section {
  padding-top: 1rem;
}

.page-content {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.filter-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  margin-bottom: 1rem;
}

.table-container {
  margin-top: 1rem;
  position: relative;
}

.table-grid-wrap {
  position: relative;
  height: 600px;
  width: 100%;
}

.task-grid {
  height: 100%;
  width: 100%;
}

.table-loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  background: color-mix(in srgb, var(--theme-color-background) 85%, transparent);
  border-radius: 0 0 0.5rem 0.5rem;
  pointer-events: none;
}

.table-loading-text {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--theme-color-text-soft);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--theme-color-soft);
  border-radius: 0.5rem 0.5rem 0 0;
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.table-header-left {
  display: flex;
  align-items: center;
}

.table-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.table-header-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.modal-content {
  padding: 1rem 0;
}

.task-info {
  margin: 0.5rem 0;
  color: var(--theme-color-text-soft);
}
</style>

<style>
/* 全局样式，用于 ag-grid 内部的按钮，与 IxButton variant="secondary" 保持一致 */
.task-status-progress {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  min-width: 160px;
}

.task-status-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  color: var(--theme-color-text);
}

.task-status-progress-track {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--theme-color-soft);
  overflow: hidden;
}

.task-status-progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease;
}

.task-status-progress-pending {
  background: color-mix(in srgb, var(--theme-color-warning) 70%, white);
}

.task-status-progress-in-progress {
  background: color-mix(in srgb, var(--theme-color-primary) 80%, white);
}

.task-status-progress-completed {
  background: color-mix(in srgb, var(--theme-color-success) 80%, white);
}

.ag-action-buttons {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  height: 100%;
  padding: 0.25rem 0;
  flex-wrap: nowrap;
}

.ag-action-btn {
  /* 与 IxButton variant="secondary" 样式保持一致 */
  background-color: transparent;
  border: 1px solid var(--theme-color-soft-border);
  color: var(--theme-color-text);
  padding: 0.3125rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  min-height: 1.75rem;
  white-space: nowrap;
  font-family: inherit;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ag-action-btn:hover {
  background-color: var(--theme-color-soft-hover);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:active {
  background-color: var(--theme-color-soft-active);
  border-color: var(--theme-color-soft-border);
  color: var(--theme-color-text);
}

.ag-action-btn:focus {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.ag-action-btn:focus:not(:focus-visible) {
  outline: none;
}

.ag-action-btn-delete {
  color: var(--theme-color-alarm);
}

.ag-action-btn-delete:hover {
  background-color: var(--theme-color-alarm-soft);
  border-color: var(--theme-color-alarm);
  color: var(--theme-color-alarm);
}
</style>
