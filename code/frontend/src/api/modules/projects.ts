import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type ProjectDto = {
  projectid?: number;
  projectname?: string | null;
  companyid: number;
  managerid?: number | null;
  assigneduserid?: number | null;
  projectstatus: number;
  createdate?: string | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

/** 兼容 camelCase / PascalCase */
function mapProjectRaw(raw: unknown): ProjectDto {
  const r = raw as Record<string, unknown>;
  const gv = (a: string, b: string) => r[a] ?? r[b];
  return {
    projectid: Number(gv('projectid', 'Projectid')),
    projectname: (gv('projectname', 'Projectname') as string | null | undefined) ?? null,
    companyid: Number(gv('companyid', 'Companyid')),
    managerid: (() => {
      const v = gv('managerid', 'Managerid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    assigneduserid: (() => {
      const v = gv('assigneduserid', 'Assigneduserid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    projectstatus: Number(gv('projectstatus', 'Projectstatus')),
    createdate: (gv('createdate', 'Createdate') as string | null | undefined) ?? null,
  };
}

export async function listProjects(): Promise<ProjectDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>('/api/Projects');
  return unwrap(res).map(mapProjectRaw);
}

export async function getProject(id: number): Promise<ProjectDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Projects/${id}`);
  return mapProjectRaw(unwrap(res));
}

export async function updateProject(payload: ProjectDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Projects', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

/** POST 成功后 data 为新 projectid */
export async function createProject(payload: ProjectDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Projects', {
    method: 'POST',
    body: JSON.stringify({ ...payload, projectid: payload.projectid ?? 0 }),
  });
  return unwrap(res);
}

/** 全量替换项目关联设备（请求体为设备 id 数组） */
export async function replaceProjectEquipments(projectId: number, equipIds: number[]): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>(`/api/Projects/${projectId}/Equipments`, {
    method: 'PUT',
    body: JSON.stringify(equipIds),
  });
  return unwrap(res);
}
