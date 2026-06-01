import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type ReportDto = {
  reportid?: number;
  path?: string | null;
  projectid: number;
  createdate?: string | null;
  ifdel?: boolean;
  summarydescription?: string | null;
  sparepartsrecommendation?: string | null;
};

type GenerateReportResponse = {
  filePath?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function gv(record: Record<string, unknown>, a: string, b: string): unknown {
  return record[a] ?? record[b];
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
}

function mapReportRaw(raw: unknown): ReportDto {
  const record = raw as Record<string, unknown>;
  return {
    reportid: Number(gv(record, 'reportid', 'Reportid')),
    path: (gv(record, 'path', 'Path') as string | null | undefined) ?? null,
    projectid: Number(gv(record, 'projectid', 'Projectid')),
    createdate: (gv(record, 'createdate', 'Createdate') as string | null | undefined) ?? null,
    ifdel: toBoolean(gv(record, 'ifdel', 'Ifdel')),
    summarydescription: (gv(record, 'summarydescription', 'Summarydescription') as string | null | undefined) ?? null,
    sparepartsrecommendation: (gv(record, 'sparepartsrecommendation', 'Sparepartsrecommendation') as string | null | undefined) ?? null,
  };
}

function buildPayload(payload: ReportDto): ReportDto {
  return {
    reportid: payload.reportid ?? 0,
    path: payload.path ?? '',
    projectid: payload.projectid,
    createdate: payload.createdate ?? null,
    ifdel: payload.ifdel ?? false,
    summarydescription: payload.summarydescription ?? '',
    sparepartsrecommendation: payload.sparepartsrecommendation ?? '',
  };
}

export async function getReport(id: number): Promise<ReportDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Reports/${id}`);
  return mapReportRaw(unwrap(res));
}

export async function listReportsByProject(projectid: number): Promise<ReportDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>(`/api/Reports/ByProject/${projectid}`);
  return unwrap(res).map(mapReportRaw);
}

export async function getReportByProject(projectid: number): Promise<ReportDto | null> {
  const list = await listReportsByProject(projectid);
  return list[0] ?? null;
}

export async function createReport(payload: ReportDto, init?: RequestInit): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Reports', {
    ...init,
    method: 'POST',
    body: JSON.stringify(buildPayload(payload)),
  });
  return unwrap(res);
}

export async function updateReport(payload: ReportDto, init?: RequestInit): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Reports', {
    ...init,
    method: 'PUT',
    body: JSON.stringify(buildPayload(payload)),
  });
  return unwrap(res);
}

export async function generateProjectReport(projectid: number): Promise<string> {
  const res = await requestJson<ApiEnvelope<GenerateReportResponse>>(`/api/Reports/Generate/${projectid}`);
  const data = unwrap(res);
  const filePath = String(data?.filePath ?? '').trim();
  if (!filePath) {
    throw new ApiError('报告导出成功，但后端未返回文件路径');
  }
  return filePath;
}

export function resolveReportDownloadUrl(filePath: string): string {
  const normalized = String(filePath ?? '').trim().replace(/\\/g, '/');
  if (!normalized) {
    throw new ApiError('报告下载路径为空');
  }
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const publicPath = normalized.startsWith('/app/Reports/')
    ? normalized.replace(/^\/app/, '')
    : normalized.startsWith('/Reports/')
      ? normalized
      : null;

  if (!publicPath) {
    throw new ApiError(`不支持的报告下载路径：${normalized}`);
  }

  const rawBase = String(import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!rawBase) return publicPath;
  return `${rawBase}${publicPath}`;
}