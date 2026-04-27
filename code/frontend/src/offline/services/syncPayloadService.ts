import { offlineAttachmentRepository } from '../repositories/attachmentRepository';
import { offlineTaskItemRepository } from '../repositories/taskItemRepository';
import { offlineOutboxRepository } from '../repositories/outboxRepository';
import { offlineTaskRepository } from '../repositories/taskRepository';

type ParsedOfflineResult = {
  raw: string | null;
  value: string | null;
  result: string | null;
  remarks: string | null;
  data_fields: Record<string, unknown> | null;
};

export type OfflineSyncAttachmentPayload = {
  attachment_uuid: string;
  task_item_uuid: string;
  local_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  sync_status: string;
};

export type OfflineSyncTaskItemPayload = {
  task_item_uuid: string;
  server_item_id: string | null;
  source_type: string;
  item_name: string;
  category_path: string | null;
  execution_status: string;
  is_normal: boolean;
  is_recheck: boolean;
  local_updated_at: string;
  sync_status: string;
  task_result: ParsedOfflineResult;
  attachments: OfflineSyncAttachmentPayload[];
};

export type OfflineSyncTaskPayload = {
  task_uuid: string;
  server_task_id: string | null;
  task_no: string | null;
  serial_no: string | null;
  assigned_user_name: string | null;
  project_id: string | null;
  project_name: string | null;
  scheme_id: string | null;
  scheme_name: string | null;
  device_model: string | null;
  status: string;
  downloaded_at: string;
  local_updated_at: string;
  sync_status: string;
  changed_item_count: number;
  changed_attachment_count: number;
  items: OfflineSyncTaskItemPayload[];
};

