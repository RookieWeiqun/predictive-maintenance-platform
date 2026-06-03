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
import { decodeDisplayCondition } from '@/pages/scheme/utils/displayConditionCodec';
import { isDetectionItem, type SchemeItem } from '@/pages/scheme/utils/schemeUtils';
import { normalizeChinaDateTime, nowChinaDateTime, nowChinaTimestamptz, toChinaTimestamptz } from '../utils/dateTime';

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
  product_id?: number | string | null;
  inspection_type?: number;
  status?: number | string;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  version?: number | null;
  downloaded_at?: string | null;
  local_updated_at?: string | null;
  download_device_name?: string | null;
  serial_no?: string | null;
};

type TaskPackageResultDto = {
  value?: string | null;
  remarks?: string | null;
  result_state?: string | null;
  hazardResolved?: boolean | null;
  hazard_resolved?: boolean | null;
  recommendationContent?: string | null;
  recommendation_content?: string | null;
  actionTaken?: string | null;
  action_taken?: string | null;
};

type TaskPackageItemDto = {
  item_id: string;
  itemId?: string;
  source_type?: 'system_generated' | 'manual_added';
  sourceType?: 'system_generated' | 'manual_added' | number | string;
  source_inspection_item_id?: number | string | null;
  sourceInspectionItemId?: number | string | null;
  item_name: string;
  taskname?: string;
  category_path?: string | null;
  categorypath?: string | null;
  sort_order?: number | null;
  sortOrder?: number | null;
  execution_status?: string | null;
  executionStatus?: string | number | null;
  is_normal?: boolean | null;
  isnormal?: boolean | number | null;
  is_recheck?: boolean | null;
  isrecheck?: boolean | number | null;
  version?: number | null;
  updated_at?: string | null;
  updatetime?: string | null;
  render_schema_json?: {
    value_type?: string | null;
    valueType?: string | null;
    rule_type?: string | null;
    ruleType?: string | null;
    threshold?: Record<string, unknown> | null;
    sort_order?: number | null;
    sortOrder?: number | null;
    priority?: string | null;
    display_condition?: string | null;
    displayCondition?: string | null;
    operation_guide?: string | null;
    operationGuide?: string | null;
    suggestion_rule?: string | null;
    suggestionRule?: string | null;
    suggestion_content?: string | null;
    suggestionContent?: string | null;
    hazard_content?: string | null;
    hazardContent?: string | null;
    maintenance_description?: string | null;
    maintenanceDescription?: string | null;
  } | null;
  renderSchemaJson?: TaskPackageItemDto['render_schema_json'];
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

function serializeTaskSchemeSnapshot(items: SchemeItem[]): string {
  return JSON.stringify({
    items,
    offlineSource: 'sqlite-snapshot',
    cachedAt: nowIso(),
  });
}

function nowIso(): string {
  return nowChinaDateTime();
}

function joinCategoryPath(path: string[], name: string): string | null {
  const values = [...path, name].filter(Boolean);
  return values.length > 0 ? values.join(' / ') : null;
}

function mapTaskItemExecutionStatusToOfflineStatus(
  status: string | null | undefined,
): 'pending' | 'completed' | 'skipped' | 'not_applicable' | 'recheck_required' {
  if (status === 'completed') return 'completed';
  if (status === 'skipped') return 'skipped';
  if (status === 'not_applicable') return 'not_applicable';
  if (status === 'recheck_required') return 'recheck_required';
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

function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTaskPackageItemId(item: TaskPackageItemDto): string {
  return String(item.item_id ?? item.itemId ?? '').trim();
}

function getTaskPackageItemName(item: TaskPackageItemDto): string {
  return String(item.item_name ?? item.taskname ?? '').trim();
}

function getTaskPackageCategoryPath(item: TaskPackageItemDto): string | null {
  const value = item.category_path ?? item.categorypath ?? null;
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function getTaskPackageRenderSchema(item: TaskPackageItemDto): NonNullable<TaskPackageItemDto['render_schema_json']> | null {
  return item.render_schema_json ?? item.renderSchemaJson ?? null;
}

function getTaskPackageSortOrder(item: TaskPackageItemDto): number | null {
  const renderSchema = getTaskPackageRenderSchema(item);
  return (
    toOptionalNumber(item.sort_order)
    ?? toOptionalNumber(item.sortOrder)
    ?? toOptionalNumber(renderSchema?.sort_order)
    ?? toOptionalNumber(renderSchema?.sortOrder)
  );
}

function toOptionalBoolean(value: unknown): boolean | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  return null;
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
    hazardResolved:
      typeof taskResult.hazardResolved === 'boolean'
        ? taskResult.hazardResolved
        : typeof taskResult.hazard_resolved === 'boolean'
          ? taskResult.hazard_resolved
          : null,
    recommendationContent:
      taskResult.recommendationContent
      ?? taskResult.recommendation_content
      ?? '',
    actionTaken: taskResult.actionTaken ?? taskResult.action_taken ?? '',
  });
}

