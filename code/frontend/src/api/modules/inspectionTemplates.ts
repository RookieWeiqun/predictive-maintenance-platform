import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type InspectionTemplateDto = {
  templateid: number;
  name?: string | null;
  productcategory?: string | null;
  description?: string | null;
  inspectiontype: number;
  mlfb?: string | null;
  createdate?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

/** 兼容 camelCase / PascalCase */
function mapTemplateRaw(raw: unknown): InspectionTemplateDto {
  const r = raw as Record<string, unknown>;
  const gv = (a: string, b: string) => r[a] ?? r[b];
  return {
    templateid: Number(gv('templateid', 'Templateid')),
    name: (gv('name', 'Name') as string | null | undefined) ?? null,
    productcategory: (gv('productcategory', 'Productcategory') as string | null | undefined) ?? null,
    description: (gv('description', 'Description') as string | null | undefined) ?? null,
    inspectiontype: Number(gv('inspectiontype', 'Inspectiontype')),
    mlfb: (gv('mlfb', 'Mlfb') as string | null | undefined) ?? null,
    createdate: (gv('createdate', 'Createdate') as string | null | undefined) ?? null,
  };
}

export async function listInspectionTemplates(): Promise<InspectionTemplateDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/InspectionTemplates');
  const list = unwrap(res);
  return list.map(mapTemplateRaw);
}

export async function getInspectionTemplate(id: number): Promise<InspectionTemplateDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTemplates/${id}`);
  return mapTemplateRaw(unwrap(res));
}

export async function createInspectionTemplate(
  payload: InspectionTemplateDto,
): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionTemplates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateInspectionTemplate(
  payload: InspectionTemplateDto,
): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionTemplates', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteInspectionTemplate(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTemplates/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}

export async function searchInspectionTemplates(params: {
  inspectiontype?: number;
  productcategory?: string;
  mlfb?: string;
}): Promise<InspectionTemplateDto[]> {
  const q = new URLSearchParams();
  if (params.inspectiontype != null) q.set('inspectiontype', String(params.inspectiontype));
  if (params.productcategory) q.set('productcategory', params.productcategory);
  if (params.mlfb) q.set('mlfb', params.mlfb);
  const qs = q.toString();
  const path = qs ? `/api/InspectionTemplates/Search?${qs}` : '/api/InspectionTemplates/Search';
  const res = await requestJson<ApiEnvelope<unknown[]>>(path);
  return unwrap(res).map(mapTemplateRaw);
}
