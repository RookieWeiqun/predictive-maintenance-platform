import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type CompanyDto = {
  companyid: number;
  companyname?: string | null;
  creditCode?: string | null;
};

export type CompanyInfoSuggestion = {
  name: string;
  creditCode: string;
  operName: string;
  status: string;
  dimension: string;
  startDate: string;
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

function normalizeCompanyInfoText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCompanyInfoUrl(companyName: string): string {
  const q = new URLSearchParams();
  q.set('companyName', companyName);
  const rawBase = String(import.meta.env.VITE_COMPANYINFO_API_BASE_URL ?? '').trim();
  const base = rawBase.replace(/\/+$/, '');
  const path = `/Apis/api/tools/companyinfo?${q.toString()}`;
  return base ? `${base}${path}` : `/companyinfo-proxy${path}`;
}

type CompanyInfoApiPayload = {
  Status?: string | number;
  Message?: string;
  Result?: Array<Record<string, unknown>>;
};

function tryParseJsonString(value: string): unknown {
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function normalizeCompanyInfoPayload(raw: unknown): CompanyInfoApiPayload {
  if (typeof raw === 'string') {
    const parsed = tryParseJsonString(raw);
    if (parsed !== raw) {
      return normalizeCompanyInfoPayload(parsed);
    }
    throw new ApiError('客户名称查询返回了无法解析的字符串结果');
  }

  if (!raw || typeof raw !== 'object') {
    throw new ApiError('客户名称查询返回格式不正确');
  }

  return raw as CompanyInfoApiPayload;
}

export async function searchCompanyInfo(companyName: string): Promise<CompanyInfoSuggestion[]> {
  const keyword = companyName.trim();
  if (keyword.length < 2) return [];

  const response = await fetch(buildCompanyInfoUrl(keyword), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`);
  }

  const responseText = await response.text();
  const raw = normalizeCompanyInfoPayload(tryParseJsonString(responseText));

  if (String(raw.Status ?? '') !== '200') {
    throw new ApiError(raw.Message || '客户名称查询失败');
  }

  const deduped = new Map<string, CompanyInfoSuggestion>();
  for (const item of raw.Result ?? []) {
    const name = normalizeCompanyInfoText(item.Name);
    if (!name) continue;
    const creditCode = normalizeCompanyInfoText(item.CreditCode);
    const key = `${name}__${creditCode}`;
    if (deduped.has(key)) continue;
    deduped.set(key, {
      name,
      creditCode,
      operName: normalizeCompanyInfoText(item.OperName),
      status: normalizeCompanyInfoText(item.Status),
      dimension: normalizeCompanyInfoText(item.Dimension),
      startDate: normalizeCompanyInfoText(item.StartDate),
    });
    if (deduped.size >= 20) break;
  }

  return [...deduped.values()];
}