export type OfflineSyncBatchPayload = {
  protocol_version: '1.0';
  generated_at: string;
  sync_mode: 'delta';
  source: {
    app: 'predictive-maintenance-tablet';
    platform: 'android' | 'web';
  };
  task_count: number;
  tasks: OfflineSyncTaskPayload[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function currentPlatform(): 'android' | 'web' {
  return /android/i.test(navigator.userAgent) ? 'android' : 'web';
}

function parseOfflineResult(raw: string | null): ParsedOfflineResult {
  if (raw == null || raw === '') {
    return {
      raw: null,
      value: null,
      result: null,
      remarks: null,
      data_fields: null,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const dataFields = parsed.dataFields && typeof parsed.dataFields === 'object'
      ? parsed.dataFields as Record<string, unknown>
      : null;
    const explicitValue = typeof parsed.value === 'string'
      ? parsed.value
      : typeof parsed.result === 'string'
        ? parsed.result
        : dataFields && typeof dataFields.value === 'string'
          ? String(dataFields.value)
          : null;
    return {
      raw,
      value: explicitValue,
      result: typeof parsed.resultState === 'string'
        ? parsed.resultState
        : typeof parsed.result === 'string'
          ? parsed.result
          : null,
      remarks: typeof parsed.remarks === 'string' ? parsed.remarks : null,
      data_fields: dataFields,
    };
  } catch {
    return {
      raw,
      value: raw,
      result: null,
      remarks: null,
      data_fields: null,
    };
  }
}

export async function buildTaskSyncPayload(taskUuid: string): Promise<OfflineSyncTaskPayload | null> {
  const task = await offlineTaskRepository.getByTaskUuid(taskUuid);
  if (task == null) {
    return null;
  }

  const [taskItems, allAttachments] = await Promise.all([
    offlineTaskItemRepository.listByTaskUuid(taskUuid),
    offlineAttachmentRepository.listAll(),
  ]);

  const changedItems = taskItems.filter((item) => item.sync_status !== 'synced');
  const taskItemIds = new Set(taskItems.map((item) => item.task_item_uuid));
  const changedAttachments = allAttachments.filter(
    (attachment) => attachment.sync_status !== 'synced' && taskItemIds.has(attachment.task_item_uuid),
  );
  const includedTaskItemIds = new Set([
    ...changedItems.map((item) => item.task_item_uuid),
    ...changedAttachments.map((attachment) => attachment.task_item_uuid),
  ]);

  if (task.sync_status === 'synced' && includedTaskItemIds.size === 0) {
    return null;
  }

  const attachmentsByTaskItem = new Map<string, OfflineSyncAttachmentPayload[]>();
  for (const attachment of changedAttachments) {
    const list = attachmentsByTaskItem.get(attachment.task_item_uuid) || [];
    list.push({
      attachment_uuid: attachment.attachment_uuid,
      task_item_uuid: attachment.task_item_uuid,
      local_path: attachment.local_path,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      created_at: attachment.created_at,
      sync_status: attachment.sync_status,
    });
    attachmentsByTaskItem.set(attachment.task_item_uuid, list);
  }

  return {
    task_uuid: task.task_uuid,
    server_task_id: task.server_task_id,
    task_no: task.task_no,
    serial_no: task.serial_no,
    assigned_user_name: task.assigned_user_name,
    project_id: task.project_id,
    project_name: task.project_name,
    scheme_id: task.scheme_id,
    scheme_name: task.scheme_name,
    device_model: task.device_model,
    status: task.status,
    downloaded_at: task.downloaded_at,
    local_updated_at: task.local_updated_at,
    sync_status: task.sync_status,
    changed_item_count: changedItems.length,
    changed_attachment_count: changedAttachments.length,
    items: taskItems.filter((item) => includedTaskItemIds.has(item.task_item_uuid)).map((item) => ({
      task_item_uuid: item.task_item_uuid,
      server_item_id: item.server_item_id,
      source_type: item.source_type,
      item_name: item.item_name,
      category_path: item.category_path,
      execution_status: item.execution_status,
      is_normal: item.is_normal,
      is_recheck: item.is_recheck,
      local_updated_at: item.local_updated_at,
      sync_status: item.sync_status,
      task_result: parseOfflineResult(item.result),
      attachments: attachmentsByTaskItem.get(item.task_item_uuid) || [],
    })),
  };
}

export async function buildPendingSyncBatch(taskUuids?: string[]): Promise<OfflineSyncBatchPayload> {
  const tasks = await offlineTaskRepository.listAll();
  const taskUuidSet = taskUuids && taskUuids.length > 0 ? new Set(taskUuids) : null;
  const filteredTasks = taskUuidSet == null ? tasks : tasks.filter((task) => taskUuidSet.has(task.task_uuid));
  const payloads = await Promise.all(filteredTasks.map((task) => buildTaskSyncPayload(task.task_uuid)));
  const changedTasks = payloads.filter((task): task is OfflineSyncTaskPayload => task != null);

  return {
    protocol_version: '1.0',
    generated_at: nowIso(),
    sync_mode: 'delta',
    source: {
      app: 'predictive-maintenance-tablet',
      platform: currentPlatform(),
    },
    task_count: changedTasks.length,
    tasks: changedTasks,
  };
}

export async function previewPendingSyncBatch(taskUuids?: string[]): Promise<string> {
  const payload = await buildPendingSyncBatch(taskUuids);
  return JSON.stringify(payload, null, 2);
}

function resolvePendingChangeTaskUuid(
  entityType: string,
  entityUuid: string,
  taskAliases: Map<string, string>,
  taskItemToTask: Map<string, string>,
  attachmentToTask: Map<string, string>,
): string | null {
  if (entityType === 'task') {
    return taskAliases.get(entityUuid) ?? entityUuid;
  }
  if (entityType === 'task_item') {
    return taskItemToTask.get(entityUuid) ?? entityUuid.split(':')[0] ?? null;
  }
  if (entityType === 'attachment') {
    return attachmentToTask.get(entityUuid) ?? null;
  }
  return null;
}

export async function simulateUploadPendingSyncBatch(taskUuids?: string[]): Promise<{
  taskCount: number;
  changeCount: number;
}> {
  const [pendingChanges, localTasks, taskItems, attachments] = await Promise.all([
    offlineOutboxRepository.listPending(),
    offlineTaskRepository.listAll(),
    offlineTaskItemRepository.listAll(),
    offlineAttachmentRepository.listAll(),
  ]);

  const taskItemToTask = new Map(taskItems.map((item) => [item.task_item_uuid, item.task_uuid] as const));
  const attachmentToTask = new Map(
    attachments.map((attachment) => [
      attachment.attachment_uuid,
      taskItemToTask.get(attachment.task_item_uuid) ?? attachment.task_item_uuid.split(':')[0] ?? '',
    ] as const),
  );

  if (pendingChanges.length === 0) {
    return {
      taskCount: 0,
      changeCount: 0,
    };
  }

  const localTaskMap = new Map(
    localTasks.flatMap((task) => {
      const keys = [task.task_uuid];
      if (task.server_task_id) {
        keys.push(task.server_task_id);
      }
      return keys.map((key) => [key, task.task_uuid] as const);
    }),
  );
  const selectedTaskSet = taskUuids && taskUuids.length > 0 ? new Set(taskUuids) : null;
  const selectedChanges = selectedTaskSet == null
    ? pendingChanges
    : pendingChanges.filter((change) => {
      const taskUuid = resolvePendingChangeTaskUuid(
        change.entity_type,
        change.entity_uuid,
        localTaskMap,
        taskItemToTask,
        attachmentToTask,
      );
      return taskUuid != null && selectedTaskSet.has(taskUuid);
    });
  const affectedTaskUuids = new Set<string>();

  if (selectedChanges.length === 0) {
    return {
      taskCount: 0,
      changeCount: 0,
    };
  }

  for (const change of selectedChanges) {
    if (change.entity_type === 'task_item') {
      await offlineTaskItemRepository.markSynced(change.entity_uuid);
      const taskUuid = taskItemToTask.get(change.entity_uuid) ?? change.entity_uuid.split(':')[0];
      if (taskUuid) {
        affectedTaskUuids.add(taskUuid);
      }
    } else if (change.entity_type === 'task') {
      const taskUuid = localTaskMap.get(change.entity_uuid) ?? change.entity_uuid;
      if (taskUuid) {
        affectedTaskUuids.add(taskUuid);
      }
    } else if (change.entity_type === 'attachment') {
      await offlineAttachmentRepository.markSynced(change.entity_uuid);
      const taskUuid = attachmentToTask.get(change.entity_uuid) ?? null;
      if (taskUuid) {
        affectedTaskUuids.add(taskUuid);
      }
    }

    await offlineOutboxRepository.markStatus(change.op_id, 'synced');
  }

  const remainingPending = await offlineOutboxRepository.listPending();
  const remainingPendingTaskUuids = new Set(
    remainingPending
      .map((change) => resolvePendingChangeTaskUuid(
        change.entity_type,
        change.entity_uuid,
        localTaskMap,
        taskItemToTask,
        attachmentToTask,
      ))
      .filter((taskUuid): taskUuid is string => !!taskUuid),
  );

  for (const taskUuid of affectedTaskUuids) {
    if (!remainingPendingTaskUuids.has(taskUuid)) {
      await offlineTaskRepository.markUploaded(taskUuid);
    }
  }

  return {
    taskCount: affectedTaskUuids.size,
    changeCount: selectedChanges.length,
  };
}

export async function submitPendingSyncBatch(): Promise<never> {
  throw new Error('离线同步接口尚未接入，当前仅支持构造同步 payload。');
}