<!-- 项目列表页 -->
<template>
  <div>
    <IxContentHeader header-title="项目列表" />
    <section class="page-section">
      <div class="page-content">
        <!-- 搜索和筛选区域 -->
        <div class="filter-section">
          <div class="filter-section__left">
            <IxInput
              v-model="searchText"
              placeholder="搜索项目名称或编号"
              style="flex: 1; max-width: 360px"
            />
            <IxSelect v-model="selectedStatus" placeholder="全部状态" style="min-width: 200px">
              <IxSelectItem
                v-for="item in statusList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </IxSelect>
            <IxButton variant="secondary" @click="handleFilter">筛选</IxButton>
          </div>
          <IxButton variant="primary" :icon="iconAdd" @click="navigateTo('/project/create')">
            新建项目
          </IxButton>
        </div>

        <!-- 项目列表表格 - 使用 ag-grid -->
        <div class="table-container">
          <AgGridVue
            v-if="gridOptions"
            style="height: 600px; width: 100%"
            :gridOptions="gridOptions"
            :rowData="filteredProjects"
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
import { IxContentHeader, IxButton, IxInput, IxSelect, IxSelectItem, showToast } from '@siemens/ix-vue';
import { iconAdd } from '@siemens/ix-icons/icons';
import statusData from '@/mockdata/common/projectStatus.json';
import { companiesApi, projectsApi } from '@/api';
import type { ProjectDto } from '@/api/modules/projects';

ModuleRegistry.registerModules([AllCommunityModule]);

const router = useRouter();

const navigateTo = (path: string) => {
  router.push(path);
};

const navigateToDetail = (id: string) => {
  router.push(`/project/detail/${id}`);
};

const navigateToReport = (id: string) => {
  router.push(`/project/report/${id}`);
};

const searchText = ref('');

const selectedStatus = ref('all');

const statusList = statusData.statusList;
const statusMap = statusData.statusMap;

type ProjectRow = {
  id: string;
  projectNo: string;
  name: string;
  customer: string;
  factory: string;
  projectManager: string;
  status: 'draft' | 'active' | 'closed';
};

/** 后端 projectstatus 数值 → 与现有 UI 一致的状态（可按实际枚举扩展） */
const PROJECT_STATUS_CODE_MAP: Record<number, 'draft' | 'active' | 'closed'> = {
  0: 'draft',
  1: 'active',
  64: 'active',
  128: 'closed',
};

function mapProjectStatus(code: number): 'draft' | 'active' | 'closed' {
  return PROJECT_STATUS_CODE_MAP[code] ?? 'draft';
}

function formatProjectNo(p: ProjectDto): string {
  if (p.projectid == null) return '—';
  return `P-${String(p.projectid).padStart(4, '0')}`;
}

function mapProjectToRow(p: ProjectDto, companyName: string): ProjectRow {
  return {
    id: String(p.projectid ?? ''),
    projectNo: formatProjectNo(p),
    name: p.projectname ?? '',
    customer: companyName,
    factory: '—',
    projectManager: p.managerid != null ? `用户#${p.managerid}` : '—',
    status: mapProjectStatus(p.projectstatus),
  };
}

const getStatusText = (status: string) => {
  return statusMap[status as keyof typeof statusMap] || status;
};

const projects = ref<ProjectRow[]>([]);

const filteredProjects = computed(() => {
  let list = projects.value;
  if (selectedStatus.value !== 'all') {
    list = list.filter((p) => p.status === selectedStatus.value);
  }
  const q = searchText.value.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const hay = [p.projectNo, p.name, p.customer].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
});

function handleFilter() {
  // 筛选由 `filteredProjects` 计算属性驱动，保留按钮以符合操作习惯。
}

async function loadProjects() {
  try {
    const [companies, projs] = await Promise.all([
      companiesApi.listCompanies(),
      projectsApi.listProjects(),
    ]);
    const map = new Map(companies.map((c) => [c.companyid, c.companyname ?? ''] as const));
    projects.value = projs.map((p) =>
      mapProjectToRow(p, map.get(p.companyid) ?? `客户#${p.companyid}`),
    );
  } catch (e) {
    showToast({ message: e instanceof Error ? e.message : '项目列表加载失败' });
  }
}

const gridOptions = ref<GridOptions | null>(null);

onMounted(async () => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    columnDefs: [
      {
        field: 'projectNo',
        headerName: '项目编号',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
        cellStyle: { fontFamily: 'Courier New, monospace', fontWeight: 500, color: 'var(--theme-color-primary)' },
      },
      {
        field: 'name',
        headerName: '项目名称',
        resizable: true,
        sortable: true,
        filter: true,
        width: 250,
        cellStyle: { fontWeight: 500 },
      },
      {
        field: 'customer',
        headerName: '客户',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
      },
      {
        field: 'factory',
        headerName: '工厂',
        resizable: true,
        sortable: true,
        filter: true,
        width: 200,
      },
      {
        field: 'projectManager',
        headerName: '项目经理',
        resizable: true,
        sortable: true,
        filter: true,
        width: 150,
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
          const projectId = params.data.id;
          return `
            <div class="ag-action-buttons">
              <button class="ag-action-btn ag-action-btn-view" data-action="view" data-id="${projectId}">查看</button>
              <button class="ag-action-btn ag-action-btn-edit" data-action="edit" data-id="${projectId}">编辑</button>
              <button class="ag-action-btn ag-action-btn-report" data-action="report" data-id="${projectId}">查看报告</button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          const target = params.event?.target as HTMLElement | undefined;
          if (!target?.classList.contains('ag-action-btn')) return;
          const action = target.getAttribute('data-action');
          const id = target.getAttribute('data-id');
          if (!id) return;
          if (action === 'view' || action === 'edit') navigateToDetail(id);
          if (action === 'report') navigateToReport(id);
        },
      },
    ],
    suppressCellFocus: true,
  };

  await loadProjects();
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
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 1rem 0;
  margin-bottom: 0.25rem;
}

.filter-section__left {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.table-container {
  margin-top: 0.25rem;
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

.status-draft {
  background-color: var(--theme-color-soft, rgba(0, 0, 0, 0.08));
  color: var(--theme-color-text-soft, var(--theme-color-text));
  opacity: 0.8;
}

.status-active {
  background-color: var(--theme-color-primary-soft, rgba(0, 84, 166, 0.12));
  color: var(--theme-color-primary);
}

.status-closed {
  background-color: var(--theme-color-success-soft, rgba(0, 176, 79, 0.12));
  color: var(--theme-color-success);
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
}

.ag-action-btn {
  /* 与 IxButton variant="secondary" 样式保持一致 */
  background-color: transparent;
  border: 1px solid var(--theme-color-soft-border);
  color: var(--theme-color-text);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.2s ease;
  min-height: 2rem;
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
</style>
