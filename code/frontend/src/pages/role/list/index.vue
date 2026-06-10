<template>
  <div>
    <IxContentHeader header-title="角色权限管理" />
    <section class="role-page">
      <aside class="role-page__sidebar">
        <div class="role-page__hero">
          <p class="role-page__eyebrow">Access Control</p>
          <h2>角色、菜单与按钮授权</h2>
          <p>当前页面直接按后端 `Permissions` 表和 `RolePermissions` 关系编辑。菜单权限请配置 `type = 1`，按钮权限请配置 `type = 2`，按钮判权优先使用 `permission`，没有时可回退到 `path`。</p>
        </div>

        <div class="role-page__toolbar">
          <IxButton variant="primary" :icon="iconAdd" @click="openCreateRoleModal">新增角色</IxButton>
          <IxButton variant="secondary" @click="loadData">刷新权限数据</IxButton>
        </div>

        <div class="role-page__list">
          <button
            v-for="role in roles"
            :key="role.roleid"
            type="button"
            class="role-page__role-item"
            :class="{ 'role-page__role-item--active': role.roleid === selectedRoleId }"
            @click="selectedRoleId = role.roleid"
          >
            <div>
              <strong>{{ role.rolename }}</strong>
              <p>角色 ID：{{ role.roleid }}</p>
            </div>
            <span class="role-page__role-actions">
              <span class="role-page__role-link" @click.stop="openEditRoleModal(role.roleid)">编辑</span>
              <span class="role-page__role-link role-page__role-link--danger" @click.stop="removeRole(role.roleid)">删除</span>
            </span>
          </button>
        </div>
      </aside>

      <div class="role-page__content">
        <div class="role-page__content-header">
          <div>
            <h2>{{ selectedRole?.rolename ?? '请选择角色' }}</h2>
            <p>保存时按 `permissionid` 写入角色权限，菜单名称与分组以前端定义匹配结果为准。若角色尚未配置显式菜单权限，页面会按角色名展示默认菜单兜底。</p>
          </div>
          <div class="role-page__header-actions">
            <div class="role-page__summary-card">
              <span>菜单</span>
              <strong>{{ selectedMenuCount }}</strong>
            </div>
            <div class="role-page__summary-card">
              <span>按钮</span>
              <strong>{{ selectedButtonCount }}</strong>
            </div>
            <div class="role-page__summary-card">
              <span>总权限</span>
              <strong>{{ selectedPermissionIds.size }}</strong>
            </div>
            <IxButton variant="secondary" :disabled="!selectedRole" @click="selectAllPermissions">全选</IxButton>
            <IxButton variant="secondary" :disabled="!selectedRole" @click="clearAllPermissions">清空</IxButton>
            <IxButton variant="primary" :disabled="!selectedRole" @click="saveRolePermissions">保存权限</IxButton>
          </div>
        </div>

        <div v-if="selectedRole && permissionSections.length > 0" class="role-page__permission-groups">
          <section v-for="section in permissionSections" :key="section.key" class="role-page__permission-group">
            <div class="role-page__group-header role-page__group-header--section">
              <div>
                <h3>{{ section.title }}</h3>
                <p>{{ section.count }} 项</p>
              </div>
              <IxButton variant="secondary" ghost @click="toggleSection(section.permissionIds, !isSectionFullySelected(section.permissionIds))">
                {{ isSectionFullySelected(section.permissionIds) ? '取消全选' : '全选本组' }}
              </IxButton>
            </div>
            <div class="role-page__permission-subgroups">
              <section v-for="group in section.groups" :key="`${section.key}-${group.label}`" class="role-page__permission-subgroup">
                <div class="role-page__subgroup-header">
                  <strong>{{ group.label }}</strong>
                  <span>{{ group.items.length }} 项</span>
                </div>
                <div class="role-page__permission-grid">
                  <label v-for="item in group.items" :key="item.permissionid" class="role-page__permission-item" :class="{ 'role-page__permission-item--selected': isPermissionSelected(item.permissionid) }">
                    <input :checked="isPermissionSelected(item.permissionid)" type="checkbox" @change="togglePermission(item.permissionid, ($event.target as HTMLInputElement).checked)" />
                    <div class="role-page__permission-body">
                      <div class="role-page__permission-topline">
                        <strong>{{ item.label }}</strong>
                        <span class="role-page__permission-badge">#{{ item.permissionid }}</span>
                      </div>
                      <small>{{ item.permission1 || item.path || '未配置 permission' }}</small>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </section>
        </div>

        <div v-else-if="selectedRole" class="role-page__empty">当前没有可编辑的权限目录。请确认后端 `Permissions` 接口已返回 `permissionid / permission / path / type`。</div>
        <div v-else class="role-page__empty">请选择左侧角色后再配置权限。</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import { IxButton, IxContentHeader, showModal, showToast } from '@siemens/ix-vue';
