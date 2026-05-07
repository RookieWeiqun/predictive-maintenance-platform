import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type ProductDto = {
  productid?: number;
  equipid?: number | null;
  mlfb?: string | null;
  serialno?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function gv(r: Record<string, unknown>, a: string, b: string) {
  return r[a] ?? r[b];
}

function mapProductRaw(raw: unknown): ProductDto {
  const r = raw as Record<string, unknown>;
  return {
    productid: (() => {
      const v = gv(r, 'productid', 'Productid');
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    })(),
    equipid: (() => {
      const v = gv(r, 'equipid', 'Equipid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    mlfb: (gv(r, 'mlfb', 'Mlfb') as string | null | undefined) ?? null,
    serialno: (gv(r, 'serialno', 'Serialno') as string | null | undefined) ?? null,
  };
}

/** GET /api/Products/Search?productid=&equipmentid=&mlfb=&serialno= */
export async function searchProducts(params: {
  productid?: number;
  equipmentid?: number;
  mlfb?: string;
  serialno?: string;
}): Promise<ProductDto[]> {
  const q = new URLSearchParams();
  if (params.productid != null) q.set('productid', String(params.productid));
  if (params.equipmentid != null) q.set('equipmentid', String(params.equipmentid));
  if (params.mlfb) q.set('mlfb', params.mlfb);
  if (params.serialno) q.set('serialno', params.serialno);
  const qs = q.toString();
  const path = qs ? `/api/Products/Search?${qs}` : '/api/Products/Search';
  const res = await requestJson<ApiEnvelope<unknown[]>>(path);
  return unwrap(res).map(mapProductRaw);
}

export async function getProduct(id: number): Promise<ProductDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Products/${id}`);
  return mapProductRaw(unwrap(res));
}

/** POST /api/Products，返回新 productid */
export async function createProduct(payload: {
  productid?: number;
  equipid?: number | null;
  mlfb?: string | null;
  serialno?: string | null;
}): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Products', {
    method: 'POST',
    body: JSON.stringify({
      productid: payload.productid ?? 0,
      equipid: payload.equipid ?? null,
      mlfb: payload.mlfb ?? null,
      serialno: payload.serialno ?? null,
    }),
  });
  return unwrap(res);
}
