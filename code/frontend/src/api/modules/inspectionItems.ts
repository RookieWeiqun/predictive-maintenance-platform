import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type InspectionItemDto = {
  itemid: number;
  templateid: number;
  categoryid?: number | null;
  name?: string | null;
  valueType?: string | null;
  ruleType?: string | null;
  threshold?: string | null;
  sortOrder: number;
  priority?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function mapItemRaw(raw: unknown): InspectionItemDto {
  const r = raw as Record<string, unknown>;
  const gv = (a: string, b: string) => r[a] ?? r[b];
  return {
    itemid: Number(gv('itemid', 'Itemid')),
    templateid: Number(gv('templateid', 'Templateid')),
    categoryid: (gv('categoryid', 'Categoryid') as number | null | undefined) ?? null,
    name: (gv('name', 'Name') as string | null | undefined) ?? null,
    valueType: (gv('valueType', 'ValueType') as string | null | undefined) ?? null,
    ruleType: (gv('ruleType', 'RuleType') as string | null | undefined) ?? null,
    threshold: (gv('threshold', 'Threshold') as string | null | undefined) ?? null,
    sortOrder: Number(gv('sortOrder', 'SortOrder') ?? 1),
    priority: (gv('priority', 'Priority') as string | null | undefined) ?? null,
  };
}

export async function listInspectionItems(): Promise<InspectionItemDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/InspectionItems');
  return unwrap(res).map(mapItemRaw);
}

export async function createInspectionItem(
  payload: Omit<InspectionItemDto, 'itemid'>,
): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionItems', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteInspectionItem(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionItems/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
