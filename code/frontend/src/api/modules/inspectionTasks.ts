import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type InspectionTaskDto = {
  taskid?: number;
  projectid: number;
  templateid: number;
  status: number;
  taskNo?: string | null;
  assigneduserid?: number | null;
  assignedusername?: string | null;
  completetime?: string | null;
  productid: number;
  inspectiontype?: number | null;
  serialno?: string | null;
  ifdel?: boolean;
  version?: number | null;
  downloadedAt?: string | null;
  localUpdatedAt?: string | null;
  downloadDeviceName?: string | null;
};

export type InspectionTaskDetailDto = {
  task: {
    task_id: number;
    task_uuid?: string;
    task_no?: string;
    project_id: number | string;
    project_name?: string;
    template_id: number | string;
    template_name?: string;
    product_id?: number | string;
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
  task_items: Array<{
    item_id: string;
    source_type?: 'system_generated' | 'manual_added';
    source_inspection_item_id?: number | string | null;
    sort_order?: number | null;
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
      threshold?: Record<string, unknown> | null;
      sort_order?: number | null;
      priority?: string | null;
      display_condition?: string | null;
      operation_guide?: string | null;
      suggestion_rule?: string | null;
      suggestion_content?: string | null;
      hazard_content?: string | null;
      maintenance_description?: string | null;
    } | null;
    taskresult?: {
      value?: string | null;
      remarks?: string | null;
      result_state?: string | null;
      hazardResolved?: boolean | null;
      recommendationContent?: string | null;
      actionTaken?: string | null;
    } | null;
    task_result?: {
      value?: string | null;
      remarks?: string | null;
      result_state?: string | null;
      hazardResolved?: boolean | null;
      recommendationContent?: string | null;
      actionTaken?: string | null;
    } | null;
    attachments?: Array<Record<string, unknown>>;
  }>;
};

export type InspectionTaskDetailUpdatePayload = {
  task: {
    taskid: number;
    projectid: number;
    templateid: number;
    status: number;
    taskNo?: string | null;
    assigneduserid?: number | null;
    productid: number;
    inspectiontype: number;
    ifdel: boolean;
    version?: number | null;
    downloadedAt?: string | null;
    localUpdatedAt?: string | null;
    downloadDeviceName?: string | null;
    serialno?: string | null;
    assignedusername?: string | null;
  };
  taskitems: Array<{
    itemid: string;
    taskid: number;
    taskname: string | null;
    categorypath: string | null;
    taskresult: string | null;
    isnormal: boolean;
    isrecheck: boolean;
    photopath?: string | null;
    executionStatus: number;
    updatetime?: string | null;
    version?: number | null;
    sourceType: number;
    inspectionitemid?: number | null;
  }>;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

function gv(r: Record<string, unknown>, a: string, b: string) {
  return r[a] ?? r[b];
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (!text) return undefined;
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return undefined;
}

function parseRenderSchemaJson(raw: unknown): InspectionTaskDetailDto['task_items'][number]['render_schema_json'] {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return {
        value_type: toOptionalString(gv(parsed, 'value_type', 'valueType')) ?? null,
        rule_type: toOptionalString(gv(parsed, 'rule_type', 'ruleType')) ?? null,
        threshold: (gv(parsed, 'threshold', 'Threshold') as Record<string, unknown> | null | undefined) ?? null,
        sort_order: toOptionalNumber(gv(parsed, 'sort_order', 'sortOrder')) ?? null,
        priority: toOptionalString(gv(parsed, 'priority', 'Priority')) ?? null,
        display_condition:
          toOptionalString(gv(parsed, 'display_condition', 'displayCondition'))
          ?? toOptionalString(gv(parsed, 'displaycondition', 'Displaycondition'))
          ?? null,
        operation_guide:
          toOptionalString(gv(parsed, 'operation_guide', 'operationGuide'))
          ?? toOptionalString(gv(parsed, 'operationguide', 'Operationguide'))
          ?? null,
        suggestion_rule:
          toOptionalString(gv(parsed, 'suggestion_rule', 'suggestionRule'))
          ?? toOptionalString(gv(parsed, 'recommendedrules', 'Recommendedrules'))
          ?? null,
        suggestion_content:
          toOptionalString(gv(parsed, 'suggestion_content', 'suggestionContent'))
          ?? toOptionalString(gv(parsed, 'recommendationcontent', 'Recommendationcontent'))
          ?? null,
        hazard_content:
          toOptionalString(gv(parsed, 'hazard_content', 'hazardContent'))
          ?? toOptionalString(gv(parsed, 'hiddenhazardcontent', 'Hiddenhazardcontent'))
          ?? null,
        maintenance_description:
          toOptionalString(gv(parsed, 'maintenance_description', 'maintenanceDescription'))
          ?? toOptionalString(gv(parsed, 'maintenanceinstructions', 'Maintenanceinstructions'))
          ?? null,
      };
    } catch {
      return null;
    }
  }

  const parsed = raw as Record<string, unknown>;
  return {
    value_type: toOptionalString(gv(parsed, 'value_type', 'valueType')) ?? null,
    rule_type: toOptionalString(gv(parsed, 'rule_type', 'ruleType')) ?? null,
    threshold: (gv(parsed, 'threshold', 'Threshold') as Record<string, unknown> | null | undefined) ?? null,
    sort_order: toOptionalNumber(gv(parsed, 'sort_order', 'sortOrder')) ?? null,
    priority: toOptionalString(gv(parsed, 'priority', 'Priority')) ?? null,
    display_condition:
      toOptionalString(gv(parsed, 'display_condition', 'displayCondition'))
      ?? toOptionalString(gv(parsed, 'displaycondition', 'Displaycondition'))
      ?? null,
    operation_guide:
      toOptionalString(gv(parsed, 'operation_guide', 'operationGuide'))
      ?? toOptionalString(gv(parsed, 'operationguide', 'Operationguide'))
      ?? null,
    suggestion_rule:
      toOptionalString(gv(parsed, 'suggestion_rule', 'suggestionRule'))
      ?? toOptionalString(gv(parsed, 'recommendedrules', 'Recommendedrules'))
      ?? null,
    suggestion_content:
      toOptionalString(gv(parsed, 'suggestion_content', 'suggestionContent'))
      ?? toOptionalString(gv(parsed, 'recommendationcontent', 'Recommendationcontent'))
      ?? null,
    hazard_content:
      toOptionalString(gv(parsed, 'hazard_content', 'hazardContent'))
      ?? toOptionalString(gv(parsed, 'hiddenhazardcontent', 'Hiddenhazardcontent'))
      ?? null,
    maintenance_description:
      toOptionalString(gv(parsed, 'maintenance_description', 'maintenanceDescription'))
      ?? toOptionalString(gv(parsed, 'maintenanceinstructions', 'Maintenanceinstructions'))
      ?? null,
  };
}

