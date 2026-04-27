import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

/** 与 Swagger `ProjectEquipment` 一致：项目—设备关联行 */
export type ProjectEquipmentDto = {
  peid?: number;
  projectid: number;
  equipmentid: number;
  ifdel?: boolean;
  templateid?: number | null;
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
    ifdel: (() => {
      const value = gv(r, 'ifdel', 'Ifdel');
      return value === true || value === 'true';
    })(),
    templateid: (() => {
      const value = gv(r, 'templateid', 'Templateid');
      if (value == null || value === '') return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
    })(),
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
  templateid?: number | null;
  ifdel?: boolean;
  peid?: number;
}): Promise<unknown> {
  const body: Record<string, number | boolean | null> = {
    peid: payload.peid ?? 0,
    projectid: payload.projectid,
    equipmentid: payload.equipmentid,
    ifdel: payload.ifdel ?? false,
    templateid: payload.templateid ?? null,
  };
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

export async function syncProjectEquipmentTemplateLinks(
  projectid: number,
  bindings: Array<{ equipmentid: number; templateid: number }>,
): Promise<void> {
  const existing = await listByProject(projectid);
  const peids = existing
    .map((link) => link.peid)
    .filter((pid): pid is number => pid != null && pid > 0);
  if (peids.length > 0) {
    await Promise.all(peids.map((pid) => deleteProjectEquipment(pid)));
  }

  const deduped = new Map<string, { equipmentid: number; templateid: number }>();
  for (const binding of bindings) {
    if (binding.equipmentid <= 0 || binding.templateid <= 0) continue;
    deduped.set(`${binding.equipmentid}:${binding.templateid}`, binding);
  }

  if (deduped.size === 0) return;

  await Promise.all(
    [...deduped.values()].map((binding) =>
      createProjectEquipment({
        peid: 0,
        projectid,
        equipmentid: binding.equipmentid,
        templateid: binding.templateid,
        ifdel: false,
      }),
    ),
  );
}
