import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { OfflineSyncStatus } from '../types';
import { nowChinaDateTime } from '../utils/dateTime';

export type StoredTaskPhoto = {
  attachment_uuid: string;
  task_item_uuid: string;
  filename: string;
  local_path: string;
  preview_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  sync_status: OfflineSyncStatus;
};

function nowIso(): string {
  return nowChinaDateTime();
}

function createAttachmentUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function guessExtension(mimeType: string | null | undefined): string {
  const normalized = String(mimeType ?? '').trim().toLowerCase();
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  return 'jpg';
}

function estimateBase64Bytes(base64: string): number {
  const normalized = base64.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function normalizePhotoName(name: string | null | undefined): string {
  const normalized = String(name ?? '').trim().replace(/[\\/:*?"<>|]+/g, ' ');
  return normalized.replace(/\s+/g, ' ').trim() || '现场照片';
}

function splitDataUrl(dataUrl: string): { mimeType: string | null; base64: string } {
  const matched = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!matched) {
    throw new Error('照片数据格式无效，无法保存');
  }
  return {
    mimeType: matched[1] || null,
    base64: matched[2],
  };
}

function buildPhotoPath(taskUuid: string, taskItemUuid: string, extension: string): string {
  const sanitizedTaskUuid = taskUuid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedTaskItemUuid = taskItemUuid.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `task-photos/${sanitizedTaskUuid}/${sanitizedTaskItemUuid}/${Date.now()}-${createAttachmentUuid()}.${extension}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('读取照片失败'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('读取照片失败'));
    reader.readAsDataURL(file);
  });
}

async function buildStoredTaskPhoto(params: {
  taskUuid: string;
  taskItemUuid: string;
  filename?: string;
  dataUrl: string;
  sizeBytes?: number | null;
}): Promise<StoredTaskPhoto> {
  const { mimeType, base64 } = splitDataUrl(params.dataUrl);
  const path = buildPhotoPath(params.taskUuid, params.taskItemUuid, guessExtension(mimeType));
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });

  const createdAt = nowIso();
  const previewUrl = await resolveStoredPhotoPreviewUrl(path);
  return {
    attachment_uuid: createAttachmentUuid(),
    task_item_uuid: params.taskItemUuid,
    filename: normalizePhotoName(params.filename),
    local_path: path,
    preview_url: previewUrl,
    mime_type: mimeType,
    size_bytes: params.sizeBytes ?? estimateBase64Bytes(base64),
    created_at: createdAt,
    sync_status: 'pending',
  };
}

export async function captureTaskPhoto(
  taskUuid: string,
  taskItemUuid: string,
  filename?: string,
): Promise<StoredTaskPhoto> {
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.DataUrl,
    quality: 75,
    allowEditing: false,
    correctOrientation: true,
  });
  if (!photo.dataUrl) {
    throw new Error('未获取到照片数据');
  }
  return buildStoredTaskPhoto({
    taskUuid,
    taskItemUuid,
    filename,
    dataUrl: photo.dataUrl,
  });
}

export async function saveTaskPhotoFromFile(
  taskUuid: string,
  taskItemUuid: string,
  file: File,
  filename?: string,
): Promise<StoredTaskPhoto> {
  const dataUrl = await readFileAsDataUrl(file);
  return buildStoredTaskPhoto({
    taskUuid,
    taskItemUuid,
    filename,
    dataUrl,
    sizeBytes: file.size,
  });
}

export async function resolveStoredPhotoPreviewUrl(localPath: string): Promise<string> {
  if (!localPath) {
    return '';
  }
  if (/^(data:|blob:|https?:)/i.test(localPath)) {
    return localPath;
  }

  try {
    const uri = localPath.includes('://')
      ? localPath
      : (await Filesystem.getUri({ path: localPath, directory: Directory.Data })).uri;

    if (Capacitor.isNativePlatform()) {
      return Capacitor.convertFileSrc(uri);
    }
    return uri;
  } catch {
    return localPath;
  }
}

export async function deleteStoredTaskPhoto(localPath: string): Promise<void> {
  if (!localPath || localPath.includes('://')) {
    return;
  }

  try {
    await Filesystem.deleteFile({
      path: localPath,
      directory: Directory.Data,
    });
  } catch {
    // Ignore missing local files during cleanup.
  }
}

export function isPhotoCaptureCancelled(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('cancel') || message.includes('user cancelled');
}