function mergeRenderSchemaJson(
  base: InspectionTaskDetailDto['task_items'][number]['render_schema_json'],
  fallbackRaw: unknown,
): InspectionTaskDetailDto['task_items'][number]['render_schema_json'] {
  const fallback = parseRenderSchemaJson(fallbackRaw);
  if (base == null) {
    return fallback;
  }
  if (fallback == null) {
    return base;
  }

  return {
    value_type: base.value_type ?? fallback.value_type ?? null,
    rule_type: base.rule_type ?? fallback.rule_type ?? null,
    threshold: base.threshold ?? fallback.threshold ?? null,
    sort_order: base.sort_order ?? fallback.sort_order ?? null,
    priority: base.priority ?? fallback.priority ?? null,
    display_condition: base.display_condition ?? fallback.display_condition ?? null,
    operation_guide: base.operation_guide ?? fallback.operation_guide ?? null,
    suggestion_rule: base.suggestion_rule ?? fallback.suggestion_rule ?? null,
    suggestion_content: base.suggestion_content ?? fallback.suggestion_content ?? null,
    hazard_content: base.hazard_content ?? fallback.hazard_content ?? null,
    maintenance_description: base.maintenance_description ?? fallback.maintenance_description ?? null,
  };
}

function parseTaskResultBlock(raw: unknown): {
  value?: string | null;
  remarks?: string | null;
  result_state?: string | null;
  hazardResolved?: boolean | null;
  recommendationContent?: string | null;
  actionTaken?: string | null;
} | null {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return {
        value: toOptionalString(gv(parsed, 'value', 'Value')) ?? null,
        remarks: toOptionalString(gv(parsed, 'remarks', 'Remarks')) ?? null,
        result_state: toOptionalString(gv(parsed, 'resultState', 'result_state')) ?? null,
        hazardResolved:
          typeof gv(parsed, 'hazardResolved', 'hazard_resolved') === 'boolean'
            ? (gv(parsed, 'hazardResolved', 'hazard_resolved') as boolean)
            : null,
        recommendationContent: toOptionalString(gv(parsed, 'recommendationContent', 'recommendation_content')) ?? null,
        actionTaken: toOptionalString(gv(parsed, 'actionTaken', 'action_taken')) ?? null,
      };
    } catch {
      return {
        value: text,
        remarks: null,
        result_state: null,
      };
    }
  }

  const parsed = raw as Record<string, unknown>;
  return {
    value: toOptionalString(gv(parsed, 'value', 'Value')) ?? null,
    remarks: toOptionalString(gv(parsed, 'remarks', 'Remarks')) ?? null,
    result_state: toOptionalString(gv(parsed, 'resultState', 'result_state')) ?? null,
    hazardResolved:
      typeof gv(parsed, 'hazardResolved', 'hazard_resolved') === 'boolean'
        ? (gv(parsed, 'hazardResolved', 'hazard_resolved') as boolean)
        : null,
    recommendationContent: toOptionalString(gv(parsed, 'recommendationContent', 'recommendation_content')) ?? null,
    actionTaken: toOptionalString(gv(parsed, 'actionTaken', 'action_taken')) ?? null,
  };
}

