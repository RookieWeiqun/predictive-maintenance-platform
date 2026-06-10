import { reactive } from 'vue';
import { authApi, permissionsApi, rolePermissionsApi, rolesApi, usersApi } from '@/api';
import type { PermissionDto } from '@/api/modules/permissions';
import type { RolePermissionDto, RolePermissionWithNamesDto } from '@/api/modules/rolePermissions';
import type { RoleDto } from '@/api/modules/roles';
import type { UserDto } from '@/api/modules/users';
import { buildOneIdAuthorizeUrl, getOneIdAuthorizationEndpoint, getOneIdClientId } from '@/config/oneid';
import {
  buildAuthorizedMenuItem,
  buildFallbackAuthorizedMenuItems,
  buildPermissionToken,
  findFirstAccessiblePath,
  matchPermissionDefinition,
  resolveAccessiblePathSet,
  resolveDefaultPermissionsByRoleName,
  resolveProfileLabel,
  resolveProfilePermissions,
  type AuthorizedMenuItem,
  type AppRoleProfile,
  type MenuPermissionDefinition,
  menuPermissionDefinitions,
} from './access';

type AuthSession = {
  mode: 'debug' | 'oneid';
  displayName: string;
  gid?: string | null;
  accessToken?: string | null;
  backendUserId?: number | null;
  backendRoleId?: number | null;
  backendRoleName?: string | null;
  permissionKeys: string[];
  accessibleMenus: AuthorizedMenuItem[];
  buttonPermissionTokens: string[];
  roleOverride: AppRoleProfile | null;
};

type AuthorizationCache = {
  roles: RoleDto[];
  permissions: PermissionDto[];
  rolePermissions: RolePermissionDto[];
};

const STORAGE_KEY = 'pm-platform-auth-session';
const PENDING_REDIRECT_KEY = 'pm-platform-pending-redirect';

const authorizationCache: AuthorizationCache = {
  roles: [],
  permissions: [],
  rolePermissions: [],
};

let initPromise: Promise<void> | null = null;

export const authState = reactive({
  initialized: false,
  loading: false,
  session: null as AuthSession | null,
  accessibleMenuItems: [] as AuthorizedMenuItem[],
  accessiblePathSet: new Set<string>(),
  buttonPermissionSet: new Set<string>(),
  displayName: '',
  roleDisplayLabel: '',
});

function persistSession() {
  if (!authState.session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authState.session));
}

function hydrateFromStorage() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    authState.session = JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    authState.session = null;
  }
}

function updateDerivedState() {
  const session = authState.session;
  if (!session) {
    authState.accessibleMenuItems = [];
    authState.accessiblePathSet = new Set<string>();
    authState.buttonPermissionSet = new Set<string>();
    authState.displayName = '';
    authState.roleDisplayLabel = '';
    return;
  }

  const permissionKeys = session.roleOverride
    ? resolveProfilePermissions(session.roleOverride)
    : session.permissionKeys;

  const accessibleMenus = session.roleOverride
    ? buildFallbackAuthorizedMenuItems(permissionKeys)
    : session.accessibleMenus;

  const buttonPermissionTokens = session.roleOverride
    ? resolveDebugButtonPermissionTokens(session.roleOverride)
    : session.buttonPermissionTokens;

  authState.accessibleMenuItems = accessibleMenus;
  authState.accessiblePathSet = resolveAccessiblePathSet(accessibleMenus);
  authState.buttonPermissionSet = new Set(buttonPermissionTokens);
  authState.displayName = session.displayName;
  authState.roleDisplayLabel = session.roleOverride
    ? `${resolveProfileLabel(session.roleOverride)}（调试）`
    : session.backendRoleName || '未分配角色';
}

function savePendingRedirect(path: string) {
  window.sessionStorage.setItem(PENDING_REDIRECT_KEY, path);
}

export function consumePendingRedirect(): string | null {
  const value = window.sessionStorage.getItem(PENDING_REDIRECT_KEY);
  if (value) {
    window.sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  }
  return value;
}

export function setPendingRedirect(path: string) {
  savePendingRedirect(path);
}

function findBackendUser(exchange: authApi.OneIdExchangeResult, users: UserDto[]): UserDto | undefined {
  if (exchange.gid) {
    const byGid = users.find((item) => (item.gid ?? '').trim() === exchange.gid);
    if (byGid) {
      return byGid;
    }
  }

  if (exchange.username) {
    const normalized = exchange.username.trim().toLowerCase();
    return users.find((item) => (item.username ?? '').trim().toLowerCase() === normalized);
  }

  return undefined;
}

function resolveAllKnownButtonPermissionTokens() {
  return Array.from(new Set(
    authorizationCache.permissions
      .filter((item) => item.type === 2)
      .map((item) => buildPermissionToken({
        permission: item.permission1,
        path: item.path,
      }))
      .filter((item) => Boolean(item)),
  ));
}

