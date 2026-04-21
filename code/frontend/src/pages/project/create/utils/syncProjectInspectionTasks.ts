import { inspectionTasksApi, productsApi, taskitemsApi } from '@/api';
import type { SchemeItem } from '@/pages/scheme/utils/schemeUtils';
import { isDetectionItem } from '@/pages/scheme/utils/schemeUtils';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import { workshopKey } from './matchInspectionTemplates';

/** 与后端 InspectionTask.status 注释一致：1 进行中 / 2 完成 / 3 未开始 */
const TASK_STATUS_NOT_STARTED = 3;

function parseOptionalEngineerId(id: string | null | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number.parseInt(String(id), 10);
  return Number.isNaN(n) ? null : n;
}

function clip200(s: string): string {
  const t = s.trim();
  if (t.length <= 200) return t;
  return t.slice(0, 200);
}

/** 将方案树中的检测项映射为 Taskitems 行（name + categorypath） */
export function flattenSchemeToTaskitemRows(
  roots: SchemeItem[],
  checkedItemIds: string[],
): { name: string; categorypath: string }[] {
  const out: { name: string; categorypath: string }[] = [];
  const checkSet = checkedItemIds.length > 0 ? new Set(checkedItemIds) : null;

  function walk(nodes: SchemeItem[], path: string[]) {
    for (const n of nodes) {
      if (isDetectionItem(n)) {
        if (checkSet && !checkSet.has(n.id)) continue;
        const cp = clip200(path.join(' / '));
        out.push({
          name: clip200((n.name || '未命名').trim() || '未命名'),
          categorypath: cp,
        });
        continue;
      }
      const label = (n.name || '').trim();
      walk(n.children || [], label ? [...path, label] : path);
    }
  }
  walk(roots, []);
  return out;
}

async function deleteAllInspectionTasksForProject(projectId: number): Promise<void> {
  const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId });
  for (const t of tasks) {
    const tid = t.taskid;
    if (tid == null || tid <= 0) continue;
    const items = await taskitemsApi.listTaskitemsByTask(tid);
    for (const it of items) {
      const iid = it.itemid;
      if (iid != null && iid > 0) {
        await taskitemsApi.deleteTaskitem(iid);
      }
    }
    await inspectionTasksApi.deleteInspectionTask(tid);
  }
}

async function ensureProductIdsForEquipmentLine(
  equipId: number,
  mlfb: string | null,
  quantity: number,
  preferredSerial: string | null,
): Promise<number[]> {
  const existing = await productsApi.searchProducts({ equipmentid: equipId });
  let ids = [
    ...new Set(
      existing.map((p) => p.productid).filter((id): id is number => id != null && id > 0),
    ),
  ];
  const need = Math.max(1, quantity);

  if (ids.length >= need) {
    return ids.slice(0, need);
  }

  let seq = ids.length;
  while (ids.length < need) {
    seq += 1;
    const serial =
      ids.length === 0 && preferredSerial?.trim()
        ? preferredSerial.trim()
        : `EQ${equipId}-U${seq}`;
    const newId = await productsApi.createProduct({
      productid: 0,
      equipid: equipId,
      mlfb: mlfb?.trim() ? mlfb.trim() : null,
      serialno: clip200(serial),
    });
    ids.push(newId);
  }
  return ids.slice(0, need);
}

async function createTasksForTemplateOnProducts(params: {
  projectId: number;
  templateId: number;
  equipId: number;
  productIds: number[];
  assigneduserid: number | null;
  schemeRoots: SchemeItem[];
  checkedItemIds: string[];
  taskNoSuffix: string;
}): Promise<void> {
  const {
    projectId,
    templateId,
    equipId,
    productIds,
    assigneduserid,
    schemeRoots,
    checkedItemIds,
    taskNoSuffix,
  } = params;
  const rows = flattenSchemeToTaskitemRows(schemeRoots, checkedItemIds);
  for (const productId of productIds) {
    const taskNo = clip200(
      `P${String(projectId)}-T${templateId}-E${equipId}-Pr${productId}${taskNoSuffix}`,
    );
    const taskId = await inspectionTasksApi.createInspectionTask({
      taskid: 0,
      projectid: projectId,
      templateid: templateId,
      status: TASK_STATUS_NOT_STARTED,
      taskNo,
      assigneduserid: assigneduserid,
      completetime: null,
      productid: productId,
    });

    for (const row of rows) {
      await taskitemsApi.createTaskitem({
        itemid: 0,
        taskid: taskId,
        name: row.name,
        categorypath: row.categorypath ? row.categorypath : null,
        result: null,
        isnormal: true,
        isrecheck: false,
        recheckresult: null,
        photopath: null,
      });
    }
  }
}