function mapInspectionTaskDetailRaw(raw: unknown): InspectionTaskDetailDto {
  const dto = raw as Record<string, unknown>;
  const taskRaw = (dto.task ?? {}) as Record<string, unknown>;
  const itemsRaw = (dto.task_items ?? dto.taskitems ?? []) as unknown[];

  return {
    task: {
      task_id: Number(gv(taskRaw, 'task_id', 'taskid') ?? 0),
      task_uuid: toOptionalString(gv(taskRaw, 'task_uuid', 'taskuuid')),
      task_no: toOptionalString(gv(taskRaw, 'task_no', 'taskNo')),
      project_id: (gv(taskRaw, 'project_id', 'projectid') as string | number | null | undefined) ?? '',
      project_name: toOptionalString(gv(taskRaw, 'project_name', 'projectname')),
      template_id: (gv(taskRaw, 'template_id', 'templateid') as string | number | null | undefined) ?? '',
      template_name: toOptionalString(gv(taskRaw, 'template_name', 'templatename')),
      product_id: (gv(taskRaw, 'product_id', 'productid') as string | number | null | undefined) ?? undefined,
      inspection_type: toOptionalNumber(gv(taskRaw, 'inspection_type', 'inspectiontype')),
      status: (gv(taskRaw, 'status', 'Status') as number | string | undefined) ?? undefined,
      assigned_user_id: (() => {
        const value = gv(taskRaw, 'assigned_user_id', 'assigneduserid');
        if (value == null || value === '') return null;
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : null;
      })(),
      assigned_user_name: toOptionalString(gv(taskRaw, 'assigned_user_name', 'assignedusername')) ?? null,
      version: toOptionalNumber(gv(taskRaw, 'version', 'Version')) ?? null,
      downloaded_at: toOptionalString(gv(taskRaw, 'downloadedAt', 'downloaded_at')) ?? null,
      local_updated_at: toOptionalString(gv(taskRaw, 'localUpdatedAt', 'local_updated_at')) ?? null,
      download_device_name: toOptionalString(gv(taskRaw, 'downloadDeviceName', 'download_device_name')) ?? null,
      serial_no: toOptionalString(gv(taskRaw, 'serialno', 'serial_no')) ?? null,
    },
    task_items: itemsRaw.map((itemRaw) => {
      const item = itemRaw as Record<string, unknown>;
      const sourceType = gv(item, 'source_type', 'sourceType');
      const executionStatus = gv(item, 'execution_status', 'executionStatus');
      const renderSchema = mergeRenderSchemaJson(
        parseRenderSchemaJson(gv(item, 'render_schema_json', 'renderSchemaJson')),
        item,
      );
      return {
        item_id: String(gv(item, 'item_id', 'itemid') ?? ''),
        source_type:
          sourceType === 2 || sourceType === '2' ? 'manual_added' : 'system_generated',
        source_inspection_item_id: gv(item, 'source_inspection_item_id', 'inspectionitemid') as
          | number
          | string
          | null
          | undefined,
        sort_order:
          toOptionalNumber(gv(item, 'sort_order', 'sortOrder'))
          ?? toOptionalNumber(parseRenderSchemaJson(gv(item, 'render_schema_json', 'renderSchemaJson'))?.sort_order)
          ?? null,
        item_name: String(gv(item, 'item_name', 'taskname') ?? ''),
        category_path: toOptionalString(gv(item, 'category_path', 'categorypath')) ?? null,
        execution_status: (() => {
          if (executionStatus === 'completed' || executionStatus === 2 || executionStatus === '2') return 'completed';
          if (executionStatus === 'skipped' || executionStatus === 3 || executionStatus === '3') return 'skipped';
          if (executionStatus === 'not_applicable' || executionStatus === 4 || executionStatus === '4') return 'not_applicable';
          if (executionStatus === 'recheck_required' || executionStatus === 5 || executionStatus === '5') return 'recheck_required';
          return 'pending';
        })(),
        is_normal: toBoolean(gv(item, 'is_normal', 'isnormal')) ?? null,
        is_recheck: toBoolean(gv(item, 'is_recheck', 'isrecheck')) ?? null,
        version: toOptionalNumber(gv(item, 'version', 'Version')) ?? null,
        updated_at: toOptionalString(gv(item, 'updated_at', 'updatetime')) ?? null,
        render_schema_json: renderSchema,
        taskresult: parseTaskResultBlock(gv(item, 'taskresult', 'taskResult')),
        task_result: parseTaskResultBlock(gv(item, 'task_result', 'taskResult')),
        attachments: Array.isArray(item.attachments)
          ? item.attachments as Array<Record<string, unknown>>
          : [],
      };
    }),
  };
}

