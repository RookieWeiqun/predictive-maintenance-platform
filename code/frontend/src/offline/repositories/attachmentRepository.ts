import { getOfflineExecutor } from '../db/sqlite';
import type { OfflineAttachmentRecord, OfflineAttachmentUpsert, OfflineSyncStatus } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

export class OfflineAttachmentRepository {
  async listAll(): Promise<OfflineAttachmentRecord[]> {
    const executor = getOfflineExecutor();
    return executor.query<OfflineAttachmentRecord>(
      `
        SELECT
          attachment_uuid,
          task_item_uuid,
          local_path,
          mime_type,
          size_bytes,
          created_at,
          sync_status
        FROM offline_attachment
        ORDER BY created_at DESC
      `,
    );
  }

  async listByTaskItemUuid(taskItemUuid: string): Promise<OfflineAttachmentRecord[]> {
    const executor = getOfflineExecutor();
    return executor.query<OfflineAttachmentRecord>(
      `
        SELECT
          attachment_uuid,
          task_item_uuid,
          local_path,
          mime_type,
          size_bytes,
          created_at,
          sync_status
        FROM offline_attachment
        WHERE task_item_uuid = ?
        ORDER BY created_at DESC
      `,
      [taskItemUuid],
    );
  }

  async upsert(record: OfflineAttachmentUpsert): Promise<void> {
    const executor = getOfflineExecutor();
    const createdAt = record.created_at ?? nowIso();
    await executor.execute(
      `
        INSERT INTO offline_attachment (
          attachment_uuid,
          task_item_uuid,
          local_path,
          mime_type,
          size_bytes,
          created_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(attachment_uuid) DO UPDATE SET
          task_item_uuid = excluded.task_item_uuid,
          local_path = excluded.local_path,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          sync_status = excluded.sync_status
      `,
      [
        record.attachment_uuid,
        record.task_item_uuid,
        record.local_path,
        record.mime_type,
        record.size_bytes,
        createdAt,
        record.sync_status,
      ],
    );
  }

  async markSynced(attachmentUuid: string, syncStatus: OfflineSyncStatus = 'synced'): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `UPDATE offline_attachment SET sync_status = ? WHERE attachment_uuid = ?`,
      [syncStatus, attachmentUuid],
    );
  }

  async deleteByAttachmentUuid(attachmentUuid: string): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `DELETE FROM offline_attachment WHERE attachment_uuid = ?`,
      [attachmentUuid],
    );
  }
}

export const offlineAttachmentRepository = new OfflineAttachmentRepository();
