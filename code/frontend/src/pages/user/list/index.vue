<template>
  <div>
    <IxContentHeader header-title="用户管理" />
    <section class="page-section">
      <div class="page-content">
        <div class="filter-section">
          <div class="filter-section__left">
            <IxInput v-model="searchText" placeholder="搜索用户名、手机号或 GID" style="flex: 1; max-width: 360px;" />
            <IxSelect v-model="selectedRoleId" placeholder="全部角色" style="min-width: 220px;">
              <IxSelectItem label="全部角色" value="" />
              <IxSelectItem v-for="role in roles" :key="role.roleid" :label="role.rolename" :value="String(role.roleid)" />
            </IxSelect>
            <IxButton variant="secondary" @click="handleSearch">筛选</IxButton>
          </div>
          <IxButton v-if="canCreateUser" variant="primary" :icon="iconAdd" @click="openCreateModal">新增用户</IxButton>
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
import { computed, h, onMounted, ref } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { getIxTheme } from '@siemens/ix-aggrid';
import { AllCommunityModule, GridOptions, ModuleRegistry } from 'ag-grid-community';
import * as agGrid from 'ag-grid-community';
import { IxButton, IxContentHeader, IxInput, IxSelect, IxSelectItem, showModal, showToast } from '@siemens/ix-vue';
import { iconAdd } from '@siemens/ix-icons/icons';
import { companiesApi, rolesApi, usersApi } from '@/api';
import { hasAnyButtonPermission } from '@/auth/store';
import type { CompanyDto } from '@/api/modules/companies';
import type { RoleDto } from '@/api/modules/roles';
import type { UserDto } from '@/api/modules/users';
import UserFormModal, { type UserFormPayload } from '../components/UserFormModal.vue';

ModuleRegistry.registerModules([AllCommunityModule]);

type UserRow = {
  userid: string;
  username: string;
  mobile: string;
  industry: string;
  gid: string;
  roleId: string;
  roleName: string;
  createdate: string;
};

const roles = ref<RoleDto[]>([]);
const companies = ref<CompanyDto[]>([]);
const users = ref<UserDto[]>([]);
const searchText = ref('');
const selectedRoleId = ref('');
const gridOptions = ref<GridOptions | null>(null);

const canCreateUser = computed(() => hasAnyButtonPermission(['user:create', '/user/create']));
const canEditUser = computed(() => hasAnyButtonPermission(['user:update', '/user/update']));
const canDeleteUser = computed(() => hasAnyButtonPermission(['user:delete', '/user/delete']));

const roleOptions = computed(() => roles.value.map((role) => ({ value: String(role.roleid), label: role.rolename })));
const companyOptions = computed(() => companies.value.map((company) => ({
  value: String(company.companyid),
  label: company.companyname?.trim() || `客户 #${company.companyid}`,
})));

function mapUserToRow(user: UserDto): UserRow {
  const roleName = roles.value.find((item) => item.roleid === user.role)?.rolename ?? '未分配';
  return {
    userid: String(user.userid),
    username: user.username ?? '',
    mobile: user.mobile ?? '',
    industry: user.industry ?? '',
    gid: user.gid ?? '',
    roleId: user.role != null ? String(user.role) : '',
    roleName,
    createdate: user.createdate ?? '',
  };
}

const filteredRows = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  return users.value
    .map(mapUserToRow)
    .filter((row) => {
      if (selectedRoleId.value && row.roleId !== selectedRoleId.value) {
        return false;
      }
      if (!q) {
        return true;
      }
      return [row.username, row.mobile, row.gid].join(' ').toLowerCase().includes(q);
    });
});

const handleSearch = () => {
};

async function loadData() {
  try {
    const [roleList, companyList, userList] = await Promise.all([
      rolesApi.listRoles(),
      companiesApi.listCompanies(),
      usersApi.listUsers(),
    ]);
    roles.value = roleList;
    companies.value = companyList;
    users.value = userList;
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '用户列表加载失败' });
  }
}

function toPayload(form: UserFormPayload, existingId?: number) {
  return {
    ...(existingId ? { userid: existingId } : {}),
    companyid: Number(form.companyId || 0),
    username: form.username,
    mobile: form.mobile || null,
    email: form.email || '',
    industry: form.industry || null,
    gid: form.gid || null,
    role: Number(form.role || 0),
    createdate: new Date().toISOString().slice(0, 10),
  };
}