function mapInspectionTaskRaw(raw: unknown): InspectionTaskDto {
  const r = raw as Record<string, unknown>;
  return {
    taskid: (() => {
      const v = gv(r, 'taskid', 'Taskid');
      if (v == null || v === '') return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    })(),
    projectid: Number(gv(r, 'projectid', 'Projectid')),
    templateid: Number(gv(r, 'templateid', 'Templateid')),
    status: Number(gv(r, 'status', 'Status')),
    taskNo: (gv(r, 'taskNo', 'TaskNo') as string | null | undefined) ?? null,
    assigneduserid: (() => {
      const v = gv(r, 'assigneduserid', 'Assigneduserid');
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    })(),
    assignedusername: (gv(r, 'assignedusername', 'Assignedusername') as string | null | undefined) ?? null,
    completetime: (gv(r, 'completetime', 'Completetime') as string | null | undefined) ?? null,
    productid: Number(gv(r, 'productid', 'Productid')),
    inspectiontype: toOptionalNumber(gv(r, 'inspectiontype', 'Inspectiontype')) ?? null,
    serialno: (gv(r, 'serialno', 'Serialno') as string | null | undefined) ?? null,
    ifdel: toBoolean(gv(r, 'ifdel', 'Ifdel')) ?? false,
  };
}

/** GET /api/InspectionTasks/{id} */
export async function getInspectionTask(taskid: number): Promise<InspectionTaskDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}`);
  return mapInspectionTaskRaw(unwrap(res));
}

/** GET /api/InspectionTasks/{id}/detail */
export async function getInspectionTaskDetail(taskid: number): Promise<InspectionTaskDetailDto> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}/detail`);
  return mapInspectionTaskDetailRaw(unwrap(res));
}

/** GET /api/InspectionTasks/Search?projectid=&templateid=&productid= */
export async function searchInspectionTasks(params: {
  projectid?: number;
  templateid?: number;
  productid?: number;
}): Promise<InspectionTaskDto[]> {
  const q = new URLSearchParams();
  if (params.projectid != null) q.set('projectid', String(params.projectid));
  if (params.templateid != null) q.set('templateid', String(params.templateid));
  if (params.productid != null) q.set('productid', String(params.productid));
  const qs = q.toString();
  const path = qs ? `/api/InspectionTasks/Search?${qs}` : '/api/InspectionTasks/Search';
  const res = await requestJson<ApiEnvelope<unknown[]>>(path);
  return unwrap(res).map(mapInspectionTaskRaw);
}

/** POST /api/InspectionTasks，返回新 taskid */
export async function createInspectionTask(payload: InspectionTaskDto): Promise<number> {
  const res = await requestJson<ApiEnvelope<number>>('/api/InspectionTasks', {
    method: 'POST',
    body: JSON.stringify({
      taskid: payload.taskid ?? 0,
      projectid: payload.projectid,
      templateid: payload.templateid,
      status: payload.status,
      taskNo: payload.taskNo ?? null,
      assigneduserid: payload.assigneduserid ?? null,
      completetime: payload.completetime ?? null,
      productid: payload.productid,
    }),
  });
  return unwrap(res);
}

export async function updateInspectionTask(payload: InspectionTaskDto): Promise<void> {
  const body: Record<string, unknown> = {
    taskid: payload.taskid ?? 0,
    projectid: payload.projectid,
    templateid: payload.templateid,
    status: payload.status,
    taskNo: payload.taskNo ?? null,
    assigneduserid: payload.assigneduserid ?? null,
    productid: payload.productid,
    inspectiontype: payload.inspectiontype ?? 0,
    ifdel: payload.ifdel ?? false,
    assignedusername: payload.assignedusername ?? null,
    version: payload.version ?? null,
    downloadedAt: payload.downloadedAt ?? null,
    localUpdatedAt: payload.localUpdatedAt ?? null,
    downloadDeviceName: payload.downloadDeviceName ?? null,
  };

  if (payload.serialno !== undefined) {
    body.serialno = payload.serialno;
  }

  const res = await requestJson<ApiEnvelope<unknown>>('/api/InspectionTasks', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  unwrap(res);
}

export async function deleteInspectionTask(taskid: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}`, {
    method: 'DELETE',
  });
  unwrap(res);
}

export async function putInspectionTaskDetail(
  taskid: number,
  payload: InspectionTaskDetailUpdatePayload,
): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/InspectionTasks/${taskid}/detail`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  unwrap(res);
}
