<!-- 客户管理页面 -->
<template>
  <div>
    <IxContentHeader header-title="客户管理">
    </IxContentHeader>
    <section class="page-section">
      <div class="page-content">
        <div class="filter-section">
          <div class="filter-section__left">
            <IxInput
              v-model="searchText"
              placeholder="搜索客户名称、行业或联系人"
              style="flex: 1; max-width: 360px;"
            />
            <IxButton variant="secondary" @click="handleSearch">搜索</IxButton>
          </div>
          <IxButton variant="primary" :icon="iconAdd" @click="openCreateModal">
            新增客户
          </IxButton>
        </div>

        <div class="table-container">
          <AgGridVue
            v-if="gridOptions"
            style="height: 600px; width: 100%"
            :gridOptions="gridOptions"
            :rowData="filteredRows"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
} from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import {
  IxContentHeader,
  IxButton,
  IxInput,
  showModal,
  showToast,
} from '@siemens/ix-vue';
import { iconAdd } from '@siemens/ix-icons/icons';
import type { CustomerFormPayload } from '../components/CustomerFormModal.vue';
import CustomerFormModal from '../components/CustomerFormModal.vue';
import { companiesApi } from '@/api';
import type { CompanyDto } from '@/api/modules/companies';

ModuleRegistry.registerModules([AllCommunityModule]);

type CustomerRow = {
  id: string;
  name: string;
  industry: string;
  contact: string;
  remarks: string;
  phone: string;
  email: string;
  createdAt: string;
};

const searchText = ref('');

const customers = ref<CustomerRow[]>([]);

const emptyForm = () => ({
  name: '',
  industry: '',
  contact: '',
  phone: '',
  email: '',
  remarks: '',
});

function mapCompanyToRow(c: CompanyDto): CustomerRow {
  return {
    id: String(c.companyid),
    name: c.companyname ?? '',
    // 当前后端 Company 仅含 creditCode，这里映射到现有“行业”列，后续可改列名
    industry: c.creditCode ?? '',
    contact: '',
    remarks: '',
    phone: '',
    email: '',
    createdAt: '',
  };
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const allRows = computed<CustomerRow[]>(() => customers.value);

const filteredRows = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return allRows.value;
  return allRows.value.filter((row) => {
    const hay = [row.name, row.industry, row.contact, row.remarks, row.phone, row.email]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
});

const gridOptions = ref<GridOptions | null>(null);

const handleSearch = () => {
  // 搜索由 `filteredRows` 计算属性自动驱动，这里保留按钮行为以符合用户操作习惯。
};

async function loadCustomers() {
  try {
    const list = await companiesApi.listCompanies();
    customers.value = list.map(mapCompanyToRow);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '客户列表加载失败';
    showToast({ message: msg });
  }
}

function toUpsertPayload(id: string | undefined, payload: CustomerFormPayload) {
  const companyid = id ? Number.parseInt(id, 10) : undefined;
  return {
    ...(companyid ? { companyid } : {}),
    companyname: payload.name,
    creditCode: payload.industry,
  };
}

const openCreateModal = () => {
  showModal({
    size: '600',
    centered: true,
    content: h(CustomerFormModal, {
      data: {
        title: '新增客户',
        initial: emptyForm(),
        onSubmit: async (payload: CustomerFormPayload) => {
          try {
            await companiesApi.createCompany(toUpsertPayload(undefined, payload));
            await loadCustomers();
            showToast({ message: '新增成功' });
          } catch (e) {
            const msg = e instanceof Error ? e.message : '新增失败';
            showToast({ message: msg });
          }
        },
      },
    }),
  });
};

const openEditModal = (id: string) => {
  const row = customers.value.find((c) => c.id === id);
  if (!row) return;
  showModal({
    size: '600',
    centered: true,
    content: h(CustomerFormModal, {
      data: {
        title: '编辑客户',
        initial: {
          name: row.name,
          industry: row.industry,
          contact: row.contact,
          phone: row.phone,
          email: row.email,
          remarks: row.remarks,
        },
        onSubmit: async (payload: CustomerFormPayload) => {
          try {
            await companiesApi.updateCompany(toUpsertPayload(id, payload));
            await loadCustomers();
            showToast({ message: '保存成功' });
          } catch (e) {
            const msg = e instanceof Error ? e.message : '保存失败';
            showToast({ message: msg });
          }
        },
      },
    }),
  });
};

const removeCustomer = async (id: string) => {
  if (
    !confirm(
      '确定要删除该客户吗？\n删除后不可恢复。',
    )
  ) {
    return;
  }
  try {
    await companiesApi.deleteCompany(Number.parseInt(id, 10));
    await loadCustomers();
    showToast({ message: '删除成功' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败';
    showToast({ message: msg });
  }
};

onMounted(async () => {
  const ixTheme = getIxTheme(agGrid);

  gridOptions.value = {
    theme: ixTheme,
    tooltipShowDelay: 500,
    columnDefs: [
      {
        field: 'name',
        headerName: '客户名称',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 200,
        cellStyle: { fontWeight: 500 },
      },
      {
        field: 'industry',
        headerName: '行业',
        resizable: true,
        sortable: true,
        filter: true,
        width: 160,
      },
      {
        field: 'contact',
        headerName: '联系人',
        resizable: true,
        sortable: true,
        filter: true,
        width: 140,
      },
      {
        field: 'remarks',
        headerName: '备注',
        resizable: true,
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: any) => {
          const v = params.value;
          if (v == null || String(v).trim() === '') return '—';
          return String(v);
        },
      },
      {
        field: 'createdAt',
        headerName: '创建时间',
        resizable: true,
        sortable: true,
        filter: true,
        width: 190,
        cellRenderer: (params: any) =>
          formatDateTime(params.value ?? ''),
        cellStyle: { fontFamily: 'inherit' },
      },
      {
        field: 'actions',
        headerName: '操作',
        resizable: false,
        sortable: false,
        filter: false,
        pinned: 'right',
        width: 160,
        cellRenderer: () => `
            <div class="ag-action-buttons">
              <button type="button" class="ag-action-btn ag-action-btn-edit" data-action="edit">编辑</button>
              <button type="button" class="ag-action-btn ag-action-btn-remove" data-action="delete">删除</button>
            </div>
          `,
        onCellClicked: (params: any) => {
          const target = params.event?.target as HTMLElement | undefined;
          if (!target?.classList.contains('ag-action-btn')) return;
          const action = target.getAttribute('data-action');
          const id = params.data?.id as string | undefined;
          if (!id) return;
          if (action === 'edit') {
            openEditModal(id);
          } else if (action === 'delete') {
            removeCustomer(id);
          }
        },
      },
    ],
    rowData: filteredRows.value,
    suppressCellFocus: true,
  };

  await loadCustomers();
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
  margin-bottom: 1rem;
}

.filter-section__left {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.table-container {
  margin-top: 1rem;
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

.ag-action-btn-remove:hover {
  border-color: var(--theme-color-alarm);
  color: var(--theme-color-alarm);
}
</style>

