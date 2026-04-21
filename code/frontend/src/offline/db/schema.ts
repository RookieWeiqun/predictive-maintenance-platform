import {
  OFFLINE_SYNC_STATUSES,
  TASK_ITEM_EXECUTION_STATUSES,
  TASK_ITEM_SOURCE_TYPES,
  TASK_ITEM_SYNC_STATUSES,
} from '../types';

function quoteList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

export const OFFLINE_DB_VERSION = 1;

export const OFFLINE_TASK_TABLE = 'offline_task';
export const OFFLINE_TASK_ITEM_TABLE = 'offline_task_item';
export const OFFLINE_ATTACHMENT_TABLE = 'offline_attachment';
export const OFFLINE_OUTBOX_TABLE = 'offline_outbox';

export const CREATE_OFFLINE_TASK_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_TASK_TABLE} (
  task_uuid TEXT PRIMARY KEY NOT NULL,
  server_task_id TEXT,
  task_no TEXT,
  project_id TEXT,
  project_name TEXT,
  scheme_id TEXT,
  scheme_name TEXT,
  device_model TEXT,
  status TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  local_updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN (${quoteList(OFFLINE_SYNC_STATUSES)}))
);
`;

export const CREATE_OFFLINE_TASK_ITEM_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_TASK_ITEM_TABLE} (
  task_item_uuid TEXT PRIMARY KEY NOT NULL,
  server_item_id INTEGER,
  task_uuid TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (${quoteList(TASK_ITEM_SOURCE_TYPES)})),
  item_name TEXT NOT NULL,
  category_path TEXT,
  result TEXT,
  execution_status TEXT NOT NULL CHECK (execution_status IN (${quoteList(TASK_ITEM_EXECUTION_STATUSES)})),
  is_normal INTEGER NOT NULL DEFAULT 0,
  is_recheck INTEGER NOT NULL DEFAULT 0,
  local_updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN (${quoteList(TASK_ITEM_SYNC_STATUSES)}))
);
`;

export const CREATE_OFFLINE_ATTACHMENT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_ATTACHMENT_TABLE} (
  attachment_uuid TEXT PRIMARY KEY NOT NULL,
  task_item_uuid TEXT NOT NULL,
  local_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN (${quoteList(OFFLINE_SYNC_STATUSES)}))
);
`;

export const CREATE_OFFLINE_OUTBOX_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_OUTBOX_TABLE} (
  op_id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  entity_uuid TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN (${quoteList(OFFLINE_SYNC_STATUSES)})),
  last_error TEXT
);
`;

export const CREATE_OFFLINE_TASK_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_offline_task_sync_status ON ${OFFLINE_TASK_TABLE}(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_project_id ON ${OFFLINE_TASK_TABLE}(project_id);`,
];

export const CREATE_OFFLINE_TASK_ITEM_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_task_uuid ON ${OFFLINE_TASK_ITEM_TABLE}(task_uuid);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_sync_status ON ${OFFLINE_TASK_ITEM_TABLE}(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_server_item_id ON ${OFFLINE_TASK_ITEM_TABLE}(server_item_id);`,
];

export const CREATE_OFFLINE_ATTACHMENT_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_offline_attachment_task_item_uuid ON ${OFFLINE_ATTACHMENT_TABLE}(task_item_uuid);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_attachment_sync_status ON ${OFFLINE_ATTACHMENT_TABLE}(sync_status);`,
];

export const CREATE_OFFLINE_OUTBOX_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_offline_outbox_status_created_at ON ${OFFLINE_OUTBOX_TABLE}(status, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_outbox_entity ON ${OFFLINE_OUTBOX_TABLE}(entity_type, entity_uuid);`,
];
