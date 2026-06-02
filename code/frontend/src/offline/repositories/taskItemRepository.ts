import { getOfflineExecutor } from '../db/sqlite';
import type {
  OfflineTaskItemRecord,
  OfflineTaskItemUpsert,
  TaskItemExecutionStatus,
  TaskItemSyncStatus,
} from '../types';
import { nowChinaDateTime } from '../utils/dateTime';

interface OfflineTaskItemRow {
  task_item_uuid: string;
  server_item_id: string | null;
  task_uuid: string;
  source_type: OfflineTaskItemRecord['source_type'];
  item_name: string;
  sort_order: number | null;
  category_path: string | null;
  result: string | null;
  display_condition: string | null;
  operation_guide: string | null;
  recommended_rules: string | null;
  recommendation_content: string | null;
  hidden_hazard_content: string | null;
  maintenance_instructions: string | null;
  execution_status: TaskItemExecutionStatus;
  is_normal: number;
  is_recheck: number;
  local_updated_at: string;
  sync_status: TaskItemSyncStatus;
}

function toRecord(row: OfflineTaskItemRow): OfflineTaskItemRecord {
  return {
    ...row,
    is_normal: row.is_normal === 1,
    is_recheck: row.is_recheck === 1,
  };
}

function nowIso(): string {
  return nowChinaDateTime();
}

export class OfflineTaskItemRepository {
  async listAll(): Promise<OfflineTaskItemRecord[]> {
    const executor = getOfflineExecutor();
    const rows = await executor.query<OfflineTaskItemRow>(
      `
        SELECT
          task_item_uuid,
          server_item_id,
          task_uuid,
          source_type,
          item_name,
          sort_order,
          category_path,
          result,
          display_condition,
          operation_guide,
          recommended_rules,
          recommendation_content,
          hidden_hazard_content,
          maintenance_instructions,
          execution_status,
          is_normal,
          is_recheck,
          local_updated_at,
          sync_status
        FROM offline_task_item
        ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order DESC, local_updated_at DESC
      `,
    );

    return rows.map(toRecord);
  }

  async listByTaskUuid(taskUuid: string): Promise<OfflineTaskItemRecord[]> {
    const executor = getOfflineExecutor();
    const rows = await executor.query<OfflineTaskItemRow>(
      `
        SELECT
          task_item_uuid,
          server_item_id,
          task_uuid,
          source_type,
          item_name,
          sort_order,
          category_path,
          result,
          display_condition,
          operation_guide,
          recommended_rules,
          recommendation_content,
          hidden_hazard_content,
          maintenance_instructions,
          execution_status,
          is_normal,
          is_recheck,
          local_updated_at,
          sync_status
        FROM offline_task_item
        WHERE task_uuid = ?
        ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order DESC, local_updated_at DESC
      `,
      [taskUuid],
    );

    return rows.map(toRecord);
  }

  async getByTaskItemUuid(taskItemUuid: string): Promise<OfflineTaskItemRecord | null> {
    const executor = getOfflineExecutor();
    const rows = await executor.query<OfflineTaskItemRow>(
      `
        SELECT
          task_item_uuid,
          server_item_id,
          task_uuid,
          source_type,
          item_name,
          sort_order,
          category_path,
          result,
          display_condition,
          operation_guide,
          recommended_rules,
          recommendation_content,
          hidden_hazard_content,
          maintenance_instructions,
          execution_status,
          is_normal,
          is_recheck,
          local_updated_at,
          sync_status
        FROM offline_task_item
        WHERE task_item_uuid = ?
        LIMIT 1
      `,
      [taskItemUuid],
    );

    return rows.length > 0 ? toRecord(rows[0]) : null;
  }

  async upsert(record: OfflineTaskItemUpsert): Promise<void> {
    const executor = getOfflineExecutor();
    const localUpdatedAt = record.local_updated_at ?? nowIso();

    await executor.execute(
      `
        INSERT INTO offline_task_item (
          task_item_uuid,
          server_item_id,
          task_uuid,
          source_type,
          item_name,
          sort_order,
          category_path,
          result,
          display_condition,
          operation_guide,
          recommended_rules,
          recommendation_content,
          hidden_hazard_content,
          maintenance_instructions,
          execution_status,
          is_normal,
          is_recheck,
          local_updated_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(task_item_uuid) DO UPDATE SET
          server_item_id = excluded.server_item_id,
          task_uuid = excluded.task_uuid,
          source_type = excluded.source_type,
          item_name = excluded.item_name,
          sort_order = excluded.sort_order,
          category_path = excluded.category_path,
          result = excluded.result,
          display_condition = excluded.display_condition,
          operation_guide = excluded.operation_guide,
          recommended_rules = excluded.recommended_rules,
          recommendation_content = excluded.recommendation_content,
          hidden_hazard_content = excluded.hidden_hazard_content,
          maintenance_instructions = excluded.maintenance_instructions,
          execution_status = excluded.execution_status,
          is_normal = excluded.is_normal,
          is_recheck = excluded.is_recheck,
          local_updated_at = excluded.local_updated_at,
          sync_status = excluded.sync_status
      `,
      [
        record.task_item_uuid,
        record.server_item_id,
        record.task_uuid,
        record.source_type,
        record.item_name,
        record.sort_order ?? null,
        record.category_path,
        record.result,
        record.display_condition,
        record.operation_guide,
        record.recommended_rules,
        record.recommendation_content,
        record.hidden_hazard_content,
        record.maintenance_instructions,
        record.execution_status,
        record.is_normal ? 1 : 0,
        record.is_recheck ? 1 : 0,
        localUpdatedAt,
        record.sync_status,
      ],
    );
  }

  async updateResult(params: {
    taskItemUuid: string;
    result: string | null;
    executionStatus: TaskItemExecutionStatus;
    isNormal: boolean;
    isRecheck: boolean;
    syncStatus: TaskItemSyncStatus;
  }): Promise<void> {
    const executor = getOfflineExecutor();

    await executor.execute(
      `
        UPDATE offline_task_item
        SET
          result = ?,
          execution_status = ?,
          is_normal = ?,
          is_recheck = ?,
          sync_status = ?
        WHERE task_item_uuid = ?
      `,
      [
        params.result,
        params.executionStatus,
        params.isNormal ? 1 : 0,
        params.isRecheck ? 1 : 0,
        params.syncStatus,
        params.taskItemUuid,
      ],
    );
  }

  async markSynced(taskItemUuid: string, uploadedAt: string = nowIso()): Promise<void> {
    const executor = getOfflineExecutor();

    await executor.execute(
      `
        UPDATE offline_task_item
        SET
          sync_status = 'synced',
          local_updated_at = ?
        WHERE task_item_uuid = ?
      `,
      [uploadedAt, taskItemUuid],
    );
  }
}

export const offlineTaskItemRepository = new OfflineTaskItemRepository();
