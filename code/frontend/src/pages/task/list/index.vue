<!-- 维护任务清单页 -->
<template>
  <div>
    <IxContentHeader header-title="维护任务清单">
      <IxButton 
        variant="secondary" 
        @click="handleOpenAndroidDebug"
      >
        Android调试
      </IxButton>
      <IxButton 
        variant="secondary" 
        @click="handleDownloadTasks"
      >
        下载任务
      </IxButton>
      <IxButton 
        variant="primary" 
        @click="handleUploadData"
      >
        上传数据
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
            placeholder="全部项目" 
            style="min-width: 200px;"
            @update:modelValue="handleProjectFilter"
          >
            <IxSelectItem 
              value="all"
              label="全部项目"
            />
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
          <AgGridVue
            v-if="gridOptions"
            style="height: 600px; width: 100%"
            :gridOptions="gridOptions"
          />
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxContentHeader, IxInput, IxSelect, IxSelectItem, IxButton } from "@siemens/ix-vue";
import { downloadAllTaskPackages, downloadTaskPackage, offlineOutboxRepository, offlineTaskRepository } from '@/android';
import tasksData from '@/mockdata/task/tasks.json';
import taskStatusData from '@/mockdata/common/taskStatus.json';

ModuleRegistry.registerModules([AllCommunityModule]);

const router = useRouter();

// 搜索文本
const searchText = ref('');
// 选中的项目
const selectedProject = ref('all');
// 选中的任务（用于创建子任务）
const selectedTask = ref<any>(null);

// 从mockdata加载数据
const allTasks = ref(tasksData.tasks);
const statusMap = taskStatusData.statusMap;

// 项目列表（用于下拉框）
const projectList = computed(() => {
  const projectMap = new Map();
  allTasks.value.forEach(task => {
    if (!projectMap.has(task.projectId)) {
      projectMap.set(task.projectId, {
        id: task.projectId,
        projectNo: task.projectNo,
        name: task.projectName,
      });
    }
  });
  return Array.from(projectMap.values());
});

// 获取状态文本
const getStatusText = (status: string) => {
  return statusMap[status as keyof typeof statusMap] || status;
};

