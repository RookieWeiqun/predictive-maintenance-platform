import { getOfflineExecutor } from '../db/sqlite';
import type { OfflineTaskRecord, OfflineTaskUpsert, OfflineSyncStatus } from '../types';
import { nowChinaDateTime } from '../utils/dateTime';

interface OfflineTaskRow extends OfflineTaskRecord {}

function nowIso(): string {
  return nowChinaDateTime();
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
          serial_no,
          equipment_name,
          equipment_number,
          department,
          assigned_user_name,
          assigned_user_id,
          download_device_name,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          product_id,
          inspection_type,
          version,
          device_model,
          scheme_snapshot_json,
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
          serial_no,
          equipment_name,
          equipment_number,
          department,
          assigned_user_name,
          assigned_user_id,
          download_device_name,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          product_id,
          inspection_type,
          version,
          device_model,
          scheme_snapshot_json,
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
          serial_no,
          equipment_name,
          equipment_number,
          department,
          assigned_user_name,
          assigned_user_id,
          download_device_name,
          project_id,
          project_name,
          scheme_id,
          scheme_name,
          product_id,
          inspection_type,
          version,
          device_model,
          scheme_snapshot_json,
          status,
          downloaded_at,
          local_updated_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_uuid) DO UPDATE SET
          server_task_id = excluded.server_task_id,
          task_no = excluded.task_no,
          serial_no = excluded.serial_no,
          equipment_name = excluded.equipment_name,
          equipment_number = excluded.equipment_number,
          department = excluded.department,
          assigned_user_name = excluded.assigned_user_name,
          assigned_user_id = excluded.assigned_user_id,
          download_device_name = excluded.download_device_name,
          project_id = excluded.project_id,
          project_name = excluded.project_name,
          scheme_id = excluded.scheme_id,
          scheme_name = excluded.scheme_name,
          product_id = excluded.product_id,
          inspection_type = excluded.inspection_type,
          version = excluded.version,
          device_model = excluded.device_model,
          scheme_snapshot_json = excluded.scheme_snapshot_json,
          status = excluded.status,
          local_updated_at = excluded.local_updated_at,
          sync_status = excluded.sync_status
      `,
      [
        record.task_uuid,
        record.server_task_id,
        record.task_no,
        record.serial_no,
        record.equipment_name,
        record.equipment_number,
        record.department,
        record.assigned_user_name,
        record.assigned_user_id,
        record.download_device_name,
        record.project_id,
        record.project_name,
        record.scheme_id,
        record.scheme_name,
        record.product_id,
        record.inspection_type,
        record.version,
        record.device_model,
        record.scheme_snapshot_json ?? null,
        record.status,
        downloadedAt,
        localUpdatedAt,
        record.sync_status,
      ],
    );
  }

  async updateCollectedMeta(
    taskUuid: string,
    meta: {
      serialNo?: string | null;
      equipmentName?: string | null;
      equipmentNumber?: string | null;
      department?: string | null;
      assignedUserName?: string | null;
    },
  ): Promise<void> {
    const existing = await this.getByTaskUuid(taskUuid);
    if (existing == null) {
      return;
    }

    await this.upsert({
      ...existing,
      serial_no: meta.serialNo ?? existing.serial_no,
      equipment_name: meta.equipmentName ?? existing.equipment_name,
      equipment_number: meta.equipmentNumber ?? existing.equipment_number,
      department: meta.department ?? existing.department,
      assigned_user_name: meta.assignedUserName ?? existing.assigned_user_name,
      sync_status: 'pending',
    });
  }

  async markDirty(taskUuid: string, syncStatus: OfflineSyncStatus = 'pending'): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        UPDATE offline_task
        SET
          status = CASE
            WHEN status IN ('uploaded', 'completed', 'synced') THEN status
            ELSE 'in-progress'
          END,
          sync_status = ?
        WHERE task_uuid = ?
      `,
      [syncStatus, taskUuid],
    );
  }

  async setLifecycleStatus(taskUuid: string, status: string): Promise<void> {
    const executor = getOfflineExecutor();

    await executor.execute(
      `
        UPDATE offline_task
        SET
          status = ?
        WHERE task_uuid = ?
      `,
      [status, taskUuid],
    );
  }

  async markUploaded(
    taskUuid: string,
    uploadedAt: string = nowIso(),
    version?: number | null,
  ): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        UPDATE offline_task
        SET
          status = 'uploaded',
          version = CASE
            WHEN ? IS NOT NULL THEN ? + 1
            WHEN version IS NULL THEN 1
            ELSE version + 1
          END,
          local_updated_at = ?,
          sync_status = 'synced'
        WHERE task_uuid = ?
      `,
      [version ?? null, version ?? null, uploadedAt, taskUuid],
    );
  }
}

export const offlineTaskRepository = new OfflineTaskRepository();
