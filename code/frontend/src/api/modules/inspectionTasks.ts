import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type InspectionTaskDto = {
  taskid?: number;
  projectid: number;
  templateid: number;
  status: number;
  taskNo?: string | null;
  assigneduserid?: number | null;
  completetime?: string | null;
  productid: number;
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

function mapInspectionTaskRaw(raw: unknown): InspectionTaskDto {
  const r = raw as Record<string, unknown>;
  return {
    taskid: (() => {
      const v = gv(r, 'taskid', 'Taskid');
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    })(),
    projectid: Number(gv(r, 'projectid', 'Projectid')),
    templateid: Number(gv(r, 'templateid', 'Templateid')),
    status: Number(gv(r, 'status', 'Status')),
    taskNo: (gv(r, 'taskNo', 'TaskNo') as string | null | undefined) ?? null,
    assigneduserid: (() => {
      const v = gv(r, 'assigneduserid', 'Assigneduserid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    completetime: (gv(r, 'completetime', 'Completetime') as string | null | undefined) ?? null,
    productid: Number(gv(r, 'productid', 'Productid')),
  };
}

/** GET /api/InspectionTasks/{id} */
export async function getInspectionTask(taskid: number): Promise<InspectionTaskDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}`);
  return mapInspectionTaskRaw(unwrap(res));
}

/** GET /api/InspectionTasks/Search?projectid=&templateid=&productid= */
export async function searchInspectionTasks(params: {
  projectid?: number;
  templateid?: number;
  productid?: number;
}): Promise<InspectionTaskDto[]> {
  const q = new URLSearchParams();
  if (params.projectid != null) q.set('projectid', String(params.projectid));
  if (params.templateid != null) q.set('templateid', String(params.templateid));
  if (params.productid != null) q.set('productid', String(params.productid));
  const qs = q.toString();
  const path = qs ? `/api/InspectionTasks/Search?${qs}` : '/api/InspectionTasks/Search';
  const res = await requestJson<ApiEnvelope<unknown[]>>(path);
  return unwrap(res).map(mapInspectionTaskRaw);
}

/** POST /api/InspectionTasks，返回新 taskid */
export async function createInspectionTask(payload: InspectionTaskDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionTasks', {
    method: 'POST',
    body: JSON.stringify({
      taskid: payload.taskid ?? 0,
      projectid: payload.projectid,
      templateid: payload.templateid,
      status: payload.status,
      taskNo: payload.taskNo ?? null,
      assigneduserid: payload.assigneduserid ?? null,
      completetime: payload.completetime ?? null,
      productid: payload.productid,
    }),
  });
  return unwrap(res);
}

export async function deleteInspectionTask(taskid: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
