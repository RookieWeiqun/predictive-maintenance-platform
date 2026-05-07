import { Directory, Filesystem } from '@capacitor/filesystem';
import { offlineAttachmentRepository } from '../repositories/attachmentRepository';
import { offlineTaskItemRepository } from '../repositories/taskItemRepository';
import { offlineOutboxRepository } from '../repositories/outboxRepository';
import { offlineTaskRepository } from '../repositories/taskRepository';
import { nowChinaDateTime, nowChinaTimestamptz, toChinaTimestamptz } from '../utils/dateTime';
import { attachmentsApi, inspectionTasksApi } from '@/api';

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
  assigned_user_id: string | null;
  download_device_name: string | null;
  project_id: string | null;
  project_name: string | null;
  scheme_id: string | null;
  scheme_name: string | null;
  product_id: string | null;
  inspection_type: string | null;
  version: number | null;
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
  return nowChinaDateTime();
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
    assigned_user_id: task.assigned_user_id,
    download_device_name: task.download_device_name,
    project_id: task.project_id,
    project_name: task.project_name,
    scheme_id: task.scheme_id,
    scheme_name: task.scheme_name,
    product_id: task.product_id,
    inspection_type: task.inspection_type,
    version: task.version,
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

function toOptionalNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function requireNumber(value: string | number | null | undefined, fieldLabel: string): number {
  const normalized = toOptionalNumber(value);
  if (normalized == null) {
    throw new Error(`上传任务失败：缺少 ${fieldLabel}`);
  }
  return normalized;
}

function getUploadTaskVersion(localVersion: number | null | undefined): number | null {
  if (typeof localVersion !== 'number' || !Number.isFinite(localVersion)) {
    return null;
  }
  return localVersion;
}

function mapExecutionStatusToBackend(status: string): number {
  if (status === 'completed') return 2;
  if (status === 'skipped') return 3;
  if (status === 'not_applicable') return 4;
  if (status === 'recheck_required') return 5;
  return 1;
}

function mapSourceTypeToBackend(sourceType: string): number {
  return sourceType === 'manual_added' ? 2 : 1;
}

function getServerItemId(taskItemUuid: string, serverItemId: string | null): string {
  if (serverItemId && serverItemId.trim()) {
    return serverItemId;
  }
  const parts = taskItemUuid.split(':');
  return parts.length > 1 ? parts.slice(1).join(':') : taskItemUuid;
}