import { iconAdd } from '@siemens/ix-icons/icons';
import { rolePermissionsApi, rolesApi } from '@/api';
import { matchPermissionDefinition, resolveDefaultPermissionsByRoleName } from '@/auth/access';
import { loadAuthorizationCache } from '@/auth/store';
import type { PermissionDto } from '@/api/modules/permissions';
import type { RolePermissionDto, RolePermissionWithNamesDto } from '@/api/modules/rolePermissions';
import type { RoleDto } from '@/api/modules/roles';
import RoleFormModal from '../components/RoleFormModal.vue';

type PermissionCatalogItem = PermissionDto & {
  label: string;
  permissionKey: string;
  pathLabel: string;
  kind: 'menu' | 'button' | 'other';
  groupLabel: string;
};

const roles = ref<RoleDto[]>([]);
const permissions = ref<PermissionDto[]>([]);
const rolePermissions = ref<RolePermissionDto[]>([]);
const rolePermissionsWithNames = ref<RolePermissionWithNamesDto[]>([]);
const selectedRoleId = ref<number | null>(null);
const selectedPermissionIds = ref(new Set<number>());

const selectedRole = computed(() => roles.value.find((item) => item.roleid === selectedRoleId.value) ?? null);

const permissionCatalog = computed<PermissionCatalogItem[]>(() =>
  permissions.value
    .map((permission) => {
      const normalizedPath = (permission.path ?? '').trim();
      const normalizedPermission = (permission.permission1 ?? '').trim();
      const matchedDefinition = matchPermissionDefinition({
        permission: permission.permission1,
        path: permission.path,
        title: permission.title,
      });
      const isMenuPermission = permission.type === 1;
      const kind: PermissionCatalogItem['kind'] = permission.type === 1 ? 'menu' : permission.type === 2 ? 'button' : 'other';
      const firstSegment = normalizedPath.split('/').filter(Boolean)[0] ?? '';
      const permissionPrefix = normalizedPermission.split(':').filter(Boolean)[0] ?? '';
      const groupLabelMap: Record<string, string> = {
        device: '设备',
        customer: '客户',
        project: '项目',
        scheme: '方案',
        task: '任务',
        user: '用户',
        role: '角色',
        android: '安卓',
      };
      return {
        ...permission,
        label: isMenuPermission
          ? (matchedDefinition?.label ?? (normalizedPermission || normalizedPath || `权限 #${permission.permissionid}`))
          : (permission.title ?? '').trim() || normalizedPermission || normalizedPath || `权限 #${permission.permissionid}`,
        permissionKey: normalizedPermission,
        pathLabel: normalizedPath,
        kind,
        groupLabel: (isMenuPermission ? matchedDefinition?.group : undefined)
          ?? groupLabelMap[firstSegment || permissionPrefix]
          ?? ((firstSegment || permissionPrefix) ? (firstSegment || permissionPrefix).toUpperCase() : '未分组'),
      };
    })
    .sort((left, right) => {
      const typeOrder = { menu: 1, button: 2, other: 3 };
      const typeDiff = typeOrder[left.kind] - typeOrder[right.kind];
      if (typeDiff !== 0) {
        return typeDiff;
      }
      return left.permissionid - right.permissionid;
    }),
);

