import type { RouteLocationNormalized } from 'vue-router';

export type AppRoleProfile = 'administrator' | 'engineer';

export type AuthorizedMenuItem = {
  permissionid?: number;
  label: string;
  route: string;
  backendPath: string;
  icon?: string | null;
  sort: number;
  accessPrefixes: string[];
};

type RouteAccessDefinition = {
  key: string;
  backendPath: string;
  menuRoute: string;
  accessPrefixes: string[];
  fallbackLabel: string;
  group: '基础数据' | '项目执行' | '系统管理';
};

const routeAccessDefinitions: RouteAccessDefinition[] = [
  {
    key: 'device:view',
    backendPath: '/device',
    menuRoute: '/device/list',
    accessPrefixes: ['/device/list'],
    fallbackLabel: '设备管理',
    group: '基础数据',
  },
  {
    key: 'customer:view',
    backendPath: '/customer',
    menuRoute: '/customer/list',
    accessPrefixes: ['/customer/list'],
    fallbackLabel: '客户管理',
    group: '基础数据',
  },
  {
    key: 'project:view',
    backendPath: '/project',
    menuRoute: '/project/list',
    accessPrefixes: ['/project/list', '/project/detail', '/project/report'],
    fallbackLabel: '项目列表',
    group: '项目执行',
  },
  {
    key: 'project:create',
    backendPath: '/project/create',
    menuRoute: '/project/create',
    accessPrefixes: ['/project/create'],
    fallbackLabel: '新建项目',
    group: '项目执行',
  },
  {
    key: 'scheme:view',
    backendPath: '/scheme',
    menuRoute: '/scheme/list',
    accessPrefixes: ['/scheme/list', '/scheme/view', '/scheme/edit', '/scheme/create'],
    fallbackLabel: '方案维护',
    group: '项目执行',
  },
  {
    key: 'task:online',
    backendPath: '/task/online',
    menuRoute: '/task/list-online',
    accessPrefixes: ['/task/list-online', '/task/scheme', '/task/collect', '/task/review'],
    fallbackLabel: '任务列表-在线版',
    group: '项目执行',
  },
  {
    key: 'task:offline',
    backendPath: '/task/offline',
    menuRoute: '/task/list-offline',
    accessPrefixes: ['/task/list-offline', '/task/scheme', '/task/collect', '/task/review', '/android/debug'],
    fallbackLabel: '任务列表-离线版',
    group: '项目执行',
  },
  {
    key: 'user:view',
    backendPath: '/user',
    menuRoute: '/user/list',
    accessPrefixes: ['/user/list'],
    fallbackLabel: '用户管理',
    group: '系统管理',
  },
  {
    key: 'role:view',
    backendPath: '/role',
    menuRoute: '/role/list',
    accessPrefixes: ['/role/list'],
    fallbackLabel: '角色权限',
    group: '系统管理',
  },
];

export type MenuPermissionDefinition = {
  key: string;
  label: string;
  route: string;
  group: '基础数据' | '项目执行' | '系统管理';
  description: string;
  permissionAliases: string[];
  pathAliases: string[];
};

export const menuPermissionDefinitions: MenuPermissionDefinition[] = routeAccessDefinitions.map((item) => ({
  key: item.key,
  label: item.fallbackLabel,
  route: item.menuRoute,
  group: item.group,
  description: `${item.fallbackLabel}入口`,
  permissionAliases: [item.key],
  pathAliases: [item.backendPath, ...item.accessPrefixes],
}));

export const administratorPermissionKeys = routeAccessDefinitions.map((item) => item.key);
export const engineerPermissionKeys = ['project:list', 'task:online', 'task:offline'];

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed.toLowerCase() : `/${trimmed.toLowerCase()}`;
}

function findRouteAccessDefinitionByBackendPath(path?: string | null) {
  const normalized = normalizePath(path ?? '');
  if (!normalized) {
    return undefined;
  }
  return routeAccessDefinitions.find((item) => item.backendPath === normalized);
}

function findRouteAccessDefinitionByPermission(permission?: string | null) {
  const normalized = normalizePermissionName(permission ?? '');
  if (!normalized) {
    return undefined;
  }
  return routeAccessDefinitions.find((item) => item.key === normalized);
}

function findRouteAccessDefinition(input: {
  permission?: string | null;
  path?: string | null;
  title?: string | null;
}) {
  const matchedDefinition = matchPermissionDefinition(input);
  return findRouteAccessDefinitionByPermission(input.permission)
    ?? findRouteAccessDefinitionByBackendPath(input.path)
    ?? (matchedDefinition ? routeAccessDefinitions.find((item) => item.key === matchedDefinition.key) : undefined);
}

export function resolveMenuDisplayLabel(input: {
  permission?: string | null;
  path?: string | null;
  title?: string | null;
}, fallback?: string | null): string {
  const definition = findRouteAccessDefinition(input);
  if (definition) {
    return definition.fallbackLabel;
  }
  return (fallback ?? '').trim();
}

