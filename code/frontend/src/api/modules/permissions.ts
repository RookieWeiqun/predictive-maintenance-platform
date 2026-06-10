import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type PermissionDto = {
  permissionid: number;
  permission1: string;
  path?: string | null;
  type?: number | null;
  label?: string | null;
  title?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapPermissionRaw(raw: unknown): PermissionDto {
  const record = raw as Record<string, unknown>;
  const getValue = (camel: string, pascal: string) => record[camel] ?? record[pascal];
  return {
    permissionid: Number(getValue('permissionid', 'Permissionid')),
    permission1: String(getValue('permission1', 'Permission1') ?? ''),
    path: (getValue('path', 'Path') as string | null | undefined) ?? null,
    type: (() => {
      const value = getValue('type', 'Type');
      if (value == null || value === '') return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
    })(),
    label: (getValue('label', 'Label') as string | null | undefined)
      ?? (getValue('displayName', 'DisplayName') as string | null | undefined)
      ?? (getValue('title', 'Title') as string | null | undefined)
      ?? (getValue('name', 'Name') as string | null | undefined)
      ?? null,
    title: (getValue('title', 'Title') as string | null | undefined)
      ?? (getValue('label', 'Label') as string | null | undefined)
      ?? (getValue('name', 'Name') as string | null | undefined)
      ?? null,
  };
}

export async function listPermissions(): Promise<PermissionDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/Permissions');
  return unwrap(res).map(mapPermissionRaw);
}

export async function createPermission(payload: Pick<PermissionDto, 'permission1'>): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Permissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}