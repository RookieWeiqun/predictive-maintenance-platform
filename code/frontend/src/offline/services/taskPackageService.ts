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

type DemoProjectTaskInput = {
  taskId: number;
  taskNo: string;
  projectId: string;
  projectName: string;
  templateId: string;
  templateName: string;
  deviceModel: string;
  assignedUserId?: number | null;
};

type TaskPackageTaskDto = {
  task_id: number;
  task_uuid: string;
  task_no: string;
  project_id: number | string;
  project_name: string;
  template_id: number | string;
  template_name: string;
  inspection_type?: number;
  status?: number | string;
  assigned_user_id?: number | null;
  download_version?: number;
  product_snapshot?: {
    product_id?: number | string | null;
    mlfb?: string | null;
    serialno?: string | null;
  } | null;
};

type TaskPackageResultDto = {
  value?: string | null;
  remarks?: string | null;
};

type TaskPackageItemDto = {
  item_id: string;
  source_type?: 'system_generated' | 'manual_added';
  source_inspection_item_id?: number | string | null;
  item_name: string;
  category_path?: string | null;
  execution_status?: string | null;
  is_normal?: boolean | null;
  is_recheck?: boolean | null;
  version?: number | null;
  updated_at?: string | null;
  render_schema_json?: {
    value_type?: string | null;
    rule_type?: string | null;
    threshold?: {
      min?: number | null;
      max?: number | null;
      unit?: string | null;
    } | null;
    sort_order?: number | null;
    priority?: string | null;
  } | null;
  task_result?: TaskPackageResultDto | null;
  taskresult?: TaskPackageResultDto | null;
};

type TaskPackageResponse = {
  code: number;
  msg: string;
  data: {
    task: TaskPackageTaskDto;
    task_items: TaskPackageItemDto[];
  };
};

type DownloadTaskPackageOptions = {
  projectName?: string | null;
  deviceModel?: string | null;
};

function getTaskSchemeStorageKey(taskUuid: string, schemeId: string): string {
  return `task_scheme_${taskUuid}_${schemeId}`;
}

function writeTaskSchemeCache(taskUuid: string, schemeId: string, items: SchemeItem[]): void {
  try {
    localStorage.setItem(
      getTaskSchemeStorageKey(taskUuid, schemeId),
      JSON.stringify({
        items,
        offlineSource: 'task-package',
        cachedAt: nowIso(),
      }),
    );
  } catch (error) {
    console.warn('写入离线任务模板缓存失败', error);
  }
}

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