/**
 * 与创建/编辑向导提交对齐：先删除该项目下全部 InspectionTasks（及 Taskitems），再按当前方案与设备重建。
 * 依赖已持久化的设备档案 id（与 deviceList 顺序一致的 equipIds）。
 *
 * - 主模板 `maintenanceSchemeId`：设备检测（或仅外围时向导写入的当前主方案）→ 每台设备下每个产品一条任务。
 * - `peripheralSchemeIdByWorkshop`：各车间另选的外围模板（与主模板 id 不同）→ 在同一批产品上再各生成一条外围检测任务。
 */
export async function syncProjectInspectionTasksFromWizard(opts: {
  projectId: number;
  maintenanceSchemeId: string;
  /** 车间 key（factory\\tworkshop）→ 外围模板 id 字符串 */
  peripheralSchemeIdByWorkshop?: Record<string, string>;
  equipIds: number[];
  deviceList: {
    quantity: number;
    model?: string;
    serialNumber?: string;
    assignedEngineerId?: string;
    factoryName?: string;
    workshopName?: string;
  }[];
  adjustedSchemeItems: SchemeItem[];
  checkedItemIds: string[];
}): Promise<void> {
  const projectId = opts.projectId;
  if (!Number.isFinite(projectId) || projectId <= 0) {
    throw new Error('无效的项目 id');
  }

  await deleteAllInspectionTasksForProject(projectId);

  const templateId = Number.parseInt(String(opts.maintenanceSchemeId ?? '').trim(), 10);
  const mainTemplateValid = !Number.isNaN(templateId) && templateId > 0;

  const { equipIds, deviceList } = opts;
  if (equipIds.length !== deviceList.length) {
    throw new Error('设备 id 与设备行数不一致，无法生成巡检任务');
  }

  if (equipIds.length === 0) {
    return;
  }

  const peripheralMap = opts.peripheralSchemeIdByWorkshop ?? {};
  const hasPeriphSelection = Object.values(peripheralMap).some((v) => {
    const n = Number.parseInt(String(v ?? '').trim(), 10);
    return !Number.isNaN(n) && n > 0;
  });

  if (!mainTemplateValid && !hasPeriphSelection) {
    return;
  }

  let roots: SchemeItem[] = [];
  if (mainTemplateValid) {
    roots =
      Array.isArray(opts.adjustedSchemeItems) && opts.adjustedSchemeItems.length > 0
        ? opts.adjustedSchemeItems
        : await loadTemplateItemsByTemplateId(templateId);
  }

  for (let i = 0; i < equipIds.length; i++) {
    const equipId = equipIds[i]!;
    const device = deviceList[i]!;
    const qty = Math.max(1, Number(device.quantity) || 1);
    const mlfb = (device.model ?? '').trim() || null;
    const productIds = await ensureProductIdsForEquipmentLine(
      equipId,
      mlfb,
      qty,
      device.serialNumber ?? null,
    );
    const assigned = parseOptionalEngineerId(device.assignedEngineerId);

    if (mainTemplateValid) {
      await createTasksForTemplateOnProducts({
        projectId,
        templateId,
        equipId,
        productIds,
        assigneduserid: assigned,
        schemeRoots: roots,
        checkedItemIds: opts.checkedItemIds ?? [],
        taskNoSuffix: '',
      });
    }

    const wk = workshopKey({
      factoryName: device.factoryName,
      workshopName: device.workshopName,
    });
    const periphStr = String(peripheralMap[wk] ?? '').trim();
    const periphTemplateId = Number.parseInt(periphStr, 10);
    if (Number.isNaN(periphTemplateId) || periphTemplateId <= 0) continue;
    // 主方案已用同一模板生成过任务时不再重复（仅外围、或主模板无效时不跳过）
    if (mainTemplateValid && periphTemplateId === templateId) continue;

    const periphRoots = await loadTemplateItemsByTemplateId(periphTemplateId);
    await createTasksForTemplateOnProducts({
      projectId,
      templateId: periphTemplateId,
      equipId,
      productIds,
      assigneduserid: assigned,
      schemeRoots: periphRoots,
      checkedItemIds: [],
      taskNoSuffix: '-P2',
    });
  }
}