function getAttachmentFileName(localPath: string, attachmentUuid: string, mimeType: string | null): string {
  const fromPath = localPath.split('/').pop()?.trim();
  if (fromPath) {
    return fromPath;
  }
  if (mimeType === 'image/png') {
    return `${attachmentUuid}.png`;
  }
  if (mimeType === 'image/webp') {
    return `${attachmentUuid}.webp`;
  }
  return `${attachmentUuid}.jpg`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function readAttachmentAsFile(attachment: OfflineSyncAttachmentPayload): Promise<File> {
  const result = await Filesystem.readFile({
    path: attachment.local_path,
    directory: Directory.Data,
  });

  const mimeType = attachment.mime_type || 'image/jpeg';
  const fileName = getAttachmentFileName(
    attachment.local_path,
    attachment.attachment_uuid,
    attachment.mime_type,
  );

  if (result.data instanceof Blob) {
    return new File([result.data], fileName, { type: mimeType });
  }

  const bytes = base64ToUint8Array(result.data);
  return new File([bytes], fileName, { type: mimeType });
}

function getRecheckValue(dataFields: Record<string, unknown> | null): string | null {
  if (!dataFields) {
    return null;
  }
  const value = dataFields.recheckvalue ?? dataFields.recheckValue;
  if (value == null || value === '') {
    return null;
  }
  return String(value);
}

function buildBackendTaskResult(raw: string | null): string | null {
  const parsed = parseOfflineResult(raw);
  const payload = {
    value: parsed.value,
    recheckvalue: getRecheckValue(parsed.data_fields),
    remarks: parsed.remarks ?? '',
    resultState: parsed.result,
  };

  if (!payload.value && !payload.recheckvalue && !payload.remarks && !payload.resultState) {
    return null;
  }

  return JSON.stringify(payload);
}

async function markTaskChangesSynced(
  taskUuid: string,
  uploadedAt: string,
  uploadedTaskVersion?: number | null,
): Promise<void> {
  const [taskItems, pendingOutbox, attachments] = await Promise.all([
    offlineTaskItemRepository.listByTaskUuid(taskUuid),
    offlineOutboxRepository.listAll(),
    offlineAttachmentRepository.listAll(),
  ]);

  const taskItemIds = new Set(taskItems.map((item) => item.task_item_uuid));

  for (const item of taskItems) {
    if (item.sync_status !== 'synced') {
      await offlineTaskItemRepository.markSynced(item.task_item_uuid, uploadedAt);
    }
  }

  for (const attachment of attachments) {
    if (taskItemIds.has(attachment.task_item_uuid) && attachment.sync_status !== 'synced') {
      await offlineAttachmentRepository.markSynced(attachment.attachment_uuid);
    }
  }

  for (const change of pendingOutbox) {
    const belongsToTask = change.entity_type === 'task'
      ? change.entity_uuid === taskUuid
      : change.entity_type === 'task_item'
        ? taskItemIds.has(change.entity_uuid)
        : change.entity_type === 'attachment'
          ? attachments.some((attachment) => attachment.attachment_uuid === change.entity_uuid && taskItemIds.has(attachment.task_item_uuid))
          : false;
    if (belongsToTask && change.status !== 'synced') {
      await offlineOutboxRepository.markStatus(change.op_id, 'synced');
    }
  }

  await offlineTaskRepository.markUploaded(taskUuid, uploadedAt, uploadedTaskVersion);
}

async function markTaskChangesFailed(taskUuid: string, message: string): Promise<void> {
  const [taskItems, pendingOutbox, attachments] = await Promise.all([
    offlineTaskItemRepository.listByTaskUuid(taskUuid),
    offlineOutboxRepository.listAll(),
    offlineAttachmentRepository.listAll(),
  ]);

  const taskItemIds = new Set(taskItems.map((item) => item.task_item_uuid));
  const taskAttachmentIds = new Set(
    attachments
      .filter((attachment) => taskItemIds.has(attachment.task_item_uuid))
      .map((attachment) => attachment.attachment_uuid),
  );

  for (const change of pendingOutbox) {
    const belongsToTask = change.entity_type === 'task'
      ? change.entity_uuid === taskUuid
      : change.entity_type === 'task_item'
        ? taskItemIds.has(change.entity_uuid)
        : change.entity_type === 'attachment'
          ? taskAttachmentIds.has(change.entity_uuid)
          : false;
    if (belongsToTask) {
      await offlineOutboxRepository.markStatus(change.op_id, 'failed', message);
    }
  }
}

async function uploadSingleTask(taskUuid: string): Promise<boolean> {
  const task = await offlineTaskRepository.getByTaskUuid(taskUuid);
  if (task == null) {
    return false;
  }

  const payload = await buildTaskSyncPayload(taskUuid);
  if (payload == null) {
    return false;
  }

  const serverTaskId = requireNumber(task.server_task_id, '任务 ID');
  const serverDetail = await inspectionTasksApi.getInspectionTaskDetail(serverTaskId);
  const taskItems = await offlineTaskItemRepository.listByTaskUuid(taskUuid);
  const attachmentsByTaskItem = new Map<string, OfflineSyncAttachmentPayload[]>();

  for (const item of payload.items) {
    if (item.attachments.length > 0) {
      attachmentsByTaskItem.set(item.task_item_uuid, item.attachments);
    }
  }

  const serverTask = serverDetail.task;
  const serverItemsById = new Map(
    serverDetail.task_items.map((item) => [String(item.item_id), item] as const),
  );
  const uploadTaskVersion = getUploadTaskVersion(task.version);
  const uploadedAt = nowIso();
  const backendUploadedAt = nowChinaTimestamptz();

  const detailPayload = {
    task: {
      taskid: serverTaskId,
      projectid: requireNumber(task.project_id ?? serverTask.project_id, '项目 ID'),
      templateid: requireNumber(task.scheme_id ?? serverTask.template_id, '模板 ID'),
      status: 3,
      taskNo: task.task_no ?? serverTask.task_no ?? null,
      assigneduserid: toOptionalNumber(task.assigned_user_id ?? serverTask.assigned_user_id),
      productid: requireNumber(task.product_id ?? serverTask.product_id, '产品 ID'),
      inspectiontype: requireNumber(task.inspection_type ?? serverTask.inspection_type, '巡检类型'),
      ifdel: false,
      version: uploadTaskVersion,
      downloadedAt: toChinaTimestamptz(task.downloaded_at),
      localUpdatedAt: backendUploadedAt,
      downloadDeviceName: task.download_device_name ?? serverTask.download_device_name ?? null,
      serialno: task.serial_no ?? serverTask.serial_no ?? null,
      assignedusername: task.assigned_user_name ?? serverTask.assigned_user_name ?? null,
    },
    taskitems: taskItems.map((item) => {
      const serverItemId = getServerItemId(item.task_item_uuid, item.server_item_id);
      const serverItem = serverItemsById.get(serverItemId);
      return {
        itemid: serverItemId,
        taskid: serverTaskId,
        taskname: item.item_name || serverItem?.item_name || null,
        categorypath: item.category_path ?? serverItem?.category_path ?? null,
        taskresult: buildBackendTaskResult(item.result),
        isnormal: item.is_normal,
        isrecheck: item.is_recheck,
        photopath: null,
        executionStatus: mapExecutionStatusToBackend(item.execution_status),
        updatetime: backendUploadedAt,
        sourceType: mapSourceTypeToBackend(item.source_type),
        inspectionitemid: toOptionalNumber(serverItem?.source_inspection_item_id ?? null),
      };
    }),
  };

  for (const item of taskItems) {
    const pendingAttachments = attachmentsByTaskItem.get(item.task_item_uuid) ?? [];
    if (pendingAttachments.length === 0) {
      continue;
    }

    const serverItemId = getServerItemId(item.task_item_uuid, item.server_item_id);
    const files = await Promise.all(pendingAttachments.map((attachment) => readAttachmentAsFile(attachment)));
    await attachmentsApi.uploadAttachmentFiles(serverItemId, serverTaskId, files);
  }

  await inspectionTasksApi.putInspectionTaskDetail(serverTaskId, detailPayload);
  await inspectionTasksApi.updateInspectionTask({
    taskid: serverTaskId,
    projectid: requireNumber(task.project_id ?? serverTask.project_id, '项目 ID'),
    templateid: requireNumber(task.scheme_id ?? serverTask.template_id, '模板 ID'),
    status: 3,
    taskNo: task.task_no ?? serverTask.task_no ?? null,
    assigneduserid: toOptionalNumber(task.assigned_user_id ?? serverTask.assigned_user_id) ?? null,
    assignedusername: task.assigned_user_name ?? serverTask.assigned_user_name ?? null,
    productid: requireNumber(task.product_id ?? serverTask.product_id, '产品 ID'),
    inspectiontype: requireNumber(task.inspection_type ?? serverTask.inspection_type, '巡检类型'),
    ifdel: false,
    serialno: task.serial_no ?? serverTask.serial_no ?? null,
    version: uploadTaskVersion,
    downloadedAt: toChinaTimestamptz(task.downloaded_at),
    localUpdatedAt: backendUploadedAt,
    downloadDeviceName: task.download_device_name ?? serverTask.download_device_name ?? null,
  });
  await markTaskChangesSynced(taskUuid, uploadedAt, uploadTaskVersion);
  return true;
}

export async function uploadPendingTasks(taskUuids?: string[]): Promise<{
  taskCount: number;
  changeCount: number;
}> {
  const batch = await buildPendingSyncBatch(taskUuids);
  if (batch.tasks.length === 0) {
    return {
      taskCount: 0,
      changeCount: 0,
    };
  }

  let uploadedTaskCount = 0;
  let uploadedChangeCount = 0;

  for (const task of batch.tasks) {
    try {
      const uploaded = await uploadSingleTask(task.task_uuid);
      if (!uploaded) {
        continue;
      }
      uploadedTaskCount += 1;
      uploadedChangeCount += task.changed_item_count + task.changed_attachment_count + (task.sync_status === 'synced' ? 0 : 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传任务失败';
      await markTaskChangesFailed(task.task_uuid, message);
      throw error;
    }
  }

  return {
    taskCount: uploadedTaskCount,
    changeCount: uploadedChangeCount,
  };
}