const permissionSections = computed(() => {
  const sectionDefs: Array<{ key: PermissionCatalogItem['kind']; title: string }> = [
    { key: 'menu', title: '菜单权限' },
    { key: 'button', title: '按钮权限' },
    { key: 'other', title: '其他权限' },
  ];

  return sectionDefs
    .map((section) => {
      const sectionItems = permissionCatalog.value.filter((item) => item.kind === section.key);
      const groupMap = new Map<string, PermissionCatalogItem[]>();
      for (const item of sectionItems) {
        const existing = groupMap.get(item.groupLabel) ?? [];
        existing.push(item);
        groupMap.set(item.groupLabel, existing);
      }
      return {
        key: section.key,
        title: section.title,
        count: sectionItems.length,
        permissionIds: sectionItems.map((item) => item.permissionid),
        groups: Array.from(groupMap.entries()).map(([label, items]) => ({ label, items })),
      };
    })
    .filter((section) => section.count > 0);
});

const selectedMenuCount = computed(() =>
  permissionCatalog.value.filter((item) => item.kind === 'menu' && selectedPermissionIds.value.has(item.permissionid)).length,
);

const selectedButtonCount = computed(() =>
  permissionCatalog.value.filter((item) => item.kind === 'button' && selectedPermissionIds.value.has(item.permissionid)).length,
);

const menuPermissionKeyById = computed(() => new Map(
  permissions.value
    .map((permission) => {
      const definition = matchPermissionDefinition({
        permission: permission.permission1,
        path: permission.path,
        title: permission.title,
      });
      return definition ? [permission.permissionid, definition.key] as const : null;
    })
    .filter((entry): entry is readonly [number, string] => Boolean(entry)),
));

function isPermissionSelected(permissionId: number) {
  return selectedPermissionIds.value.has(permissionId);
}

function resolveFallbackMenuPermissionIds(roleName?: string | null): number[] {
  const fallbackKeys = new Set(resolveDefaultPermissionsByRoleName(roleName));
  if (fallbackKeys.size === 0) {
    return [];
  }

  return permissions.value
    .filter((permission) => {
      const menuKey = menuPermissionKeyById.value.get(permission.permissionid);
      return Boolean(menuKey && fallbackKeys.has(menuKey));
    })
    .map((permission) => permission.permissionid);
}

function syncSelectedPermissionIds() {
  if (selectedRoleId.value == null) {
    selectedPermissionIds.value = new Set<number>();
    return;
  }

  const assignedIds = rolePermissions.value
    .filter((item) => item.roleid === selectedRoleId.value && item.cando)
    .map((item) => item.permissionid);

  const namedAssignedIds = rolePermissionsWithNames.value
    .map((item) => item.permissionid)
    .filter((item) => item > 0);

  const next = new Set([...assignedIds, ...namedAssignedIds]);
  const hasExplicitMenuSelection = [...next].some((permissionId) => menuPermissionKeyById.value.has(permissionId));

  if (!hasExplicitMenuSelection) {
    for (const permissionId of resolveFallbackMenuPermissionIds(selectedRole.value?.rolename)) {
      next.add(permissionId);
    }
  }

  selectedPermissionIds.value = next;
}

watch(selectedRoleId, () => {
  void loadRolePermissionsWithNames();
});

async function loadRolePermissionsWithNames() {
  if (selectedRoleId.value == null) {
    rolePermissionsWithNames.value = [];
    syncSelectedPermissionIds();
    return;
  }

  try {
    rolePermissionsWithNames.value = await rolePermissionsApi.listRolePermissionsByRoleWithNames(selectedRoleId.value);
  } catch {
    rolePermissionsWithNames.value = [];
  }

  syncSelectedPermissionIds();
}

