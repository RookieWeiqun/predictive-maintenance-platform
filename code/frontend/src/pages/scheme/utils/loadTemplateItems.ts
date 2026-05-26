import { inspectionCategoriesApi, inspectionItemsApi } from '@/api';
import type { InspectionCategoryDto } from '@/api/modules/inspectionCategories';
import type { InspectionItemDto } from '@/api/modules/inspectionItems';
import type { SchemeItem } from './schemeUtils';
import { decodeDisplayCondition } from './displayConditionCodec';
import { mapPriorityToRequired } from './schemeUtils';

function mapDataTypeToSchemeType(dataType?: string | null): string {
  const t = String(dataType || '').toLowerCase();
  if (t === 'number' || t === 'numeric') return 'electrical';
  if (t === 'select' || t === 'enum') return 'functional';
  return 'visual';
}

function parseThreshold(item: InspectionItemDto): Pick<
  SchemeItem,
  'unit' | 'standardValue' | 'minThreshold' | 'maxThreshold' | 'expectedResult'
> {
  const raw = item.threshold;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const res: Pick<
      SchemeItem,
      'unit' | 'standardValue' | 'minThreshold' | 'maxThreshold' | 'expectedResult'
    > = {};
    const n = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : undefined;
    };
    if (parsed.unit !== undefined) res.unit = String(parsed.unit);
    if (parsed.standard !== undefined) res.standardValue = n(parsed.standard);
    if (parsed.min !== undefined) res.minThreshold = n(parsed.min);
    if (parsed.max !== undefined) res.maxThreshold = n(parsed.max);
    if (Array.isArray(parsed.normal_values)) {
      res.expectedResult = parsed.normal_values.map(String).join(' / ');
    } else if (parsed.normal_value !== undefined) {
      res.expectedResult = String(parsed.normal_value);
    }
    return res;
  } catch {
    return {};
  }
}

function toSchemeItemFromApi(item: InspectionItemDto): SchemeItem {
  const threshold = parseThreshold(item);
  return {
    id: `item-${item.itemid}`,
    name: item.name || '未命名检测项',
    dataType: item.valueType || undefined,
    ruleType: item.ruleType || undefined,
    thresholdRaw: item.threshold || undefined,
    priority: item.priority || undefined,
    type: mapDataTypeToSchemeType(item.valueType),
    required: mapPriorityToRequired(item.priority),
    displayCondition: decodeDisplayCondition(item.displayCondition) || undefined,
    operationGuide: item.operationGuide || undefined,
    suggestionRule: item.suggestionRule || undefined,
    suggestionContent: item.suggestionContent || undefined,
    hazardContent: item.hazardContent || undefined,
    maintenanceDescription: item.maintenanceDescription || undefined,
    ...threshold,
    children: [],
  };
}

function buildCategoryTree(
  categories: InspectionCategoryDto[],
  items: InspectionItemDto[],
): SchemeItem[] {
  const categoryById = new Map<number, InspectionCategoryDto>();
  const childCategories = new Map<number, InspectionCategoryDto[]>();
  categories.forEach((c) => {
    categoryById.set(c.categoryid, c);
    const parent = c.parentId ?? 0;
    const list = childCategories.get(parent) || [];
    list.push(c);
    childCategories.set(parent, list);
  });
  childCategories.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));

  const itemsByCategory = new Map<number | null, InspectionItemDto[]>();
  items.forEach((i) => {
    const key = i.categoryid ?? null;
    const list = itemsByCategory.get(key) || [];
    list.push(i);
    itemsByCategory.set(key, list);
  });
  itemsByCategory.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));

  const buildNode = (cat: InspectionCategoryDto): SchemeItem => {
    const categoryChildren = (childCategories.get(cat.categoryid) || []).map(buildNode);
    const ownItems = (itemsByCategory.get(cat.categoryid) || []).map(toSchemeItemFromApi);
    return {
      id: `cat-${cat.categoryid}`,
      name: cat.name,
      children: [...categoryChildren, ...ownItems],
    };
  };

  const roots = (childCategories.get(0) || []).map(buildNode);
  const unboundItems = (itemsByCategory.get(null) || []).map(toSchemeItemFromApi);
  return [...roots, ...unboundItems];
}

export async function loadTemplateItemsByTemplateId(templateId: number): Promise<SchemeItem[]> {
  const [allCategories, allItems] = await Promise.all([
    inspectionCategoriesApi.listInspectionCategories(),
    inspectionItemsApi.listInspectionItems(),
  ]);
  const categories = allCategories.filter((x) => x.templateid === templateId);
  const items = allItems.filter((x) => x.templateid === templateId);
  return buildCategoryTree(categories, items);
}

export async function loadTemplateItemsMap(): Promise<Map<number, SchemeItem[]>> {
  const [allCategories, allItems] = await Promise.all([
    inspectionCategoriesApi.listInspectionCategories(),
    inspectionItemsApi.listInspectionItems(),
  ]);
  const templateIds = new Set<number>();
  allCategories.forEach((x) => templateIds.add(x.templateid));
  allItems.forEach((x) => templateIds.add(x.templateid));

  const map = new Map<number, SchemeItem[]>();
  templateIds.forEach((templateId) => {
    const categories = allCategories.filter((x) => x.templateid === templateId);
    const items = allItems.filter((x) => x.templateid === templateId);
    map.set(templateId, buildCategoryTree(categories, items));
  });
  return map;
}
