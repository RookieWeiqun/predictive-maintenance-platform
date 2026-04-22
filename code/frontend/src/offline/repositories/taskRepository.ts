import { getOfflineExecutor } from '../db/sqlite';
import type { OfflineTaskRecord, OfflineTaskUpsert, OfflineSyncStatus } from '../types';

interface OfflineTaskRow extends OfflineTaskRecord {}

function nowIso(): string {
  return new Date().toISOString();
}

export class OfflineTaskRepository {
  async listAll(): Promise<OfflineTaskRecord[]> {
    const executor = getOfflineExecutor();
    return executor.query<OfflineTaskRow>(
      `
        SELECT
          task_uuid,
          server_task_id,
          task_no,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          device_model,
          status,
          downloaded_at,
          local_updated_at,
          sync_status
        FROM offline_task
        ORDER BY downloaded_at DESC
      `,
    );
  }

  async getByTaskUuid(taskUuid: string): Promise<OfflineTaskRecord | null> {
    const executor = getOfflineExecutor();
    const rows = await executor.query<OfflineTaskRow>(
      `
        SELECT
          task_uuid,
          server_task_id,
          task_no,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          device_model,
          status,
          downloaded_at,
          local_updated_at,
          sync_status
        FROM offline_task
        WHERE task_uuid = ?
        LIMIT 1
      `,
      [taskUuid],
    );

    return rows[0] ?? null;
  }

  async upsert(record: OfflineTaskUpsert): Promise<void> {
    const executor = getOfflineExecutor();
    const downloadedAt = record.downloaded_at ?? nowIso();
    const localUpdatedAt = record.local_updated_at ?? downloadedAt;

    await executor.execute(
      `
        INSERT INTO offline_task (
          task_uuid,
          server_task_id,
          task_no,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          device_model,
          status,
          downloaded_at,
          local_updated_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_uuid) DO UPDATE SET
          server_task_id = excluded.server_task_id,
          task_no = excluded.task_no,
          project_id = excluded.project_id,
          project_name = excluded.project_name,
          scheme_id = excluded.scheme_id,
          scheme_name = excluded.scheme_name,
          device_model = excluded.device_model,
          status = excluded.status,
          local_updated_at = excluded.local_updated_at,
          sync_status = excluded.sync_status
      `,
      [
        record.task_uuid,
        record.server_task_id,
        record.task_no,
        record.project_id,
        record.project_name,
        record.scheme_id,
        record.scheme_name,
        record.device_model,
        record.status,
        downloadedAt,
        localUpdatedAt,
        record.sync_status,
      ],
    );
  }

  async markDirty(taskUuid: string, syncStatus: OfflineSyncStatus = 'pending'): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        UPDATE offline_task
        SET
          status = 'in-progress',
          local_updated_at = ?,
          sync_status = ?
        WHERE task_uuid = ?
      `,
      [nowIso(), syncStatus, taskUuid],
    );
  }

  async setLifecycleStatus(
    taskUuid: string,
    status: string,
    syncStatus?: OfflineSyncStatus,
  ): Promise<void> {
    const executor = getOfflineExecutor();
    if (syncStatus) {
      await executor.execute(
        `
          UPDATE offline_task
          SET
            status = ?,
            local_updated_at = ?,
            sync_status = ?
          WHERE task_uuid = ?
        `,
        [status, nowIso(), syncStatus, taskUuid],
      );
      return;
    }

    await executor.execute(
      `
        UPDATE offline_task
        SET
          status = ?,
          local_updated_at = ?
        WHERE task_uuid = ?
      `,
      [status, nowIso(), taskUuid],
    );
  }

  async markUploaded(taskUuid: string): Promise<void> {
    await this.setLifecycleStatus(taskUuid, 'uploaded', 'synced');
  }
}

export const offlineTaskRepository = new OfflineTaskRepository();
