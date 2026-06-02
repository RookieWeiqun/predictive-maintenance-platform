import {
  OFFLINE_SYNC_STATUSES,
  TASK_ITEM_EXECUTION_STATUSES,
  TASK_ITEM_SOURCE_TYPES,
  TASK_ITEM_SYNC_STATUSES,
} from '../types';

function quoteList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

export const OFFLINE_DB_VERSION = 9;

export const OFFLINE_TASK_TABLE = 'offline_task';
export const OFFLINE_TASK_ITEM_TABLE = 'offline_task_item';
export const OFFLINE_ATTACHMENT_TABLE = 'offline_attachment';
export const OFFLINE_OUTBOX_TABLE = 'offline_outbox';

export const CREATE_OFFLINE_TASK_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_TASK_TABLE} (
  task_uuid TEXT PRIMARY KEY NOT NULL,
  server_task_id TEXT,
  task_no TEXT,
  serial_no TEXT,
  equipment_name TEXT,
  equipment_number TEXT,
  department TEXT,
  assigned_user_name TEXT,
  assigned_user_id TEXT,
  download_device_name TEXT,
  project_id TEXT,
  project_name TEXT,
  scheme_id TEXT,
  scheme_name TEXT,
  product_id TEXT,
  inspection_type TEXT,
  version INTEGER,
  device_model TEXT,
  scheme_snapshot_json TEXT,
  status TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  local_updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN (${quoteList(OFFLINE_SYNC_STATUSES)}))
);
`;

export const OFFLINE_DB_MIGRATION_V2_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN serial_no TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN assigned_user_name TEXT;`,
];

export const OFFLINE_DB_MIGRATION_V3_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN assigned_user_id TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN product_id TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN inspection_type TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN version INTEGER;`,
];

export const OFFLINE_DB_MIGRATION_V4_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN download_device_name TEXT;`,
];

export const OFFLINE_DB_MIGRATION_V5_SQL = [
  `DROP TABLE IF EXISTS ${OFFLINE_TASK_ITEM_TABLE}_v5;`,
  `
CREATE TABLE ${OFFLINE_TASK_ITEM_TABLE}_v5 (
  task_item_uuid TEXT PRIMARY KEY NOT NULL,
  server_item_id TEXT,
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
`,
  `
INSERT INTO ${OFFLINE_TASK_ITEM_TABLE}_v5 (
  task_item_uuid,
  server_item_id,
  task_uuid,
  source_type,
  item_name,
  category_path,
  result,
  execution_status,
  is_normal,
  is_recheck,
  local_updated_at,
  sync_status
)
SELECT
  task_item_uuid,
  CASE WHEN server_item_id IS NULL THEN NULL ELSE CAST(server_item_id AS TEXT) END,
  task_uuid,
  source_type,
  item_name,
  category_path,
  result,
  execution_status,
  is_normal,
  is_recheck,
  local_updated_at,
  sync_status
FROM ${OFFLINE_TASK_ITEM_TABLE};
`,
  `DROP TABLE ${OFFLINE_TASK_ITEM_TABLE};`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE}_v5 RENAME TO ${OFFLINE_TASK_ITEM_TABLE};`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_task_uuid ON ${OFFLINE_TASK_ITEM_TABLE}(task_uuid);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_sync_status ON ${OFFLINE_TASK_ITEM_TABLE}(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_task_item_server_item_id ON ${OFFLINE_TASK_ITEM_TABLE}(server_item_id);`,
];

export const OFFLINE_DB_MIGRATION_V6_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN equipment_name TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN equipment_number TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN department TEXT;`,
];

export const CREATE_OFFLINE_TASK_ITEM_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OFFLINE_TASK_ITEM_TABLE} (
  task_item_uuid TEXT PRIMARY KEY NOT NULL,
  server_item_id TEXT,
  task_uuid TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (${quoteList(TASK_ITEM_SOURCE_TYPES)})),
  item_name TEXT NOT NULL,
  sort_order INTEGER,
  category_path TEXT,
  result TEXT,
  display_condition TEXT,
  operation_guide TEXT,
  recommended_rules TEXT,
  recommendation_content TEXT,
  hidden_hazard_content TEXT,
  maintenance_instructions TEXT,
  execution_status TEXT NOT NULL CHECK (execution_status IN (${quoteList(TASK_ITEM_EXECUTION_STATUSES)})),
  is_normal INTEGER NOT NULL DEFAULT 0,
  is_recheck INTEGER NOT NULL DEFAULT 0,
  local_updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN (${quoteList(TASK_ITEM_SYNC_STATUSES)}))
);
`;

export const OFFLINE_DB_MIGRATION_V7_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN display_condition TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN operation_guide TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN recommended_rules TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN recommendation_content TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN hidden_hazard_content TEXT;`,
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN maintenance_instructions TEXT;`,
];

export const OFFLINE_DB_MIGRATION_V8_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_ITEM_TABLE} ADD COLUMN sort_order INTEGER;`,
];

export const OFFLINE_DB_MIGRATION_V9_SQL = [
  `ALTER TABLE ${OFFLINE_TASK_TABLE} ADD COLUMN scheme_snapshot_json TEXT;`,
];

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
