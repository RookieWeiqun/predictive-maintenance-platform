import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type CompanyDto = {
  companyid: number;
  companyname?: string | null;
  creditCode?: string | null;
};

type UpsertCompanyInput = {
  companyid?: number;
  companyname: string;
  creditCode?: string;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

export async function listCompanies(): Promise<CompanyDto[]> {
  const res = await requestJson<ApiEnvelope<CompanyDto[]>>('/api/Companies');
  return unwrap(res);
}

export async function getCompany(id: number): Promise<CompanyDto> {
  const res = await requestJson<ApiEnvelope<CompanyDto>>(`/api/Companies/${id}`);
  return unwrap(res);
}

export async function createCompany(payload: UpsertCompanyInput): Promise<CompanyDto> {
  const res = await requestJson<ApiEnvelope<CompanyDto>>('/api/Companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateCompany(payload: UpsertCompanyInput): Promise<CompanyDto> {
  const res = await requestJson<ApiEnvelope<CompanyDto>>('/api/Companies', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteCompany(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Companies/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
