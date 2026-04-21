import type { OfflineTaskItemUpsert, OfflineTaskUpsert } from '../types';
import { offlineTaskItemRepository } from '../repositories/taskItemRepository';
import { offlineTaskRepository } from '../repositories/taskRepository';
import {
  inspectionTasksApi,
  inspectionTemplatesApi,
  productsApi,
  taskitemsApi,
} from '@/api';
import { getSchemeById } from '@/mockdata/scheme';
import tasksData from '@/mockdata/task/tasks.json';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import { isDetectionItem, type SchemeItem } from '@/pages/scheme/utils/schemeUtils';

interface MockTask {
  id: string;
  projectId: string;
  projectName: string;
  schemeId: string;
  schemeName: string;
  deviceModel: string;
  status: string;
}

type DownloadTaskPackageOptions = {
  projectName?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function joinCategoryPath(path: string[], name: string): string | null {
  const values = [...path, name].filter(Boolean);
  return values.length > 0 ? values.join(' / ') : null;
}

function mapInspectionStatusToOfflineStatus(code: number): string {
  if (code === 1) return 'in-progress';
  if (code === 2) return 'completed';
  if (code === 3) return 'pending';
  return 'pending';
}

function mapBackendResultToUi(raw: string | null | undefined): '' | 'normal' | 'warning' | 'abnormal' {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return '';
  if (value === 'normal' || value === '正常') return 'normal';
  if (value === 'warning' || value === '警告') return 'warning';
  if (value === 'abnormal' || value === '异常') return 'abnormal';
  return '';
}

function buildOfflineResultPayload(result: string | null | undefined): string | null {
  const mapped = mapBackendResultToUi(result);
  if (!mapped) {
    return null;
  }

  return JSON.stringify({
    result: mapped,
    remarks: '',
    dataFields: {},
  });
}

function flattenTemplateItems(items: SchemeItem[], path: string[] = []): Array<{
  itemId: string;
  itemName: string;
  categoryPath: string | null;
}> {
  const result: Array<{
    itemId: string;
    itemName: string;
    categoryPath: string | null;
  }> = [];

  for (const item of items) {
    if (isDetectionItem(item)) {
      result.push({
        itemId: item.id,
        itemName: (item.name || '').trim() || '未命名任务项',
        categoryPath: path.length > 0 ? path.join(' / ') : null,
      });
      continue;
    }

    const label = (item.name || '').trim();
    const nextPath = label ? [...path, label] : path;
    if (Array.isArray(item.children) && item.children.length > 0) {
      result.push(...flattenTemplateItems(item.children, nextPath));
    }
  }

  return result;
}

function serverTaskitemKey(name: string | null | undefined, categoryPath: string | null | undefined): string {
  return `${(name ?? '').trim()}@@${(categoryPath ?? '').trim()}`;
}

function flattenSchemeItems(taskUuid: string, items: any[], path: string[] = []): OfflineTaskItemUpsert[] {
  const result: OfflineTaskItemUpsert[] = [];

  for (const item of items) {
    const itemName = typeof item?.name === 'string' ? item.name : '';
    const nextPath = itemName ? [...path, itemName] : path;

    if (item?.type && item?.required !== undefined) {
      const itemsToProcess = Array.isArray(item.children) && item.children.length > 0
        ? item.children.filter((child: any) => child?.type)
        : [item];

      for (const processItem of itemsToProcess) {
        const processItemName = typeof processItem?.name === 'string' ? processItem.name : '未命名任务项';
        result.push({
          task_item_uuid: `${taskUuid}:${processItem.id}`,
          server_item_id: null,
          task_uuid: taskUuid,
          source_type: 'system_generated',
          item_name: processItemName,
          category_path: joinCategoryPath(path, itemName),
          result: null,
          execution_status: 'pending',
          is_normal: false,
          is_recheck: false,
          sync_status: 'synced',
          local_updated_at: nowIso(),
        });
      }
    }

    if (Array.isArray(item?.children) && item.children.length > 0) {
      result.push(...flattenSchemeItems(taskUuid, item.children, nextPath));
    }
  }

  return result;
}

function buildOfflineTask(task: MockTask): OfflineTaskUpsert {
  const timestamp = nowIso();
  return {
    task_uuid: task.id,
    server_task_id: task.id,
    task_no: task.id,
    project_id: task.projectId,
    project_name: task.projectName,
    scheme_id: task.schemeId,
    scheme_name: task.schemeName,
    device_model: task.deviceModel,
    status: task.status,
    downloaded_at: timestamp,
    local_updated_at: timestamp,
    sync_status: 'synced',
  };
}

async function downloadServerTaskPackage(
  taskId: number,
  options?: DownloadTaskPackageOptions,
): Promise<{ taskCount: number; itemCount: number }> {
  const [task, template, taskitems, templateRoots] = await Promise.all([
    inspectionTasksApi.getInspectionTask(taskId),
    inspectionTasksApi.getInspectionTask(taskId).then((dto) =>
      inspectionTemplatesApi.getInspectionTemplate(dto.templateid),
    ),
    taskitemsApi.listTaskitemsByTask(taskId).catch(() => []),
    inspectionTasksApi.getInspectionTask(taskId).then((dto) =>
      loadTemplateItemsByTemplateId(dto.templateid),
    ),
  ]);

  const products = await productsApi.searchProducts({ productid: task.productid }).catch(() => []);
  const product = products[0];
  const taskUuid = String(task.taskid ?? taskId);
  const taskNo = (task.taskNo ?? '').trim() || `任务#${taskUuid}`;

  await offlineTaskRepository.upsert({
    task_uuid: taskUuid,
    server_task_id: taskUuid,
    task_no: taskNo,
    project_id: String(task.projectid),
    project_name: options?.projectName ?? null,
    scheme_id: String(task.templateid),
    scheme_name: template.name?.trim() || `模板 #${task.templateid}`,
    device_model: product?.mlfb?.trim() || '-',
    status: mapInspectionStatusToOfflineStatus(task.status),
    downloaded_at: nowIso(),
    local_updated_at: nowIso(),
    sync_status: 'synced',
  });

  const serverTaskitems = new Map(
    taskitems.map((item) => [serverTaskitemKey(item.name, item.categorypath), item]),
  );

  const offlineItems = flattenTemplateItems(templateRoots).map<OfflineTaskItemUpsert>((item) => {
    const matched = serverTaskitems.get(serverTaskitemKey(item.itemName, item.categoryPath));
    const resultPayload = buildOfflineResultPayload(matched?.result);
    const mappedResult = mapBackendResultToUi(matched?.result);

    return {
      task_item_uuid: `${taskUuid}:${item.itemId}`,
      server_item_id: matched?.itemid ?? null,
      task_uuid: taskUuid,
      source_type: 'system_generated',
      item_name: item.itemName,
      category_path: item.categoryPath,
      result: resultPayload,
      execution_status: mappedResult ? 'completed' : 'pending',
      is_normal: mappedResult === 'normal',
      is_recheck: matched?.isrecheck ?? false,
      sync_status: 'synced',
      local_updated_at: nowIso(),
    };
  });

  for (const item of offlineItems) {
    const existing = await offlineTaskItemRepository.getByTaskItemUuid(item.task_item_uuid);
    if (existing?.sync_status === 'pending') {
      continue;
    }
    await offlineTaskItemRepository.upsert(item);
  }

  return { taskCount: 1, itemCount: offlineItems.length };
}

export async function downloadTaskPackage(
  taskId: string,
  options?: DownloadTaskPackageOptions,
): Promise<{ taskCount: number; itemCount: number }> {
  const numericTaskId = Number.parseInt(taskId, 10);
  if (Number.isFinite(numericTaskId) && numericTaskId > 0) {
    return downloadServerTaskPackage(numericTaskId, options);
  }

  const task = tasksData.tasks.find((current) => current.id === taskId);
  if (task == null) {
    throw new Error(`未找到任务 ${taskId}`);
  }

  const scheme = getSchemeById(task.schemeId);
  if (scheme?.items == null) {
    throw new Error(`任务 ${taskId} 未找到对应方案 ${task.schemeId}`);
  }

  await offlineTaskRepository.upsert(buildOfflineTask(task));
  const taskItems = flattenSchemeItems(task.id, scheme.items);
  for (const item of taskItems) {
    const existing = await offlineTaskItemRepository.getByTaskItemUuid(item.task_item_uuid);
    if (existing?.sync_status === 'pending') {
      continue;
    }
    await offlineTaskItemRepository.upsert(item);
  }

  return { taskCount: 1, itemCount: taskItems.length };
}

export async function downloadAllTaskPackages(): Promise<{ taskCount: number; itemCount: number }> {
  let taskCount = 0;
  let itemCount = 0;
  for (const task of tasksData.tasks) {
    const downloaded = await downloadTaskPackage(task.id);
    taskCount += downloaded.taskCount;
    itemCount += downloaded.itemCount;
  }
  return { taskCount, itemCount };
}
