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
  OFFLINE_DB_MIGRATION_V3_SQL,
  OFFLINE_DB_MIGRATION_V4_SQL,
  OFFLINE_DB_MIGRATION_V5_SQL,
  OFFLINE_DB_MIGRATION_V6_SQL,
  OFFLINE_DB_MIGRATION_V7_SQL,
  OFFLINE_DB_MIGRATION_V8_SQL,
  OFFLINE_DB_MIGRATION_V9_SQL,
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

  if (version < 3) {
    for (const statement of OFFLINE_DB_MIGRATION_V3_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  if (version < 4) {
    for (const statement of OFFLINE_DB_MIGRATION_V4_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  if (version < 5) {
    for (const statement of OFFLINE_DB_MIGRATION_V5_SQL) {
      await executor.execute(statement);
    }
  }

  if (version < 6) {
    for (const statement of OFFLINE_DB_MIGRATION_V6_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  if (version < 7) {
    for (const statement of OFFLINE_DB_MIGRATION_V7_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  if (version < 8) {
    for (const statement of OFFLINE_DB_MIGRATION_V8_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  if (version < 9) {
    for (const statement of OFFLINE_DB_MIGRATION_V9_SQL) {
      try {
        await executor.execute(statement);
      } catch {
        // Column may already exist on partially migrated installs.
      }
    }
  }

  await executor.setUserVersion(OFFLINE_DB_VERSION);
}
