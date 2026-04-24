import {
  CREATE_OFFLINE_ATTACHMENT_INDEXES_SQL,
  CREATE_OFFLINE_ATTACHMENT_TABLE_SQL,
  CREATE_OFFLINE_OUTBOX_INDEXES_SQL,
  CREATE_OFFLINE_OUTBOX_TABLE_SQL,
  CREATE_OFFLINE_TASK_INDEXES_SQL,
  CREATE_OFFLINE_TASK_TABLE_SQL,
  CREATE_OFFLINE_TASK_ITEM_INDEXES_SQL,
  CREATE_OFFLINE_TASK_ITEM_TABLE_SQL,
  OFFLINE_DB_MIGRATION_V2_SQL,
  OFFLINE_DB_VERSION,
} from './schema';
import type { SQLiteExecutor } from './sqlite';

export async function runOfflineMigrations(executor: SQLiteExecutor): Promise<void> {
  const version = await executor.getUserVersion();

  if (version < 1) {
    await executor.execute(CREATE_OFFLINE_TASK_TABLE_SQL);
    await executor.execute(CREATE_OFFLINE_TASK_ITEM_TABLE_SQL);
    await executor.execute(CREATE_OFFLINE_ATTACHMENT_TABLE_SQL);
    await executor.execute(CREATE_OFFLINE_OUTBOX_TABLE_SQL);

    for (const statement of CREATE_OFFLINE_TASK_INDEXES_SQL) {
      await executor.execute(statement);
    }

    for (const statement of CREATE_OFFLINE_TASK_ITEM_INDEXES_SQL) {
      await executor.execute(statement);
    }

    for (const statement of CREATE_OFFLINE_ATTACHMENT_INDEXES_SQL) {
      await executor.execute(statement);
    }

    for (const statement of CREATE_OFFLINE_OUTBOX_INDEXES_SQL) {
      await executor.execute(statement);
    }
  }

  if (version < 2) {
    for (const statement of OFFLINE_DB_MIGRATION_V2_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  await executor.setUserVersion(OFFLINE_DB_VERSION);
}