async function loadData() {
  try {
    const cache = await loadAuthorizationCache(true);
    roles.value = cache.roles;
    permissions.value = cache.permissions;
    rolePermissions.value = cache.rolePermissions;
    if (selectedRoleId.value == null && roles.value.length > 0) {
      selectedRoleId.value = roles.value[0].roleid;
    }
    await loadRolePermissionsWithNames();
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '角色权限数据加载失败' });
  }
}

function togglePermission(permissionId: number, checked: boolean) {
  const next = new Set(selectedPermissionIds.value);
  if (checked) {
    next.add(permissionId);
  } else {
    next.delete(permissionId);
  }
  selectedPermissionIds.value = next;
}

function selectAllPermissions() {
  selectedPermissionIds.value = new Set(permissionCatalog.value.map((item) => item.permissionid));
}

function clearAllPermissions() {
  selectedPermissionIds.value = new Set<number>();
}

function toggleSection(permissionIds: number[], checked: boolean) {
  const next = new Set(selectedPermissionIds.value);
  for (const permissionId of permissionIds) {
    if (checked) {
      next.add(permissionId);
    } else {
      next.delete(permissionId);
    }
  }
  selectedPermissionIds.value = next;
}

function isSectionFullySelected(permissionIds: number[]) {
  return permissionIds.length > 0 && permissionIds.every((permissionId) => selectedPermissionIds.value.has(permissionId));
}

async function saveRolePermissions() {
  if (selectedRoleId.value == null) {
    return;
  }

  try {
    const currentRolePermissions = rolePermissions.value.filter((item) => item.roleid === selectedRoleId.value);

    for (const permission of permissions.value) {
      const permissionId = permission.permissionid;
      const checked = selectedPermissionIds.value.has(permissionId);
      const existing = currentRolePermissions.find((item) => item.permissionid === permissionId);
      if (existing) {
        if (!checked) {
          await rolePermissionsApi.deleteRolePermission(existing.rpid);
        } else if (existing.cando !== checked) {
          await rolePermissionsApi.updateRolePermission({ ...existing, cando: checked });
        }
      } else if (checked) {
        await rolePermissionsApi.createRolePermission({
          roleid: selectedRoleId.value,
          permissionid: permissionId,
          cando: true,
        });
      }
    }

    await loadData();
    showToast({ message: '角色权限已保存' });
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '角色权限保存失败' });
  }
}

function openCreateRoleModal() {
  showModal({
    size: '480',
    centered: true,
    content: h(RoleFormModal, {
      data: {
        title: '新增角色',
        initial: '',
        onSubmit: async (roleName: string) => {
          try {
            await rolesApi.createRole({ rolename: roleName });
            await loadData();
            showToast({ message: '角色新增成功' });
          } catch (error) {
            showToast({ message: error instanceof Error ? error.message : '角色新增失败' });
          }
        },
      },
    }),
  });
}

function openEditRoleModal(roleId: number) {
  const role = roles.value.find((item) => item.roleid === roleId);
  if (!role) {
    return;
  }
  showModal({
    size: '480',
    centered: true,
    content: h(RoleFormModal, {
      data: {
        title: '编辑角色',
        initial: role.rolename,
        onSubmit: async (roleName: string) => {
          try {
            await rolesApi.updateRole({ ...role, rolename: roleName });
            await loadData();
            showToast({ message: '角色保存成功' });
          } catch (error) {
            showToast({ message: error instanceof Error ? error.message : '角色保存失败' });
          }
        },
      },
    }),
  });
}

