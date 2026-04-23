import { inspectionTemplatesApi } from '@/api';
import type { InspectionTemplateDto } from '@/api/modules/inspectionTemplates';
import { buildProductCategoryField } from '@/pages/scheme/utils/schemeInspectionTemplate';

/** 与 InspectionTemplate 注释一致：1 设备检测，2 外围检测 */
export const INSPECTION_TYPE_EQUIPMENT = 1;
export const INSPECTION_TYPE_PERIPHERAL = 2;

type DeviceLike = {
  categoryId?: string;
  subCategoryId?: string;
};

/** 含工厂/车间，用于按车间匹配外围方案 */
export type WorkshopDevice = DeviceLike & {
  factoryName?: string;
  workshopName?: string;
};

export function workshopKey(d: WorkshopDevice): string {
  return `${(d.factoryName ?? '').trim()}\t${(d.workshopName ?? '').trim()}`;
}

export function workshopLabel(d: WorkshopDevice): string {
  const f = (d.factoryName ?? '').trim();
  const w = (d.workshopName ?? '').trim();
  if (f && w) return `${f} / ${w}`;
  return w || f || '未填写工厂·车间';
}

export function groupDevicesByWorkshop<T extends WorkshopDevice>(devices: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const d of devices) {
    const k = workshopKey(d);
    const list = map.get(k) ?? [];
    list.push(d);
    map.set(k, list);
  }
  return map;
}

/**
 * 按车间分组分别匹配外围模板（同一车间内设备子类合并后再 Search）。
 */
export async function searchPeripheralTemplatesByWorkshop(
  devices: WorkshopDevice[],
): Promise<Map<string, InspectionTemplateDto[]>> {
  const groups = groupDevicesByWorkshop(devices);
  const out = new Map<string, InspectionTemplateDto[]>();
  for (const [key, groupDevices] of groups) {
    const list = await searchTemplatesForProjectDevices(groupDevices, INSPECTION_TYPE_PERIPHERAL);
    out.set(key, list);
  }
  return out;
}

/** 设备检测：productcategory 为 `大类/子类` 或仅大类（与模板保存一致） */
export function collectProductCategoriesFromDevices(devices: DeviceLike[]): string[] {
  const set = new Set<string>();
  for (const d of devices) {
    const pc = buildProductCategoryField(d.categoryId ?? '', d.subCategoryId ?? '', 'equipment');
    if (pc) set.add(pc);
  }
  return [...set];
}

/**
 * 外围检测：保存时一般为 **子类（产品系列）名称**；后端 Search 为全等匹配。
 * 同时尝试 `大类/子类`，兼容库里异常/历史数据。
 */
export function collectPeripheralProductCategoryQueries(devices: DeviceLike[]): string[] {
  const set = new Set<string>();
  for (const d of devices) {
    const subName = buildProductCategoryField(d.categoryId ?? '', d.subCategoryId ?? '', 'peripheral');
    if (subName) set.add(subName);
    const equipmentStyle = buildProductCategoryField(d.categoryId ?? '', d.subCategoryId ?? '', 'equipment');
    if (equipmentStyle) set.add(equipmentStyle);
  }
  return [...set];
}

/**
 * 按 inspectiontype + 各唯一 productcategory 调用 Search，结果按 templateid 合并去重。
 */
export async function searchTemplatesForProjectDevices(
  devices: DeviceLike[],
  inspectiontype: number = INSPECTION_TYPE_EQUIPMENT,
): Promise<InspectionTemplateDto[]> {
  const categories =
    inspectiontype === INSPECTION_TYPE_PERIPHERAL
      ? collectPeripheralProductCategoryQueries(devices)
      : collectProductCategoriesFromDevices(devices);
  if (categories.length === 0) return [];

  const merged = new Map<number, InspectionTemplateDto>();
  for (const productcategory of categories) {
    const list = await inspectionTemplatesApi.searchInspectionTemplates({
      inspectiontype,
      productcategory,
    });
    for (const t of list) {
      merged.set(t.templateid, t);
    }
  }
  return [...merged.values()];
}

/**
 * 同时匹配设备检测（inspectiontype=1）与外围检测（inspectiontype=2）模板，
 * 按 templateid 合并去重（同一 id 只保留一条，以后端返回为准）。
 */
export async function searchEquipmentAndPeripheralTemplatesForDevices(
  devices: DeviceLike[],
): Promise<InspectionTemplateDto[]> {
  const [equipment, peripheral] = await Promise.all([
    searchTemplatesForProjectDevices(devices, INSPECTION_TYPE_EQUIPMENT),
    searchTemplatesForProjectDevices(devices, INSPECTION_TYPE_PERIPHERAL),
  ]);
  const merged = new Map<number, InspectionTemplateDto>();
  for (const t of equipment) merged.set(t.templateid, t);
  for (const t of peripheral) merged.set(t.templateid, t);
  return [...merged.values()];
}
