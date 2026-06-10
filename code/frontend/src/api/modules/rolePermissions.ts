import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type RolePermissionDto = {
  rpid: number;
  roleid: number;
  permissionid: number;
  cando: boolean;
};

export type RolePermissionWithNamesDto = {
  rpid: number;
  roleid: number;
  roleName: string;
  permissionid: number;
  permissionName: string;
  path: string | null;
  type: number | null;
  icon: string | null;
  sort: number | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapRolePermissionRaw(raw: unknown): RolePermissionDto {
  const record = raw as Record<string, unknown>;
  const getValue = (camel: string, pascal: string) => record[camel] ?? record[pascal];
  return {
    rpid: Number(getValue('rpid', 'Rpid')),
    roleid: Number(getValue('roleid', 'Roleid')),
    permissionid: Number(getValue('permissionid', 'Permissionid')),
    cando: Boolean(getValue('cando', 'Cando')),
  };
}

function mapRolePermissionWithNamesRaw(raw: unknown): RolePermissionWithNamesDto {
  const record = raw as Record<string, unknown>;
  const getValue = (camel: string, pascal: string) => record[camel] ?? record[pascal];
  const parseNullableNumber = (camel: string, pascal: string) => {
    const value = getValue(camel, pascal);
    if (value == null || value === '') {
      return null;
    }
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
  };

  return {
    rpid: Number(getValue('rpid', 'Rpid')),
    roleid: Number(getValue('roleid', 'Roleid')),
    roleName: String(getValue('roleName', 'RoleName') ?? ''),
    permissionid: Number(getValue('permissionid', 'Permissionid')),
    permissionName: String(getValue('permissionName', 'PermissionName') ?? ''),
    path: (getValue('path', 'Path') as string | null | undefined) ?? null,
    type: parseNullableNumber('type', 'Type'),
    icon: (getValue('icon', 'Icon') as string | null | undefined) ?? null,
    sort: parseNullableNumber('sort', 'Sort'),
  };
}

export async function listRolePermissions(): Promise<RolePermissionDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/RolePermissions');
  return unwrap(res).map(mapRolePermissionRaw);
}

export async function listRolePermissionsByRoleWithNames(roleId: number): Promise<RolePermissionWithNamesDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>(`/api/RolePermissions/ByRoleWithNames/${roleId}`);
  return unwrap(res).map(mapRolePermissionWithNamesRaw);
}

export async function createRolePermission(payload: Omit<RolePermissionDto, 'rpid'>): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/RolePermissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateRolePermission(payload: RolePermissionDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/RolePermissions', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteRolePermission(id: number): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>(`/api/RolePermissions/${id}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}