async function removeRole(roleId: number) {
  if (!confirm('确定要删除该角色吗？\n若已有用户绑定该角色，后端可能拒绝删除。')) {
    return;
  }
  try {
    await rolesApi.deleteRole(roleId);
    if (selectedRoleId.value === roleId) {
      selectedRoleId.value = null;
    }
    await loadData();
    showToast({ message: '角色删除成功' });
  } catch (error) {
    showToast({ message: error instanceof Error ? error.message : '角色删除失败' });
  }
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.role-page {
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  gap: 1.5rem;
  padding-top: 1rem;
  align-items: start;
}

.role-page__sidebar {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: 1rem;
}

.role-page__hero {
  padding: 1.25rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0;
  background: var(--theme-background-2, #fff);
  color: var(--theme-color-std-text);
}

.role-page__eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theme-color-primary);
}

.role-page__hero h2,
.role-page__hero p {
  margin: 0;
}

.role-page__hero p {
  margin-top: 0.75rem;
  line-height: 1.7;
  color: #58626b;
}

.role-page__toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-page__list {
  display: grid;
  gap: 0.75rem;
}

.role-page__role-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0;
  border: 1px solid var(--theme-color-soft-border);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.role-page__role-item:hover {
  background: var(--theme-background-1, #f7f7f7);
}

.role-page__role-item p {
  margin: 0.4rem 0 0;
  color: #68737d;
  font-size: 0.875rem;
}

.role-page__role-item--active {
  border-color: var(--theme-color-primary);
  background: var(--theme-background-1, #f7f7f7);
}

.role-page__role-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-end;
}

.role-page__role-link {
  color: var(--theme-color-primary);
  font-size: 0.875rem;
}

.role-page__role-link--danger {
  color: var(--theme-color-alarm);
}

.role-page__content-header {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.role-page__header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.role-page__summary-card {
  min-width: 120px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0;
  background: #fff;
  color: var(--theme-color-std-text);
}

.role-page__summary-card span,
.role-page__summary-card strong {
  display: block;
}

.role-page__summary-card span {
  font-size: 0.75rem;
  color: #68737d;
}

.role-page__summary-card strong {
  margin-top: 0.25rem;
  font-size: 1.5rem;
}

.role-page__content-header h2,
.role-page__content-header p {
  margin: 0;
}

.role-page__content-header p {
  margin-top: 0.5rem;
  color: #58626b;
}

.role-page__permission-groups {
  display: grid;
  gap: 1rem;
}

.role-page__permission-group {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0;
  background: #fff;
}

.role-page__permission-subgroups {
  display: grid;
  gap: 0.9rem;
}

.role-page__permission-subgroup {
  display: grid;
  gap: 0.65rem;
}

.role-page__subgroup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #4d5b66;
}

.role-page__subgroup-header span {
  font-size: 0.82rem;
  color: #68737d;
}

.role-page__group-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.role-page__group-header--section {
  align-items: center;
}

.role-page__group-header h3,
.role-page__group-header p {
  margin: 0;
}

.role-page__group-header p {
  margin-top: 0.35rem;
  color: #68737d;
  font-size: 0.875rem;
}

.role-page__permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.role-page__permission-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: flex-start;
  min-height: 72px;
  padding: 0.75rem 0.85rem;
  border-radius: 0;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.role-page__permission-item:hover {
  background: var(--theme-background-1, #f7f7f7);
}

.role-page__permission-item--selected {
  border-color: var(--theme-color-primary);
  background: rgba(0, 146, 135, 0.06);
}

.role-page__permission-body {
  display: grid;
  gap: 0.18rem;
}

.role-page__permission-topline {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.role-page__permission-item small {
  color: #68737d;
  line-height: 1.35;
  font-size: 0.78rem;
  word-break: break-all;
}

.role-page__permission-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  padding: 0 0.55rem;
  border-radius: 0;
  background: var(--theme-background-1, #f7f7f7);
  color: var(--theme-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.role-page__empty {
  padding: 3rem 0;
  color: #68737d;
  text-align: center;
}

@media (max-width: 960px) {
  .role-page {
    grid-template-columns: 1fr;
  }

  .role-page__sidebar {
    position: static;
  }

  .role-page__content-header,
  .role-page__header-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>