function openCreateModal() {
  showModal({
    size: '600',
    centered: true,
    content: h(UserFormModal, {
      data: {
        title: '新增用户',
        initial: { username: '', companyId: '', mobile: '', email: '', industry: '', gid: '', role: '' },
        roleOptions: roleOptions.value,
        companyOptions: companyOptions.value,
        onSubmit: async (payload: UserFormPayload) => {
          try {
            await usersApi.createUser(toPayload(payload));
            await loadData();
            showToast({ message: '新增成功' });
          } catch (error) {
            showToast({ message: error instanceof Error ? error.message : '新增失败' });
          }
        },
      },
    }),
  });
}

function openEditModal(id: string) {
  const user = users.value.find((item) => String(item.userid) === id);
  if (!user) {
    return;
  }
  showModal({
    size: '600',
    centered: true,
    content: h(UserFormModal, {
      data: {
        title: '编辑用户',
        initial: {
          username: user.username ?? '',
          companyId: user.companyid != null ? String(user.companyid) : '',
          mobile: user.mobile ?? '',
          email: user.email ?? '',
          industry: user.industry ?? '',
          gid: user.gid ?? '',
          role: user.role != null ? String(user.role) : '',
        },
        roleOptions: roleOptions.value,
        companyOptions: companyOptions.value,
        onSubmit: async (payload: UserFormPayload) => {
          try {
            await usersApi.updateUser(toPayload(payload, Number(id)) as UserDto & { userid: number });
            await loadData();
            showToast({ message: '保存成功' });
          } catch (error) {
            showToast({ message: error instanceof Error ? error.message : '保存失败' });
          }
        },
      },
    }),
  });
}

async function deleteUser(id: string) {
  if (!confirm('确定要删除该用户吗？\n删除后不可恢复。')) {
    return;
  }
  try {
    await usersApi.deleteUser(Number(id));
    await loadData();
    showToast({ message: '删除成功' });
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '删除失败' });
  }
}

onMounted(async () => {
  gridOptions.value = {
    theme: getIxTheme(agGrid),
    columnDefs: [
      { field: 'username', headerName: '用户名', minWidth: 180, flex: 1, sortable: true, filter: true },
      { field: 'mobile', headerName: '手机号', minWidth: 160, flex: 1 },
      { field: 'industry', headerName: '行业', minWidth: 140, flex: 1 },
      { field: 'gid', headerName: 'OneID GID', minWidth: 220, flex: 1.3 },
      { field: 'roleName', headerName: '角色', minWidth: 140, flex: 0.8 },
      { field: 'createdate', headerName: '创建日期', minWidth: 140, flex: 0.8 },
      {
        field: 'actions',
        headerName: '操作',
        pinned: 'right',
        width: 160,
        cellRenderer: () => {
          const actions: string[] = [];
          if (canEditUser.value) {
            actions.push('<button type="button" class="ag-action-btn ag-action-btn-edit" data-action="edit">编辑</button>');
          }
          if (canDeleteUser.value) {
            actions.push('<button type="button" class="ag-action-btn ag-action-btn-remove" data-action="delete">删除</button>');
          }
          return actions.length > 0
            ? `<div class="ag-action-buttons">${actions.join('')}</div>`
            : '<span class="ag-action-empty">无可用操作</span>';
        },
        onCellClicked: (params: { event?: Event; data?: UserRow }) => {
          const target = params.event?.target as HTMLElement | undefined;
          if (!target?.classList.contains('ag-action-btn') || !params.data) {
            return;
          }
          const action = target.getAttribute('data-action');
          if (action === 'edit') {
            openEditModal(params.data.userid);
          } else if (action === 'delete') {
            void deleteUser(params.data.userid);
          }
        },
      },
    ],
    rowData: filteredRows.value,
    suppressCellFocus: true,
  };

  await loadData();
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
}

.ag-action-btn-remove:hover {
  border-color: var(--theme-color-alarm);
  color: var(--theme-color-alarm);
}

.ag-action-empty {
  display: inline-flex;
  align-items: center;
  height: 100%;
  color: #8a939b;
  font-size: 0.875rem;
}
</style>