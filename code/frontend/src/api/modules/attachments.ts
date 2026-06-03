import { request, requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type AttachmentDto = {
  attaid?: string;
  taskid?: number | null;
  taskitemid?: string;
  filepath?: string | null;
  filename?: string | null;
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

function mapAttachmentRaw(raw: unknown): AttachmentDto {
  const r = raw as Record<string, unknown>;
  return {
    attaid: String(gv(r, 'attaid', 'Attaid') ?? '').trim() || undefined,
    taskid: (() => {
      const value = gv(r, 'taskid', 'Taskid');
      if (value == null || value === '') return null;
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    })(),
    taskitemid: String(gv(r, 'taskitemid', 'Taskitemid') ?? '').trim() || undefined,
    filepath: String(gv(r, 'filepath', 'Filepath') ?? '').trim() || null,
    filename: String(gv(r, 'filename', 'Filename') ?? '').trim() || null,
  };
}

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw !== undefined && String(raw).trim() !== '') {
    return String(raw).replace(/\/+$/, '');
  }

  const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET;
  if (proxyTarget !== undefined && String(proxyTarget).trim() !== '') {
    return String(proxyTarget).replace(/\/+$/, '');
  }

  return '';
}

export function resolveAttachmentFileUrl(filepath: string | null | undefined): string | null {
  const normalized = String(filepath ?? '').trim();
  if (!normalized) return null;
  if (/^(data:|blob:|https?:)/i.test(normalized)) return normalized;

  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export async function listAttachmentsByTaskitem(taskitemid: string): Promise<AttachmentDto[]> {
  const id = taskitemid.trim();
  if (!id) return [];
  const res = await requestJson<ApiEnvelope<unknown[]>>(`/api/Attachments/ByTaskitem/${id}`);
  return unwrap(res).map(mapAttachmentRaw);
}

export async function listAttachmentsByTaskid(taskid: number): Promise<AttachmentDto[]> {
  if (!Number.isFinite(taskid) || taskid <= 0) return [];
  const res = await requestJson<ApiEnvelope<unknown[]>>(`/api/Attachments/ByTaskid/${taskid}`);
  return unwrap(res).map(mapAttachmentRaw);
}

export async function uploadAttachmentFiles(
  itemId: string,
  taskId: number,
  files: Array<{ file: File; filename: string }>,
): Promise<void> {
  if (!itemId.trim()) {
    throw new Error('上传图片失败：缺少任务项 ItemId');
  }
  if (!Number.isFinite(taskId) || taskId <= 0) {
    throw new Error('上传图片失败：缺少任务 ID');
  }
  if (files.length === 0) {
    return;
  }

  const formData = new FormData();
  formData.append('Itemid', itemId);
  formData.append('Taskid', String(taskId));
  for (const entry of files) {
    formData.append('Filenames', entry.filename);
    formData.append('Files', entry.file, entry.file.name);
  }

  await request('/api/Attachments/upload', {
    method: 'POST',
    body: formData,
  });
}