import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';
import { listByProject as listProjectEquipmentLinksByProject } from './projectEquipments';

export type EquipmentDto = {
  equipid?: number;
  companyid: number;
  factory?: string | null;
  workshop?: string | null;
  electricroom?: string | null;
  equipmentname?: string | null;
  productcategory?: string | null;
  productgroup?: string | null;
  number?: number | null;
};

/** 项目详情等设备清单：含巡检产品上的序列号聚合 */
export type EquipmentProjectDto = EquipmentDto & { serialNumbers: string[] };

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function gv(r: Record<string, unknown>, a: string, b: string) {
  return r[a] ?? r[b];
}

function mapEquipmentRow(raw: unknown): EquipmentDto {
  const r = raw as Record<string, unknown>;
  return {
    equipid: Number(gv(r, 'equipid', 'Equipid')),
    companyid: Number(gv(r, 'companyid', 'Companyid')),
    factory: (gv(r, 'factory', 'Factory') as string | null | undefined) ?? null,
    workshop: (gv(r, 'workshop', 'Workshop') as string | null | undefined) ?? null,
    electricroom: (gv(r, 'electricroom', 'Electricroom') as string | null | undefined) ?? null,
    equipmentname: (gv(r, 'equipmentname', 'Equipmentname') as string | null | undefined) ?? null,
    productcategory: (gv(r, 'productcategory', 'Productcategory') as string | null | undefined) ?? null,
    productgroup: (gv(r, 'productgroup', 'Productgroup') as string | null | undefined) ?? null,
    number: (() => {
      const v = gv(r, 'number', 'Number');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
  };
}

function mapEquipmentProjectRow(raw: unknown): EquipmentProjectDto {
  const base = mapEquipmentRow(raw);
  const r = raw as Record<string, unknown>;
  const sn = r.serialNumbers ?? r.SerialNumbers;
  const serialNumbers = Array.isArray(sn) ? sn.map((x) => String(x)) : [];
  return { ...base, serialNumbers };
}

async function getEquipmentProjectDetail(id: number): Promise<EquipmentProjectDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Equipments/${id}`);
  return mapEquipmentProjectRow(unwrap(res));
}

export async function getEquipment(id: number): Promise<EquipmentDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Equipments/${id}`);
  return mapEquipmentRow(unwrap(res));
}

/**
 * 项目设备清单：先查 `ProjectEquipments/ByProject`，再按 equipmentid 拉取设备详情。
 * （与 Swagger [premaintainProjects](http://36.110.89.30:8765/swagger/index.html) 一致）
 */
export async function listEquipmentsByProject(projectid: number): Promise<EquipmentProjectDto[]> {
  const links = await listProjectEquipmentLinksByProject(projectid);
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const link of links) {
    const id = link.equipmentid;
    if (id == null || id <= 0 || Number.isNaN(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0) return [];
  return Promise.all(ids.map((id) => getEquipmentProjectDetail(id)));
}

export async function listEquipments(): Promise<EquipmentDto[]> {
  const res = await requestJson<ApiEnvelope<EquipmentDto[]>>('/api/Equipments');
  return unwrap(res);
}

export async function listEquipmentsByCompany(companyid: number): Promise<EquipmentDto[]> {
  const res = await requestJson<ApiEnvelope<EquipmentDto[]>>(
    `/api/Equipments/ByCompany/${companyid}`,
  );
  return unwrap(res);
}

export async function createEquipment(payload: EquipmentDto): Promise<EquipmentDto> {
  const res = await requestJson<ApiEnvelope<EquipmentDto>>('/api/Equipments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateEquipment(payload: EquipmentDto): Promise<EquipmentDto> {
  const res = await requestJson<ApiEnvelope<EquipmentDto>>('/api/Equipments', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteEquipment(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Equipments/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
