import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type TaskitemDto = {
  itemid?: number;
  taskid?: number | null;
  name?: string | null;
  categorypath?: string | null;
  result?: string | null;
  isnormal?: boolean;
  isrecheck?: boolean;
  recheckresult?: string | null;
  photopath?: string | null;
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

function mapTaskitemRaw(raw: unknown): TaskitemDto {
  const r = raw as Record<string, unknown>;
  return {
    itemid: (() => {
      const v = gv(r, 'itemid', 'Itemid');
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    })(),
    taskid: (() => {
      const v = gv(r, 'taskid', 'Taskid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    name: (gv(r, 'name', 'Name') as string | null | undefined) ?? null,
    categorypath: (gv(r, 'categorypath', 'Categorypath') as string | null | undefined) ?? null,
    result: (gv(r, 'result', 'Result') as string | null | undefined) ?? null,
    isnormal: (() => {
      const v = gv(r, 'isnormal', 'Isnormal');
      if (typeof v === 'boolean') return v;
      if (v === 'true' || v === true) return true;
      if (v === 'false' || v === false) return false;
      return true;
    })(),
    isrecheck: (() => {
      const v = gv(r, 'isrecheck', 'Isrecheck');
      if (typeof v === 'boolean') return v;
      return Boolean(v);
    })(),
    recheckresult: (gv(r, 'recheckresult', 'Recheckresult') as string | null | undefined) ?? null,
    photopath: (gv(r, 'photopath', 'Photopath') as string | null | undefined) ?? null,
  };
}

/** GET /api/Taskitems/ByTask/{taskid} */
export async function listTaskitemsByTask(taskid: number): Promise<TaskitemDto[]> {
  const res = await requestJson<ApiEnvelope<unknown[]>>(`/api/Taskitems/ByTask/${taskid}`);
  return unwrap(res).map(mapTaskitemRaw);
}

/** POST /api/Taskitems，返回新 itemid */
export async function createTaskitem(payload: TaskitemDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/Taskitems', {
    method: 'POST',
    body: JSON.stringify({
      itemid: payload.itemid ?? 0,
      taskid: payload.taskid ?? null,
      name: payload.name ?? null,
      categorypath: payload.categorypath ?? null,
      result: payload.result ?? null,
      isnormal: payload.isnormal ?? true,
      isrecheck: payload.isrecheck ?? false,
      recheckresult: payload.recheckresult ?? null,
      photopath: payload.photopath ?? null,
    }),
  });
  return unwrap(res);
}

export async function deleteTaskitem(itemid: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Taskitems/${itemid}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
