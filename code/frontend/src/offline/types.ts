export const TASK_ITEM_SOURCE_TYPES = ['system_generated', 'manual_added'] as const;

export type TaskItemSourceType = (typeof TASK_ITEM_SOURCE_TYPES)[number];

export const TASK_ITEM_EXECUTION_STATUSES = [
  'pending',
  'completed',
  'skipped',
  'not_applicable',
  'recheck_required',
] as const;

export type TaskItemExecutionStatus = (typeof TASK_ITEM_EXECUTION_STATUSES)[number];

export const TASK_ITEM_SYNC_STATUSES = ['pending', 'synced', 'failed'] as const;

export type TaskItemSyncStatus = (typeof TASK_ITEM_SYNC_STATUSES)[number];

export const OFFLINE_SYNC_STATUSES = ['pending', 'synced', 'failed'] as const;

export type OfflineSyncStatus = (typeof OFFLINE_SYNC_STATUSES)[number];

export interface OfflineTaskItemRecord {
  task_item_uuid: string;
  server_item_id: number | null;
  task_uuid: string;
  source_type: TaskItemSourceType;
  item_name: string;
  category_path: string | null;
  result: string | null;
  execution_status: TaskItemExecutionStatus;
  is_normal: boolean;
  is_recheck: boolean;
  local_updated_at: string;
  sync_status: TaskItemSyncStatus;
}

export type OfflineTaskItemUpsert = Omit<OfflineTaskItemRecord, 'local_updated_at'> & {
  local_updated_at?: string;
};

export interface OfflineTaskRecord {
  task_uuid: string;
  server_task_id: string | null;
  task_no: string | null;
  project_id: string | null;
  project_name: string | null;
  scheme_id: string | null;
  scheme_name: string | null;
  device_model: string | null;
  status: string;
  downloaded_at: string;
  local_updated_at: string;
  sync_status: OfflineSyncStatus;
}

export type OfflineTaskUpsert = Omit<OfflineTaskRecord, 'downloaded_at' | 'local_updated_at'> & {
  downloaded_at?: string;
  local_updated_at?: string;
};

export interface OfflineAttachmentRecord {
  attachment_uuid: string;
  task_item_uuid: string;
  local_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  sync_status: OfflineSyncStatus;
}

export type OfflineAttachmentUpsert = Omit<OfflineAttachmentRecord, 'created_at'> & {
  created_at?: string;
};

export interface OfflineOutboxRecord {
  op_id: string;
  entity_type: string;
  entity_uuid: string;
  action: string;
  payload_json: string;
  created_at: string;
  retry_count: number;
  status: OfflineSyncStatus;
  last_error: string | null;
}

export type OfflineOutboxEnqueue = Omit<OfflineOutboxRecord, 'op_id' | 'created_at' | 'retry_count' | 'status' | 'last_error'> & {
  op_id?: string;
  created_at?: string;
  retry_count?: number;
  status?: OfflineSyncStatus;
  last_error?: string | null;
};