function findPermissionById(permissionId: number) {
  return authorizationCache.permissions.find((item) => item.permissionid === permissionId);
}

function resolveDebugButtonPermissionTokens(profile: AppRoleProfile) {
  if (profile !== 'administrator') {
    return [];
  }
  return resolveAllKnownButtonPermissionTokens();
}

function resolvePermissionKeysForRole(roleId: number | null | undefined, roleName?: string | null): string[] {
  const permissionMap = new Map<number, string>();
  for (const permission of authorizationCache.permissions) {
    const match = matchPermissionDefinition({
      permission: permission.permission1,
      path: permission.path,
      title: permission.title,
    });
    if (match) {
      permissionMap.set(permission.permissionid, match.key);
    }
  }

  const assigned = authorizationCache.rolePermissions
    .filter((item) => item.roleid === roleId && item.cando)
    .map((item) => permissionMap.get(item.permissionid))
    .filter((item): item is string => Boolean(item));

  if (assigned.length > 0) {
    return Array.from(new Set(assigned));
  }

  return resolveDefaultPermissionsByRoleName(roleName);
}

function resolvePermissionKeysFromNamedRolePermissions(
  rolePermissionsWithNames: RolePermissionWithNamesDto[],
  roleName?: string | null,
): string[] {
  const matched = rolePermissionsWithNames
    .map((item) => matchPermissionDefinition({
      permission: findPermissionById(item.permissionid)?.permission1,
      path: item.path,
      title: item.permissionName,
    }))
    .filter((item): item is MenuPermissionDefinition => Boolean(item))
    .map((item) => item.key);

  if (matched.length > 0) {
    return Array.from(new Set(matched));
  }

  return resolveDefaultPermissionsByRoleName(roleName);
}

function resolveAccessibleMenusFromNamedRolePermissions(
  rolePermissionsWithNames: RolePermissionWithNamesDto[],
  roleId: number | null | undefined,
  roleName?: string | null,
) {
  const matchedMenus = rolePermissionsWithNames
    .filter((item) => item.type === 1)
    .map((item) => buildAuthorizedMenuItem({
      permissionid: item.permissionid,
      permission: findPermissionById(item.permissionid)?.permission1,
      path: item.path,
      icon: item.icon,
      sort: item.sort,
      type: item.type,
    }))
    .filter((item): item is AuthorizedMenuItem => Boolean(item))
    .sort((left, right) => left.sort - right.sort);

  if (matchedMenus.length > 0) {
    const deduped = new Map<string, AuthorizedMenuItem>();
    for (const item of matchedMenus) {
      if (!deduped.has(item.route)) {
        deduped.set(item.route, item);
      }
    }
    return Array.from(deduped.values());
  }

  return buildFallbackAuthorizedMenuItems(resolvePermissionKeysForRole(roleId, roleName));
}

function resolveButtonPermissionTokensFromNamedRolePermissions(
  rolePermissionsWithNames: RolePermissionWithNamesDto[],
) {
  const tokens = rolePermissionsWithNames
    .filter((item) => item.type === 2)
    .map((item) => buildPermissionToken({
      permission: findPermissionById(item.permissionid)?.permission1,
      path: item.path,
    }))
    .filter((item) => Boolean(item));

  if (tokens.length > 0) {
    return Array.from(new Set(tokens));
  }

  return [];
}

type ResolvedRoleAuthorization = {
  permissionKeys: string[];
  accessibleMenus: AuthorizedMenuItem[];
  buttonPermissionTokens: string[];
};

async function resolveAuthorizationForRoleAsync(
  roleId: number | null | undefined,
  roleName?: string | null,
): Promise<ResolvedRoleAuthorization> {
  if (roleId != null) {
    try {
      const rolePermissionsWithNames = await rolePermissionsApi.listRolePermissionsByRoleWithNames(roleId);
      return {
        permissionKeys: resolvePermissionKeysFromNamedRolePermissions(rolePermissionsWithNames, roleName),
        accessibleMenus: resolveAccessibleMenusFromNamedRolePermissions(rolePermissionsWithNames, roleId, roleName),
        buttonPermissionTokens: resolveButtonPermissionTokensFromNamedRolePermissions(rolePermissionsWithNames),
      };
    } catch {
      // Fall back to legacy permissions + rolePermissions combination.
    }
  }

  const fallbackPermissionKeys = resolvePermissionKeysForRole(roleId, roleName);
  return {
    permissionKeys: fallbackPermissionKeys,
    accessibleMenus: buildFallbackAuthorizedMenuItems(fallbackPermissionKeys),
    buttonPermissionTokens: [],
  };
}

export function getRolePermissionDefinitions(): MenuPermissionDefinition[] {
  return menuPermissionDefinitions;
}

