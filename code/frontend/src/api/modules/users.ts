import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type UserDto = {
  userid: number;
  companyid?: number | null;
  username?: string | null;
  industry?: string | null;
  role?: number | null;
  mobile?: string | null;
  createdate?: string | null;
  gid?: string | null;
  email?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapUserRaw(raw: unknown): UserDto {
  const record = raw as Record<string, unknown>;
  const getValue = (camel: string, pascal: string) => record[camel] ?? record[pascal];
  return {
    userid: Number(getValue('userid', 'Userid')),
    companyid: (() => {
      const value = getValue('companyid', 'Companyid');
      if (value == null || value === '') return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
    })(),
    username: (getValue('username', 'Username') as string | null | undefined) ?? null,
    industry: (getValue('industry', 'Industry') as string | null | undefined) ?? null,
    role: (() => {
      const value = getValue('role', 'Role');
      if (value == null || value === '') return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
    })(),
    mobile: (getValue('mobile', 'Mobile') as string | null | undefined) ?? null,
    createdate: (getValue('createdate', 'Createdate') as string | null | undefined) ?? null,
    gid: (getValue('gid', 'Gid') as string | null | undefined) ?? null,
    email: (getValue('email', 'Email') as string | null | undefined) ?? null,
  };
}

export async function listUsers(): Promise<UserDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/Users');
  return unwrap(res).map(mapUserRaw);
}

export async function getUser(id: number): Promise<UserDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Users/${id}`);
  return mapUserRaw(unwrap(res));
}

export async function createUser(payload: Partial<UserDto>): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateUser(payload: Partial<UserDto> & { userid: number }): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Users', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteUser(id: number): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>(`/api/Users/${id}`, {
    method: 'DELETE',
  });
  return unwrap(res);
}