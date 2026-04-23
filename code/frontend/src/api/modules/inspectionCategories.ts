import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type InspectionCategoryDto = {
  categoryid: number;
  templateid: number;
  parentId: number;
  name: string;
  sortOrder: number;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapCategoryRaw(raw: unknown): InspectionCategoryDto {
  const r = raw as Record<string, unknown>;
  const gv = (a: string, b: string) => r[a] ?? r[b];
  return {
    categoryid: Number(gv('categoryid', 'Categoryid')),
    templateid: Number(gv('templateid', 'Templateid')),
    parentId: Number(gv('parentId', 'ParentId')),
    name: String(gv('name', 'Name') ?? ''),
    sortOrder: Number(gv('sortOrder', 'SortOrder') ?? 1),
  };
}

export async function listInspectionCategories(): Promise<InspectionCategoryDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/InspectionCategories');
  return unwrap(res).map(mapCategoryRaw);
}

export async function createInspectionCategory(
  payload: Omit<InspectionCategoryDto, 'categoryid'>,
): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionCategories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteInspectionCategory(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionCategories/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
