import { request } from '../http';

export async function uploadAttachmentFiles(itemId: string, files: File[]): Promise<void> {
  if (!itemId.trim()) {
    throw new Error('上传图片失败：缺少任务项 ItemId');
  }
  if (files.length === 0) {
    return;
  }

  const formData = new FormData();
  formData.append('ItemId', itemId);
  for (const file of files) {
    formData.append('Files', file, file.name);
  }

  await request('/api/Attachments/upload', {
    method: 'POST',
    body: formData,
  });
}