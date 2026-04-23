import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

/** 与 Swagger `ProjectEquipment` 一致：项目—设备关联行 */
export type ProjectEquipmentDto = {
  peid?: number;
  projectid: number;
  equipmentid: number;
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

function mapProjectEquipmentRaw(raw: unknown): ProjectEquipmentDto {
  const r = raw as Record<string, unknown>;
  const equipRaw = gv(r, 'equipmentid', 'Equipmentid');
  const equipid = Number(equipRaw);
  return {
    peid: (() => {
      const v = gv(r, 'peid', 'Peid');
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    })(),
    projectid: Number(gv(r, 'projectid', 'Projectid')),
    equipmentid: Number.isNaN(equipid) ? 0 : equipid,
  };
}

/**
 * 按项目查询关联设备 id 列表（中间表）。
 * Swagger: GET /api/ProjectEquipments/ByProject/{projectid}
 */
export async function listByProject(projectid: number): Promise<ProjectEquipmentDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>(
    `/api/ProjectEquipments/ByProject/${projectid}`,
  );
  return unwrap(res).map(mapProjectEquipmentRaw);
}

/** Swagger: POST /api/ProjectEquipments，请求体为 `ProjectEquipment` */
export async function createProjectEquipment(payload: {
  projectid: number;
  equipmentid: number;
  peid?: number;
}): Promise<unknown> {
  const body: Record<string, number> = {
    projectid: payload.projectid,
    equipmentid: payload.equipmentid,
  };
  if (payload.peid != null && payload.peid > 0) {
    body.peid = payload.peid;
  }
  const res = await requestJson<ApiEnvelope<unknown>>('/api/ProjectEquipments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return unwrap(res);
}

/** Swagger: DELETE /api/ProjectEquipments/{id}，`id` 为关联行主键 peid */
export async function deleteProjectEquipment(peid: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/ProjectEquipments/${peid}`, {
    method: 'DELETE',
  });
  unwrap(res);
}

/**
 * 与项目设备清单对齐：先删除该项目下已有 `ProjectEquipments` 行，再按设备 id 逐条 POST。
 * 新建项目时一般为「只 POST」；编辑项目时需先删后建，避免重复关联。
 */
export async function syncProjectEquipmentLinks(
  projectid: number,
  equipmentIds: number[],
): Promise<void> {
  const existing = await listByProject(projectid);
  const peids = existing
    .map((l) => l.peid)
    .filter((pid): pid is number => pid != null && pid > 0);
  if (peids.length > 0) {
    await Promise.all(peids.map((pid) => deleteProjectEquipment(pid)));
  }
  const seen = new Set<number>();
  const ids = equipmentIds.filter((id) => {
    if (id == null || id <= 0 || Number.isNaN(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (ids.length === 0) return;
  await Promise.all(
    ids.map((equipmentid) => createProjectEquipment({ projectid, equipmentid })),
  );
}