function buildInspectionTaskStatusUpdatePayload(
  response: TaskPackageResponse,
  status: number,
  downloadedAt?: string | null,
) {
  const task = response.data.task;
  const backendNow = nowChinaTimestamptz();

  return {
    taskid: task.task_id,
    projectid: Number(task.project_id),
    templateid: Number(task.template_id),
    status,
    taskNo: task.task_no ?? null,
    assigneduserid: task.assigned_user_id ?? null,
    productid: Number(task.product_id ?? 0),
    inspectiontype: Number(task.inspection_type ?? 0),
    ifdel: false,
    assignedusername: task.assigned_user_name ?? null,
    version: task.version ?? null,
    downloadedAt: downloadedAt ?? toChinaTimestamptz(task.downloaded_at),
    localUpdatedAt: backendNow,
    downloadDeviceName: task.download_device_name ?? null,
    serialno: task.serial_no ?? null,
  };
}

function createSchemeCacheFromPackageItems(taskItems: TaskPackageItemDto[]): SchemeItem[] {
  const roots = new Map<string, SchemeItem>();

  for (const item of taskItems) {
    const pathParts = String(getTaskPackageCategoryPath(item) ?? '离线任务 / 默认分组')
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

    const renderSchema = getTaskPackageRenderSchema(item);
    const threshold = renderSchema?.threshold;
    const leaf: SchemeItem = {
      id: getTaskPackageItemId(item),
      name: getTaskPackageItemName(item),
      sortOrder: getTaskPackageSortOrder(item) ?? undefined,
      type: mapValueTypeToSchemeType(renderSchema?.value_type ?? renderSchema?.valueType),
      dataType: renderSchema?.value_type ?? renderSchema?.valueType ?? undefined,
      required: true,
      ruleType: renderSchema?.rule_type ?? renderSchema?.ruleType ?? undefined,
      priority: renderSchema?.priority ?? undefined,
      displayCondition: decodeDisplayCondition(renderSchema?.display_condition ?? renderSchema?.displayCondition) || undefined,
      operationGuide: renderSchema?.operation_guide ?? renderSchema?.operationGuide ?? undefined,
      suggestionRule: renderSchema?.suggestion_rule ?? renderSchema?.suggestionRule ?? undefined,
      suggestionContent: renderSchema?.suggestion_content ?? renderSchema?.suggestionContent ?? undefined,
      hazardContent: renderSchema?.hazard_content ?? renderSchema?.hazardContent ?? undefined,
      maintenanceDescription: renderSchema?.maintenance_description ?? renderSchema?.maintenanceDescription ?? undefined,
      thresholdRaw: threshold ? JSON.stringify(threshold) : undefined,
      minThreshold: typeof threshold?.min === 'number' ? threshold.min : undefined,
      maxThreshold: typeof threshold?.max === 'number' ? threshold.max : undefined,
      unit: typeof threshold?.unit === 'string' ? threshold.unit : undefined,
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
        product_id: null,
        inspection_type: 1,
        status: 3,
        assigned_user_id: input.assignedUserId ?? null,
        assigned_user_name: null,
        version: 1,
        downloaded_at: nowIso(),
        local_updated_at: nowIso(),
        download_device_name: null,
        serial_no: null,
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
              precision: 0,
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
              precision: 0,
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
            rule_type: 'boolean_equal',
            threshold: {
              options: ['是', '否'],
              normal_value: '否',
            },
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

function buildDownloadedTaskVersion(version: number | null | undefined): number | null {
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    return null;
  }
  return version + 1;
}

async function downloadTaskPackageFromResponse(
  response: TaskPackageResponse,
  options?: DownloadTaskPackageOptions,
): Promise<{ taskCount: number; itemCount: number }> {
  const task = response.data.task;
  const taskItems = response.data.task_items ?? [];
  const isPeripheralTask = Number(task.inspection_type ?? 0) === 2;
  const taskUuid = String(task.task_uuid || task.task_id);
  const taskNo = String(task.task_no || taskUuid).trim() || `任务#${taskUuid}`;
  const schemeId = String(task.template_id || '');
  const schemeCache = createSchemeCacheFromPackageItems(taskItems);

  writeTaskSchemeCache(taskUuid, schemeId, schemeCache);

  await offlineTaskRepository.upsert({
    task_uuid: taskUuid,
    server_task_id: String(task.task_id),
    task_no: taskNo,
    serial_no: isPeripheralTask ? null : task.serial_no?.trim() || null,
    equipment_name: isPeripheralTask ? null : task.equipmentname?.trim() || null,
    equipment_number: isPeripheralTask ? null : task.equipmentnumber?.trim() || null,
    department: isPeripheralTask ? null : task.department?.trim() || null,
    assigned_user_name: task.assigned_user_name?.trim() || null,
    assigned_user_id: task.assigned_user_id != null ? String(task.assigned_user_id) : null,
    download_device_name: task.download_device_name?.trim() || null,
    project_id: String(task.project_id),
    project_name: options?.projectName ?? task.project_name ?? null,
    scheme_id: schemeId,
    scheme_name: task.template_name?.trim() || `模板 #${schemeId}`,
    product_id: task.product_id != null ? String(task.product_id) : null,
    inspection_type: task.inspection_type != null ? String(task.inspection_type) : null,
    version: buildDownloadedTaskVersion(task.version),
    device_model: options?.deviceModel || '-',
    scheme_snapshot_json: serializeTaskSchemeSnapshot(schemeCache),
    status: 'downloaded',
    downloaded_at: normalizeChinaDateTime(task.downloaded_at) ?? nowIso(),
    local_updated_at: normalizeChinaDateTime(task.local_updated_at) ?? normalizeChinaDateTime(task.downloaded_at) ?? nowIso(),
    sync_status: 'synced',
  });

  const offlineItems = taskItems.map<OfflineTaskItemUpsert>((item) => ({
    task_item_uuid: `${taskUuid}:${getTaskPackageItemId(item)}`,
    server_item_id: getTaskPackageItemId(item),
    task_uuid: taskUuid,
    source_type:
      item.source_type
      ?? (item.sourceType === 2 || item.sourceType === '2' ? 'manual_added' : 'system_generated'),
    item_name: getTaskPackageItemName(item),
    sort_order: getTaskPackageSortOrder(item),
    category_path: getTaskPackageCategoryPath(item),
    result: buildOfflineResultPayloadFromTaskResult(item.task_result ?? item.taskresult),
    display_condition: getTaskPackageRenderSchema(item)?.display_condition ?? getTaskPackageRenderSchema(item)?.displayCondition ?? null,
    operation_guide: getTaskPackageRenderSchema(item)?.operation_guide ?? getTaskPackageRenderSchema(item)?.operationGuide ?? null,
    recommended_rules: getTaskPackageRenderSchema(item)?.suggestion_rule ?? getTaskPackageRenderSchema(item)?.suggestionRule ?? null,
    recommendation_content: getTaskPackageRenderSchema(item)?.suggestion_content ?? getTaskPackageRenderSchema(item)?.suggestionContent ?? null,
    hidden_hazard_content: getTaskPackageRenderSchema(item)?.hazard_content ?? getTaskPackageRenderSchema(item)?.hazardContent ?? null,
    maintenance_instructions: getTaskPackageRenderSchema(item)?.maintenance_description ?? getTaskPackageRenderSchema(item)?.maintenanceDescription ?? null,
    execution_status: mapTaskItemExecutionStatusToOfflineStatus(String(item.execution_status ?? item.executionStatus ?? '')),
    is_normal: toOptionalBoolean(item.is_normal ?? item.isnormal) ?? false,
    is_recheck: toOptionalBoolean(item.is_recheck ?? item.isrecheck) ?? false,
    sync_status: 'synced',
    local_updated_at: normalizeChinaDateTime(item.updated_at ?? item.updatetime) ?? nowIso(),
  }));

  for (const item of offlineItems) {
    const existing = await offlineTaskItemRepository.getByTaskItemUuid(item.task_item_uuid);
    if (existing?.sync_status === 'pending') {
      await offlineTaskItemRepository.upsert({
        ...item,
        result: existing.result,
        execution_status: existing.execution_status,
        is_normal: existing.is_normal,
        is_recheck: existing.is_recheck,
        sync_status: existing.sync_status,
        local_updated_at: existing.local_updated_at,
      });
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
             display_condition: processItem.displayCondition ?? null,
             operation_guide: processItem.operationGuide ?? null,
             recommended_rules: processItem.suggestionRule ?? null,
             recommendation_content: processItem.suggestionContent ?? null,
             hidden_hazard_content: processItem.hazardContent ?? null,
             maintenance_instructions: processItem.maintenanceDescription ?? null,
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

function buildOfflineTask(task: MockTask, schemeItems?: SchemeItem[]): OfflineTaskUpsert {
  const timestamp = nowIso();
  return {
    task_uuid: task.id,
    server_task_id: task.id,
    task_no: task.id,
    serial_no: null,
    equipment_name: null,
    equipment_number: null,
    department: null,
    assigned_user_name: null,
    assigned_user_id: null,
    download_device_name: null,
    project_id: task.projectId,
    project_name: task.projectName,
    scheme_id: task.schemeId,
    scheme_name: task.schemeName,
    product_id: null,
    inspection_type: null,
    version: null,
    device_model: task.deviceModel,
    scheme_snapshot_json: schemeItems ? serializeTaskSchemeSnapshot(schemeItems) : null,
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
  const response = await inspectionTasksApi.getInspectionTaskDetail(taskId);
  const downloaded = await downloadTaskPackageFromResponse(
    {
      code: 0,
      msg: 'ok',
      data: response,
    },
    options,
  );
  await inspectionTasksApi.updateInspectionTask(
    buildInspectionTaskStatusUpdatePayload(
      {
        code: 0,
        msg: 'ok',
        data: response,
      },
      2,
      nowChinaTimestamptz(),
    ),
  );
  return downloaded;
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

  await offlineTaskRepository.upsert(buildOfflineTask(task, scheme.items));
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
