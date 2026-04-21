import type { OfflineTaskItemUpsert, OfflineTaskUpsert } from '../types';
import { offlineTaskItemRepository } from '../repositories/taskItemRepository';
import { offlineTaskRepository } from '../repositories/taskRepository';
import { getSchemeById } from '@/mockdata/scheme';
import tasksData from '@/mockdata/task/tasks.json';

interface MockTask {
  id: string;
  projectId: string;
  projectName: string;
  schemeId: string;
  schemeName: string;
  deviceModel: string;
  status: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function joinCategoryPath(path: string[], name: string): string | null {
  const values = [...path, name].filter(Boolean);
  return values.length > 0 ? values.join(' / ') : null;
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

export async function downloadTaskPackage(taskId: string): Promise<{ taskCount: number; itemCount: number }> {
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
