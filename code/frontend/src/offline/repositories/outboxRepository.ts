import { getOfflineExecutor } from '../db/sqlite';
import type { OfflineOutboxEnqueue, OfflineOutboxRecord, OfflineSyncStatus } from '../types';

function nowIso(): string {
  return new Date().toISOString();
}

function createOpId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `outbox_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class OfflineOutboxRepository {
  async listAll(): Promise<OfflineOutboxRecord[]> {
    const executor = getOfflineExecutor();
    return executor.query<OfflineOutboxRecord>(
      `
        SELECT
          op_id,
          entity_type,
          entity_uuid,
          action,
          payload_json,
          created_at,
          retry_count,
          status,
          last_error
        FROM offline_outbox
        ORDER BY created_at DESC
      `,
    );
  }

  async listPending(): Promise<OfflineOutboxRecord[]> {
    const executor = getOfflineExecutor();
    return executor.query<OfflineOutboxRecord>(
      `
        SELECT
          op_id,
          entity_type,
          entity_uuid,
          action,
          payload_json,
          created_at,
          retry_count,
          status,
          last_error
        FROM offline_outbox
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `,
    );
  }

  async enqueue(record: OfflineOutboxEnqueue): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        INSERT INTO offline_outbox (
          op_id,
          entity_type,
          entity_uuid,
          action,
          payload_json,
          created_at,
          retry_count,
          status,
          last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        record.op_id ?? createOpId(),
        record.entity_type,
        record.entity_uuid,
        record.action,
        record.payload_json,
        record.created_at ?? nowIso(),
        record.retry_count ?? 0,
        record.status ?? 'pending',
        record.last_error ?? null,
      ],
    );
  }

  async replacePending(record: OfflineOutboxEnqueue): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        DELETE FROM offline_outbox
        WHERE entity_type = ? AND entity_uuid = ? AND action = ? AND status = 'pending'
      `,
      [record.entity_type, record.entity_uuid, record.action],
    );

    await this.enqueue(record);
  }

  async deletePending(entityType: string, entityUuid: string, action?: string): Promise<void> {
    const executor = getOfflineExecutor();
    if (action) {
      await executor.execute(
        `
          DELETE FROM offline_outbox
          WHERE entity_type = ? AND entity_uuid = ? AND action = ? AND status = 'pending'
        `,
        [entityType, entityUuid, action],
      );
      return;
    }

    await executor.execute(
      `
        DELETE FROM offline_outbox
        WHERE entity_type = ? AND entity_uuid = ? AND status = 'pending'
      `,
      [entityType, entityUuid],
    );
  }

  async markStatus(opId: string, status: OfflineSyncStatus, lastError: string | null = null): Promise<void> {
    const executor = getOfflineExecutor();
    await executor.execute(
      `
        UPDATE offline_outbox
        SET status = ?, last_error = ?
        WHERE op_id = ?
      `,
      [status, lastError, opId],
    );
  }
}

export const offlineOutboxRepository = new OfflineOutboxRepository();