function mapValueTypeToSchemeType(valueType: string | null | undefined): string {
  const normalized = (valueType ?? '').trim().toLowerCase();
  if (normalized === 'number' || normalized === 'numeric') {
    return 'environment';
  }
  if (normalized === 'boolean' || normalized === 'bool') {
    return 'functional';
  }
  return 'visual';
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

function buildOfflineResultPayloadFromTaskResult(taskResult: TaskPackageResultDto | null | undefined): string | null {
  if (taskResult == null) {
    return null;
  }

  const value = typeof taskResult.value === 'string' ? taskResult.value : null;
  const hasValue = value != null && value !== '';
  const remarks = taskResult.remarks ?? '';
  if (!hasValue && !remarks) {
    return null;
  }

  return JSON.stringify({
    value,
    remarks,
  });
}

function createSchemeCacheFromPackageItems(taskItems: TaskPackageItemDto[]): SchemeItem[] {
  const roots = new Map<string, SchemeItem>();

  for (const item of taskItems) {
    const pathParts = String(item.category_path ?? '离线任务 / 默认分组')
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    const normalizedPath = pathParts.length > 0 ? pathParts : ['离线任务', '默认分组'];
    let currentChildren = roots;
    let parentNode: SchemeItem | null = null;
    let prefix = 'pkg';

    for (const part of normalizedPath) {
      prefix = `${prefix}:${part}`;
      const existing = currentChildren.get(prefix);
      if (existing) {
        parentNode = existing;
        const children = existing.children ?? [];
        const childMap = new Map(children.map((child) => [child.id, child]));
        currentChildren = childMap;
        existing.children = [...childMap.values()];
        continue;
      }

      const created: SchemeItem = {
        id: prefix,
        name: part,
        children: [],
      };

      currentChildren.set(prefix, created);
      if (parentNode) {
        parentNode.children = [...(parentNode.children ?? []), created];
      }
      parentNode = created;
      currentChildren = new Map<string, SchemeItem>();
      created.children = [];
    }

    const threshold = item.render_schema_json?.threshold;
    const leaf: SchemeItem = {
      id: item.item_id,
      name: item.item_name,
      type: mapValueTypeToSchemeType(item.render_schema_json?.value_type),
      required: true,
      ruleType: item.render_schema_json?.rule_type ?? undefined,
      priority: item.render_schema_json?.priority ?? undefined,
      minThreshold: threshold?.min ?? undefined,
      maxThreshold: threshold?.max ?? undefined,
      unit: threshold?.unit ?? undefined,
    };

    if (parentNode) {
      parentNode.children = [...(parentNode.children ?? []), leaf];
    } else {
      roots.set(leaf.id, leaf);
    }
  }

  return [...roots.values()];
}

function createDemoTaskPackage(input: DemoProjectTaskInput): TaskPackageResponse {
  const taskUuid = String(input.taskId);
  const baseCategory = '环境检查 / 柜体环境';
  return {
    code: 0,
    msg: 'ok',
    data: {
      task: {
        task_id: input.taskId,
        task_uuid: taskUuid,
        task_no: input.taskNo,
        project_id: input.projectId,
        project_name: input.projectName,
        template_id: input.templateId,
        template_name: input.templateName,
        inspection_type: 1,
        status: 3,
        assigned_user_id: input.assignedUserId ?? null,
        download_version: 1,
        product_snapshot: {
          product_id: null,
          mlfb: input.deviceModel,
          serialno: null,
        },
      },
      task_items: [
        {
          item_id: `${taskUuid}-temperature`,
          source_type: 'system_generated',
          source_inspection_item_id: null,
          item_name: '柜内温度',
          category_path: baseCategory,
          execution_status: 'pending',
          is_normal: false,
          is_recheck: false,
          version: 1,
          updated_at: nowIso(),
          render_schema_json: {
            value_type: 'number',
            rule_type: 'number_range',
            threshold: {
              min: 10,
              max: 40,
              unit: '℃',
            },
            sort_order: 10,
            priority: 'High',
          },
          task_result: {
            value: null,
            remarks: null,
          },
        },
        {
          item_id: `${taskUuid}-humidity`,
          source_type: 'system_generated',
          source_inspection_item_id: null,
          item_name: '柜内湿度',
          category_path: baseCategory,
          execution_status: 'pending',
          is_normal: false,
          is_recheck: false,
          version: 1,
          updated_at: nowIso(),
          render_schema_json: {
            value_type: 'number',
            rule_type: 'number_range',
            threshold: {
              min: 20,
              max: 80,
              unit: '%',
            },
            sort_order: 20,
            priority: 'Medium',
          },
          task_result: {
            value: null,
            remarks: null,
          },
        },
        {
          item_id: `${taskUuid}-condensation`,
          source_type: 'system_generated',
          source_inspection_item_id: null,
          item_name: '柜内是否凝露',
          category_path: baseCategory,
          execution_status: 'pending',
          is_normal: false,
          is_recheck: false,
          version: 1,
          updated_at: nowIso(),
          render_schema_json: {
            value_type: 'boolean',
            rule_type: 'boolean',
            threshold: null,
            sort_order: 30,
            priority: 'High',
          },
          task_result: {
            value: null,
            remarks: null,
          },
        },
      ],
    },
  };
}

async function downloadTaskPackageFromResponse(
  response: TaskPackageResponse,
  options?: DownloadTaskPackageOptions,
): Promise<{ taskCount: number; itemCount: number }> {
  const task = response.data.task;
  const taskItems = response.data.task_items ?? [];
  const taskUuid = String(task.task_uuid || task.task_id);
  const taskNo = String(task.task_no || taskUuid).trim() || `任务#${taskUuid}`;
  const schemeId = String(task.template_id || '');
  const schemeCache = createSchemeCacheFromPackageItems(taskItems);

  writeTaskSchemeCache(taskUuid, schemeId, schemeCache);

  await offlineTaskRepository.upsert({
    task_uuid: taskUuid,
    server_task_id: String(task.task_id),
    task_no: taskNo,
    project_id: String(task.project_id),
    project_name: options?.projectName ?? task.project_name ?? null,
    scheme_id: schemeId,
    scheme_name: task.template_name?.trim() || `模板 #${schemeId}`,
    device_model: task.product_snapshot?.mlfb?.trim() || options?.deviceModel || '-',
    status: 'downloaded',
    downloaded_at: nowIso(),
    local_updated_at: nowIso(),
    sync_status: 'synced',
  });

  const offlineItems = taskItems.map<OfflineTaskItemUpsert>((item) => ({
    task_item_uuid: `${taskUuid}:${item.item_id}`,
    server_item_id: item.item_id,
    task_uuid: taskUuid,
    source_type: item.source_type ?? 'system_generated',
    item_name: item.item_name,
    category_path: item.category_path ?? null,
    result: buildOfflineResultPayloadFromTaskResult(item.task_result ?? item.taskresult),
    execution_status: item.execution_status === 'completed' ? 'completed' : 'pending',
    is_normal: Boolean(item.is_normal),
    is_recheck: Boolean(item.is_recheck),
    sync_status: 'synced',
    local_updated_at: item.updated_at ?? nowIso(),
  }));

  for (const item of offlineItems) {
    const existing = await offlineTaskItemRepository.getByTaskItemUuid(item.task_item_uuid);
    if (existing?.sync_status === 'pending') {
      continue;
    }
    await offlineTaskItemRepository.upsert(item);
  }

  return { taskCount: 1, itemCount: offlineItems.length };
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

function apiTemplateRootsToCollectSchemeItems(roots: SchemeItem[]): SchemeItem[] {
  const leaves: SchemeItem[] = [];

  function walk(nodes: SchemeItem[]): void {
    for (const node of nodes || []) {
      if (isDetectionItem(node)) {
        leaves.push(node);
        continue;
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }

  walk(roots);
  if (leaves.length === 0) {
    return [];
  }

  return [
    {
      id: 'api-collect-category',
      name: '巡检任务',
      children: [
        {
          id: 'api-collect-sub',
          name: '全部模块',
          children: [
            {
              id: 'api-collect-module',
              name: '检测项',
              children: leaves,
            },
          ],
        },
      ],
    },
  ];
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
  const schemeId = String(task.templateid);
  const taskNo = (task.taskNo ?? '').trim() || `任务#${taskUuid}`;

  writeTaskSchemeCache(taskUuid, schemeId, apiTemplateRootsToCollectSchemeItems(templateRoots));

  await offlineTaskRepository.upsert({
    task_uuid: taskUuid,
    server_task_id: taskUuid,
    task_no: taskNo,
    project_id: String(task.projectid),
    project_name: options?.projectName ?? null,
    scheme_id: schemeId,
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

  writeTaskSchemeCache(task.id, task.schemeId, scheme.items);

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

export async function downloadDemoProjectTaskPackages(
  tasks: DemoProjectTaskInput[],
): Promise<{ taskCount: number; itemCount: number }> {
  let taskCount = 0;
  let itemCount = 0;

  for (const task of tasks) {
    const response = createDemoTaskPackage(task);
    const downloaded = await downloadTaskPackageFromResponse(response, {
      projectName: task.projectName,
      deviceModel: task.deviceModel,
    });
    taskCount += downloaded.taskCount;
    itemCount += downloaded.itemCount;
  }

  return { taskCount, itemCount };
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