export function buildAuthorizedMenuItem(input: {
  permissionid?: number;
  permission?: string | null;
  path?: string | null;
  icon?: string | null;
  sort?: number | null;
  type?: number | null;
}): AuthorizedMenuItem | null {
  if (input.type != null && input.type !== 1) {
    return null;
  }

  const definition = findRouteAccessDefinition(input);
  if (!definition) {
    return null;
  }

  return {
    permissionid: input.permissionid,
    label: definition.fallbackLabel,
    route: definition.menuRoute,
    backendPath: definition.backendPath,
    icon: input.icon ?? null,
    sort: input.sort ?? 0,
    accessPrefixes: definition.accessPrefixes,
  };
}

export function buildFallbackAuthorizedMenuItems(permissionKeys: string[]): AuthorizedMenuItem[] {
  return routeAccessDefinitions
    .filter((item) => permissionKeys.includes(item.key))
    .map((item, index) => ({
      permissionid: undefined,
      label: item.fallbackLabel,
      route: item.menuRoute,
      backendPath: item.backendPath,
      icon: null,
      sort: index,
      accessPrefixes: item.accessPrefixes,
    }));
}

export function resolveAccessiblePathSet(menuItems: AuthorizedMenuItem[]): Set<string> {
  return new Set(menuItems.flatMap((item) => item.accessPrefixes.map((prefix) => normalizePath(prefix))));
}

export function resolveProfilePermissions(profile: AppRoleProfile): string[] {
  return profile === 'administrator' ? administratorPermissionKeys : engineerPermissionKeys;
}

export function resolveProfileLabel(profile: AppRoleProfile): string {
  return profile === 'administrator' ? '管理员' : '工程师';
}

export function resolveDefaultPermissionsByRoleName(roleName?: string | null): string[] {
  const normalized = normalizePermissionName(roleName ?? '');
  if (!normalized) {
    return [];
  }
  if (normalized.includes('管理') || normalized.includes('admin') || normalized.includes('administrator')) {
    return administratorPermissionKeys;
  }
  if (normalized.includes('工程') || normalized.includes('engineer')) {
    return engineerPermissionKeys;
  }
  return [];
}

export function normalizePermissionName(value: string): string {
  return value.trim().toLowerCase();
}

export function buildPermissionToken(input: {
  permission?: string | null;
  path?: string | null;
}): string {
  const normalizedPermission = normalizePermissionName(input.permission ?? '');
  if (normalizedPermission) {
    return normalizedPermission;
  }
  const normalizedPath = normalizePath(input.path ?? '');
  if (normalizedPath) {
    return normalizedPath;
  }
  return '';
}

export function findPermissionDefinitionByRoute(routePath: string): MenuPermissionDefinition | undefined {
  return menuPermissionDefinitions.find((item) =>
    item.pathAliases.some((alias) => routePath === alias || routePath.startsWith(`${alias}/`)),
  );
}

export function canAccessRoute(route: RouteLocationNormalized, permissionKeys: Set<string>): boolean {
  if (route.meta.public === true) {
    return true;
  }

  const currentPath = normalizePath(route.path);
  if (!currentPath) {
    return false;
  }

  return Array.from(permissionKeys).some((prefix) => {
    const normalizedPrefix = normalizePath(prefix);
    return currentPath === normalizedPrefix || currentPath.startsWith(`${normalizedPrefix}/`);
  });
}

export function findFirstAccessiblePath(menuItems: AuthorizedMenuItem[]): string {
  const first = [...menuItems].sort((left, right) => left.sort - right.sort)[0];
  return first?.route ?? '/access-denied';
}

export function resolvePermissionDisplayCandidates(definition: MenuPermissionDefinition): string[] {
  return [definition.key, ...definition.permissionAliases, ...definition.pathAliases].map(normalizePermissionName);
}

export function matchPermissionDefinition(input: {
  permission?: string | null;
  path?: string | null;
  title?: string | null;
}): MenuPermissionDefinition | undefined {
  const normalizedPermission = normalizePermissionName(input.permission ?? '');
  if (normalizedPermission) {
    return menuPermissionDefinitions.find((definition) => definition.key === normalizedPermission);
  }

  const normalizedPath = normalizePath(input.path ?? '');
  if (normalizedPath) {
    return menuPermissionDefinitions.find((definition) =>
      definition.pathAliases.some((alias) => normalizePath(alias) === normalizedPath),
    );
  }

  const candidates = [input.permission, input.path, input.title]
    .filter((item): item is string => Boolean(item))
    .map(normalizePermissionName);
  if (candidates.length === 0) {
    return undefined;
  }
  return menuPermissionDefinitions.find((definition) => {
    const allowed = resolvePermissionDisplayCandidates(definition);
    return candidates.some((candidate) => allowed.includes(candidate));
  });
}