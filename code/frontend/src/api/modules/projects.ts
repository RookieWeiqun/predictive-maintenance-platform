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

export async function listProjects(): Promise<ProjectDto[]> {
  const res = await requestJson<ApiEnvelope<ProjectDto[]>>('/api/Projects');
  return unwrap(res);
}
