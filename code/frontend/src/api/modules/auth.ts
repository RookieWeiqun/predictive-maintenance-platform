import { ApiError, requestJson } from '../http';
import type { ApiEnvelope } from '../types';

export type OneIdExchangeResult = {
  accessToken?: string | null;
  idToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  username?: string | null;
  gid?: string | null;
  roleid?: number | null;
  rolename?: string | null;
  raw: Record<string, unknown>;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }
  return undefined;
}

function mapExchangeRaw(raw: unknown): OneIdExchangeResult {
  const record = (raw ?? {}) as Record<string, unknown>;
  const user = (pick(record, 'user', 'User', 'profile', 'Profile') ?? {}) as Record<string, unknown>;
  const merged = { ...record, ...user };
  const toNumber = (value: unknown): number | null => {
    if (value == null || value === '') return null;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  };

  return {
    accessToken: (pick(merged, 'accessToken', 'AccessToken', 'token', 'Token') as string | undefined) ?? null,
    idToken: (pick(merged, 'idToken', 'IdToken') as string | undefined) ?? null,
    refreshToken: (pick(merged, 'refreshToken', 'RefreshToken') as string | undefined) ?? null,
    expiresIn: toNumber(pick(merged, 'expiresIn', 'ExpiresIn', 'expires_in')),
    username: (pick(merged, 'username', 'Username', 'name', 'Name', 'displayName', 'DisplayName') as string | undefined) ?? null,
    gid: (pick(merged, 'gid', 'Gid', 'sub', 'Sub') as string | undefined) ?? null,
    roleid: toNumber(pick(merged, 'roleid', 'Roleid', 'role', 'Role')),
    rolename: (pick(merged, 'rolename', 'Rolename', 'roleName', 'RoleName') as string | undefined) ?? null,
    raw: merged,
  };
}

function buildApiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const rawBase = import.meta.env.VITE_ONEID_API_BASE_URL?.trim() || import.meta.env.VITE_API_BASE_URL?.trim() || '';
  const base = rawBase.replace(/\/+$/, '');
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export async function exchangeOneIdCode(code: string): Promise<OneIdExchangeResult> {
  const path = buildApiPath(`/api/Auth/ReadOneIdCode?code=${encodeURIComponent(code)}`);
  const response = await requestJson<ApiEnvelope<unknown> | unknown>(path, {
    method: 'GET',
  });

  if (typeof response === 'object' && response !== null && 'code' in response) {
    return mapExchangeRaw(unwrap(response as ApiEnvelope<unknown>));
  }

  return mapExchangeRaw(response);
}