import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type RoleDto = {
  roleid: number;
  rolename: string;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapRoleRaw(raw: unknown): RoleDto {
  const record = raw as Record<string, unknown>;
  const getValue = (camel: string, pascal: string) => record[camel] ?? record[pascal];
  return {
    roleid: Number(getValue('roleid', 'Roleid')),
    rolename: String(getValue('rolename', 'Rolename') ?? ''),
  };
}

export async function listRoles(): Promise<RoleDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/Roles');
  return unwrap(res).map(mapRoleRaw);
}

export async function createRole(payload: Pick<RoleDto, 'rolename'>): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateRole(payload: RoleDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Roles', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteRole(id: number): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>(`/api/Roles/${id}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}