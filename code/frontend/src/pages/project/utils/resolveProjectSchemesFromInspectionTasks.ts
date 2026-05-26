import { equipmentsApi, inspectionTasksApi, inspectionTemplatesApi, productsApi } from '@/api';
import type { InspectionTaskDto } from '@/api/modules/inspectionTasks';
import type { EquipmentProjectDto } from '@/api/modules/equipments';
import { workshopKey, workshopLabel } from '@/pages/project/create/utils/matchInspectionTemplates';
import type { ProjectSchemePeripheralRowV1 } from '@/pages/project/utils/projectSchemeSelectionStorage';

/** 历史外围任务号后缀约定：`-P2` */
export function isPeripheralInspectionTask(taskNo: string | null | undefined): boolean {
  const t = (taskNo ?? '').trim();
  return t.length > 0 && t.endsWith('-P2');
}

function dominantPositiveTemplateId(tasks: Pick<InspectionTaskDto, 'templateid'>[]): number | null {
  const counts = new Map<number, number>();
  for (const t of tasks) {
    const id = t.templateid;
    if (id == null || id <= 0 || Number.isNaN(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestc = 0;
  for (const [id, c] of counts) {
    if (c > bestc) {
      best = id;
      bestc = c;
    }
  }
  return best;
}

export type SchemeSummaryFromInspectionTasks = {
  maintenanceTemplateId: number | null;
  maintenanceTemplateName: string;
  maintenanceMlfb: string;
  peripheralRows: ProjectSchemePeripheralRowV1[];
  taskCount: number;
};

/**
 * 根据项目下全部 InspectionTasks 还原「主检测模板 + 各车间外围模板」，
 * 避免仅依赖浏览器本地方案快照。
 */
export async function resolveProjectSchemesFromInspectionTasks(
  projectId: number,
): Promise<SchemeSummaryFromInspectionTasks | null> {
  if (!Number.isFinite(projectId) || projectId <= 0) return null;

  const tasks = await inspectionTasksApi.searchInspectionTasks({ projectid: projectId });
  if (!tasks.length) return null;

  const mainTasks = tasks.filter((t) => !isPeripheralInspectionTask(t.taskNo));
  const peripheralTasks = tasks.filter((t) => isPeripheralInspectionTask(t.taskNo));

  const maintenanceTemplateId = dominantPositiveTemplateId(mainTasks);

  const [equipList, productIdToEquipId] = await Promise.all([
    equipmentsApi.listEquipmentsByProject(projectId),
    (async () => {
      const ids = [
        ...new Set(
          peripheralTasks.map((t) => t.productid).filter((id) => id != null && id > 0 && !Number.isNaN(id)),
        ),
      ];
      const m = new Map<number, number>();
      await Promise.all(
        ids.map(async (productid) => {
          try {
            const product = await productsApi.getProduct(productid);
            const eq = product.equipid;
            if (eq != null && eq > 0) m.set(productid, eq);
          } catch {
            /* 忽略单条 */
          }
        }),
      );
      return m;
    })(),
  ]);

  const equipById = new Map<number, EquipmentProjectDto>();
  for (const e of equipList) {
    const id = e.equipid;
    if (id != null && id > 0) equipById.set(id, e);
  }

  const peripheralRowKeys = new Map<string, ProjectSchemePeripheralRowV1>();
  for (const t of peripheralTasks) {
    const tid = t.templateid;
    if (tid == null || tid <= 0 || Number.isNaN(tid)) continue;
    const equipId = productIdToEquipId.get(t.productid);
    const eq = equipId != null ? equipById.get(equipId) : undefined;
    const wk = workshopKey({
      factoryName: eq?.factory ?? undefined,
      workshopName: eq?.workshop ?? undefined,
    });
    const label = workshopLabel({
      factoryName: eq?.factory ?? undefined,
      workshopName: eq?.workshop ?? undefined,
    });
    const templateId = String(tid);
    const dedupeKey = `${wk}\t${templateId}`;
    if (!peripheralRowKeys.has(dedupeKey)) {
      peripheralRowKeys.set(dedupeKey, {
        workshopKey: wk.trim() ? wk : undefined,
        workshopLabel: label,
        templateId,
        schemeName: '',
      });
    }
  }

  const templateIdsToName = new Set<number>();
  if (maintenanceTemplateId != null) templateIdsToName.add(maintenanceTemplateId);
  for (const r of peripheralRowKeys.values()) {
    const n = Number.parseInt(r.templateId, 10);
    if (!Number.isNaN(n) && n > 0) templateIdsToName.add(n);
  }

  const resolvedTpl = new Map<number, { name: string; mlfb: string }>();
  await Promise.all(
    [...templateIdsToName].map(async (tid) => {
      try {
        const tpl = await inspectionTemplatesApi.getInspectionTemplate(tid);
        resolvedTpl.set(tid, {
          name: tpl.name?.trim() || `模板 #${tid}`,
          mlfb: tpl.mlfb?.trim() || '-',
        });
      } catch {
        resolvedTpl.set(tid, { name: `模板 #${tid}`, mlfb: '-' });
      }
    }),
  );

  let maintenanceTemplateName = '';
  let maintenanceMlfb = '';
  if (maintenanceTemplateId != null) {
    const info = resolvedTpl.get(maintenanceTemplateId);
    maintenanceTemplateName = info?.name ?? `模板 #${maintenanceTemplateId}`;
    maintenanceMlfb = info?.mlfb ?? '-';
  }

  const peripheralRows = [...peripheralRowKeys.values()].map((r) => {
    const n = Number.parseInt(r.templateId, 10);
    const name = !Number.isNaN(n) && n > 0 ? (resolvedTpl.get(n)?.name ?? '') : '';
    return { ...r, schemeName: name };
  });
  peripheralRows.sort((a, b) => a.workshopLabel.localeCompare(b.workshopLabel, 'zh-CN'));

  return {
    maintenanceTemplateId,
    maintenanceTemplateName,
    maintenanceMlfb,
    peripheralRows,
    taskCount: tasks.length,
  };
}