export async function loadAuthorizationCache(force = false) {
  if (!force && authorizationCache.roles.length > 0 && authorizationCache.permissions.length > 0) {
    return authorizationCache;
  }

  const [roles, permissions, rolePermissions] = await Promise.all([
    rolesApi.listRoles().catch(() => []),
    permissionsApi.listPermissions().catch(() => []),
    rolePermissionsApi.listRolePermissions().catch(() => []),
  ]);

  authorizationCache.roles = roles;
  authorizationCache.permissions = permissions;
  authorizationCache.rolePermissions = rolePermissions;

  return authorizationCache;
}

export async function initializeAuth() {
  if (authState.initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      hydrateFromStorage();
      if (authState.session && authState.session.mode === 'oneid') {
        await loadAuthorizationCache().catch(() => undefined);
        const authorization = await resolveAuthorizationForRoleAsync(
          authState.session.backendRoleId,
          authState.session.backendRoleName,
        );
        authState.session.permissionKeys = authorization.permissionKeys;
        authState.session.accessibleMenus = authorization.accessibleMenus;
        authState.session.buttonPermissionTokens = authorization.buttonPermissionTokens;
        persistSession();
      }
      updateDerivedState();
      authState.initialized = true;
    })().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

export async function loginWithDebug(profile: AppRoleProfile) {
  authState.session = {
    mode: 'debug',
    displayName: profile === 'administrator' ? '本地管理员' : '本地工程师',
    backendUserId: null,
    backendRoleId: null,
    backendRoleName: resolveProfileLabel(profile),
    permissionKeys: resolveProfilePermissions(profile),
    accessibleMenus: buildFallbackAuthorizedMenuItems(resolveProfilePermissions(profile)),
    buttonPermissionTokens: resolveDebugButtonPermissionTokens(profile),
    roleOverride: profile,
  };
  persistSession();
  updateDerivedState();
}

export async function completeOneIdLogin(code: string) {
  authState.loading = true;
  try {
    const exchange = await authApi.exchangeOneIdCode(code);
    const [users, cache] = await Promise.all([
      usersApi.listUsers().catch(() => []),
      loadAuthorizationCache(true),
    ]);
    const backendUser = findBackendUser(exchange, users);
    const backendRoleId = backendUser?.role ?? exchange.roleid ?? null;
    const backendRoleName = cache.roles.find((item) => item.roleid === backendRoleId)?.rolename
      ?? backendUser?.role?.toString()
      ?? exchange.rolename
      ?? null;
    const authorization = await resolveAuthorizationForRoleAsync(backendRoleId, backendRoleName);

    authState.session = {
      mode: 'oneid',
      displayName: exchange.username || backendUser?.username || 'OneID 用户',
      gid: exchange.gid || backendUser?.gid || null,
      accessToken: exchange.accessToken,
      backendUserId: backendUser?.userid ?? null,
      backendRoleId,
      backendRoleName,
      permissionKeys: authorization.permissionKeys,
      accessibleMenus: authorization.accessibleMenus,
      buttonPermissionTokens: authorization.buttonPermissionTokens,
      roleOverride: null,
    };
    persistSession();
    updateDerivedState();
  } finally {
    authState.loading = false;
  }
}

export function setRoleOverride(profile: AppRoleProfile) {
  if (!authState.session) {
    return;
  }
  authState.session.roleOverride = profile;
  persistSession();
  updateDerivedState();
}

export function clearRoleOverride() {
  if (!authState.session) {
    return;
  }
  authState.session.roleOverride = null;
  persistSession();
  updateDerivedState();
}

export async function logout() {
  authState.session = null;
  persistSession();
  updateDerivedState();
}

export function hasButtonPermission(permissionOrPath: string) {
  const isPath = permissionOrPath.trim().startsWith('/');
  const token = buildPermissionToken(
    isPath ? { path: permissionOrPath } : { permission: permissionOrPath },
  );
  return authState.buttonPermissionSet.has(token);
}

export function hasAnyButtonPermission(permissionOrPaths: string[]) {
  return permissionOrPaths.some((item) => hasButtonPermission(item));
}

export function isLocalDebugLoginEnabled(): boolean {
  return import.meta.env.DEV;
}

export function canStartOneIdLogin(): boolean {
  const clientId = getOneIdClientId().trim();
  if (!clientId) {
    return false;
  }
  const endpoint = getOneIdAuthorizationEndpoint();
  return !endpoint.includes('.well-known/openid-configuration');
}

export function beginOneIdLogin(redirectPath: string) {
  const normalizedRedirect = redirectPath.trim() || '/project/list';
  setPendingRedirect(normalizedRedirect);
  const state = window.btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify({ redirect: normalizedRedirect, timestamp: Date.now() }),
      ),
    ),
  );
  window.location.replace(buildOneIdAuthorizeUrl(state));
}

export function resolvePostLoginPath() {
  const pending = consumePendingRedirect();
  if (pending) {
    return pending;
  }
  return findFirstAccessiblePath(authState.accessibleMenuItems);
}