// 过滤后的任务列表
const filteredTasks = computed(() => {
  let tasks = allTasks.value;
  
  // 按项目筛选
  if (selectedProject.value !== 'all') {
    tasks = tasks.filter(t => t.projectId === selectedProject.value);
  }
  
  // 按搜索文本筛选
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase();
    tasks = tasks.filter(t => 
      t.id.toLowerCase().includes(searchLower) ||
      t.deviceModel.toLowerCase().includes(searchLower) ||
      t.schemeName.toLowerCase().includes(searchLower)
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

// 创建子任务（每次只创建一个）
const handleCreateSubTask = (task: any) => {
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
  
  const newSubTask = {
    id: subTaskId,
    projectId: task.projectId,
    projectNo: task.projectNo,
    projectName: task.projectName,
    taskType: task.taskType,
    taskTypeLabel: task.taskTypeLabel,
    deviceModel: task.deviceModel,
    schemeId: task.schemeId,
    schemeName: task.schemeName,
    deviceCount: 1,
    remark: `设备序列号：SN-${String(nextSubTaskIndex).padStart(3, '0')}`,
    status: 'pending',
    engineer: '',
    parentId: task.id,
    isSubTask: true,
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
const handleViewScheme = (task: any) => {
  // 从任务列表进入，传递任务ID和返回路径
  router.push({
    path: `/scheme/view/${task.schemeId}`,
    query: {
      taskId: task.id,
      returnPath: '/task/list',
    },
  });
};

// 执行任务
const handleExecuteTask = (task: any) => {
  void (async () => {
    try {
      const localTask = await offlineTaskRepository.getByTaskUuid(task.id);
      if (localTask == null) {
        await downloadTaskPackage(task.id);
      }
    } catch (error) {
      console.error('预加载离线任务包失败:', error);
    }

    router.push(`/task/collect/${task.id}`);
  })();
};

// 查看任务
const handleReviewTask = (task: any) => {
  router.push(`/task/review/${task.id}`);
};

const handleOpenAndroidDebug = () => {
  router.push('/android/debug');
};

// 删除任务
const handleDeleteTask = (task: any) => {
  if (!confirm(`确定要删除任务 ${task.id} 吗？${task.isSubTask ? '' : '这将同时删除所有子任务。'}`)) {
    return;
  }
  
  if (task.isSubTask) {
    // 删除子任务
    allTasks.value = allTasks.value.filter(t => t.id !== task.id);
  } else {
    // 删除父任务及其所有子任务
    allTasks.value = allTasks.value.filter(t => t.id !== task.id && t.parentId !== task.id);
  }
  
  updateGridData();
};

// 搜索
const handleSearch = () => {
  updateGridData();
};

// 项目筛选
const handleProjectFilter = () => {
  updateGridData();
};

// 下载任务（从云端下载任务到本地）
const handleDownloadTasks = async () => {
  try {
    const downloaded = await downloadAllTaskPackages();
    alert(`已下载 ${downloaded.taskCount} 个任务包，共 ${downloaded.itemCount} 条任务项到本地离线库。`);
  } catch (error) {
    console.error('下载任务失败:', error);
    alert('下载任务失败，请稍后重试');
  }
};

// 上传数据（把采集的数据批量上传至云端）
const handleUploadData = async () => {
  try {
    const pendingChanges = await offlineOutboxRepository.listPending();

    if (pendingChanges.length === 0) {
      alert('当前没有待上传的离线变更。');
      return;
    }

    if (!confirm(`当前有 ${pendingChanges.length} 条待同步离线变更。此处仅完成本地统计，云端同步接口仍待实现，是否继续查看？`)) {
      return;
    }

    alert(`待同步离线变更数量：${pendingChanges.length}\n云端同步接口尚未接入，本地 outbox 已可累计变更。`);
  } catch (error) {
    console.error('上传数据失败:', error);
    alert('上传数据失败，请稍后重试');
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
    columnDefs: [
      {
        field: 'id',
        headerName: '任务ID',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
        cellRenderer: (params: any) => {
          const task = params.data;
          const indent = task.level > 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
          const expandIcon = task.hasChildren 
            ? (expandedRows.value.has(task.id) 
                ? '<span style="cursor: pointer; margin-right: 4px;">▼</span>' 
                : '<span style="cursor: pointer; margin-right: 4px;">▶</span>')
            : '<span style="margin-right: 12px;"></span>';
          
          return `${indent}${expandIcon}${task.id}`;
        },
        onCellClicked: (params: any) => {
          const task = params.data;
          if (task.hasChildren) {
            toggleRow(task.id);
          }
        },
        cellStyle: (params: any) => {
          return {
            fontFamily: params.data.level === 0 ? 'Courier New, monospace' : 'inherit',
            fontWeight: params.data.level === 0 ? 500 : 400,
            color: params.data.level === 0 ? 'var(--theme-color-primary)' : 'var(--theme-color-text)',
          };
        },
      },
      {
        field: 'taskTypeLabel',
        headerName: '任务类型',
        resizable: true,
        sortable: true,
        filter: true,
        width: 120,
      },
      {
        field: 'deviceModel',
        headerName: '设备型号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
      },
      {
        field: 'schemeName',
        headerName: '维护方案',
        resizable: true,
        sortable: true,
        filter: true,
        width: 250,
      },
      {
        field: 'deviceCount',
        headerName: '设备数量',
        resizable: true,
        sortable: true,
        filter: true,
        width: 120,
        cellRenderer: (params: any) => {
          if (params.data.isSubTask) {
            return '1';
          }
          return params.value || '-';
        },
      },
      {
        field: 'status',
        headerName: '状态',
        resizable: true,
        sortable: true,
        filter: true,
        width: 120,
        cellRenderer: (params: any) => {
          const status = params.value;
          const statusText = getStatusText(status);
          const statusClass = `status-${status}`;
          return `<span class="status-badge ${statusClass}">${statusText}</span>`;
        },
      },
      {
        field: 'actions',
        headerName: '操作',
        resizable: false,
        sortable: false,
        filter: false,
        width: 320,
        cellRenderer: (params: any) => {
          const task = params.data;
          const taskId = task.id;
          
          let buttons = '';
          
          buttons += `<button class="ag-action-btn ag-action-btn-view" data-action="view" data-id="${taskId}">查看方案</button>`;
          buttons += `<button class="ag-action-btn ag-action-btn-execute" data-action="execute" data-id="${taskId}">执行任务</button>`;
          buttons += `<button class="ag-action-btn ag-action-btn-review" data-action="review" data-id="${taskId}">查看任务</button>`;
          buttons += `<button class="ag-action-btn ag-action-btn-delete" data-action="delete" data-id="${taskId}">删除</button>`;
          
          return `<div class="ag-action-buttons">${buttons}</div>`;
        },
        onCellClicked: (params: any) => {
          if (params.event?.target?.classList.contains('ag-action-btn')) {
            const action = params.event.target.getAttribute('data-action');
            const task = params.data;
            
            if (action === 'view') {
              handleViewScheme(task);
            } else if (action === 'execute') {
              handleExecuteTask(task);
            } else if (action === 'review') {
              handleReviewTask(task);
            } else if (action === 'delete') {
              handleDeleteTask(task);
            }
          } else {
            // 点击行时选中任务（用于创建子任务）
            selectedTask.value = params.data;
          }
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
    },
  };
});
</script>

<style scoped>
.page-section {
  padding-top: 1rem;
}

.page-content {
  max-width: 1600px;
  margin: 0 auto;
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

.status-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}

.status-pending {
  background-color: var(--theme-color-soft);
  color: var(--theme-color-text-soft);
  opacity: 0.8;
}

.status-in-progress {
  background-color: var(--theme-color-primary-soft);
  color: var(--theme-color-primary);
}

.status-completed {
  background-color: var(--theme-color-success-soft);
  color: var(--theme-color-success);
}

.status-synced {
  background-color: var(--theme-color-info-soft);
  color: var(--theme-color-info);
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
.ag-action-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  height: 100%;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

.ag-action-btn {
  /* 与 IxButton variant="secondary" 样式保持一致 */
  background-color: transparent;
  border: 1px solid var(--theme-color-soft-border);
  color: var(--theme-color-text);
  padding: 0.375rem 0.75rem;
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
