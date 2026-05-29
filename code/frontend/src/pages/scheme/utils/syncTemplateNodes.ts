import { inspectionCategoriesApi, inspectionItemsApi } from '@/api';
import type { SchemeItem } from './schemeUtils';
import { mapRequiredToPriority } from './schemeUtils';
import { encodeDisplayCondition } from './displayConditionCodec';
import { validateRuleDefinition } from './templateRuleSchema';

type FlatCategoryNode = {
  tempId: string;
  parentTempId: string | null;
  name: string;
  sortOrder: number;
};

type FlatItemNode = {
  categoryTempId: string | null;
  name: string;
  sortOrder: number;
  required: boolean;
  valueType: string;
  ruleType: string;
  threshold: string | null;
  displayCondition: string | null;
  operationGuide: string | null;
  suggestionRule: string | null;
  suggestionContent: string | null;
  hazardContent: string | null;
  maintenanceDescription: string | null;
};

function isDetectionNode(node: SchemeItem): boolean {
  return (
    (node.type !== undefined && node.required !== undefined) ||
    !!node.dataType ||
    !!node.ruleType
  );
}

function toThreshold(node: SchemeItem): string | null {
  if (node.thresholdRaw?.trim()) {
    return node.thresholdRaw.trim();
  }

  const hasNumeric =
    node.standardValue !== undefined ||
    node.minThreshold !== undefined ||
    node.maxThreshold !== undefined ||
    node.tolerance !== undefined ||
    !!node.unit;
  if (hasNumeric) {
    return JSON.stringify({
      standard: node.standardValue,
      min: node.minThreshold,
      max: node.maxThreshold,
      tolerance: node.tolerance,
      unit: node.unit,
    });
  }
  if (node.expectedResult) {
    const options = node.expectedResult.split('/').map((x) => x.trim()).filter(Boolean);
    if (options.length > 1) {
      if (node.dataType === 'enum' || node.ruleType === 'enum' || node.type === 'functional') {
        return JSON.stringify({ options, normal_values: options.slice(0, 1) });
      }
      return JSON.stringify({ options, normal_value: options[0] });
    }
    const text = node.expectedResult.trim().toLowerCase();
    if (['是', 'true', 'yes', '正常'].includes(text)) {
      return JSON.stringify({ normal_value: true });
    }
    if (['否', 'false', 'no', '异常'].includes(text)) {
      return JSON.stringify({ normal_value: false });
    }
  }
  return null;
}

function mapRule(node: SchemeItem): { valueType: string; ruleType: string } {
  if (node.dataType || node.ruleType) {
    return {
      valueType: node.dataType || 'number',
      ruleType: node.ruleType || 'number_range',
    };
  }
  if (node.type === 'electrical' || node.type === 'environment') {
    return { valueType: 'number', ruleType: 'number_range' };
  }
  if (node.type === 'functional') {
    return { valueType: 'enum', ruleType: 'enum' };
  }
  return { valueType: 'boolean', ruleType: 'boolean_equal' };
}

function flattenScheme(items: SchemeItem[]): {
  categories: FlatCategoryNode[];
  inspectionItems: FlatItemNode[];
} {
  const categories: FlatCategoryNode[] = [];
  const inspectionItems: FlatItemNode[] = [];

  const walk = (nodes: SchemeItem[], parentTempId: string | null) => {
    nodes.forEach((node, idx) => {
      if (isDetectionNode(node)) {
        const mappedRule = mapRule(node);
        const validatedRule = validateRuleDefinition({
          valueTypeRaw: node.dataType || mappedRule.valueType,
          ruleTypeRaw: node.ruleType || mappedRule.ruleType,
          ruleRaw: toThreshold(node),
          context: `检测项「${node.name}」`,
        });
        inspectionItems.push({
          categoryTempId: parentTempId,
          name: node.name,
          sortOrder: node.sortOrder ?? idx + 1,
          required: node.required !== false,
                    priority: node.priority?.trim() || mapRequiredToPriority(node.required),
          valueType: validatedRule.valueType,
          ruleType: validatedRule.ruleType,
          threshold: validatedRule.ruleRaw,
          displayCondition: encodeDisplayCondition(node.displayCondition),
          operationGuide: node.operationGuide?.trim() || node.testProcedure?.trim() || null,
          suggestionRule: node.suggestionRule?.trim() || null,
          suggestionContent: node.suggestionContent?.trim() || null,
          hazardContent: node.hazardContent?.trim() || null,
          maintenanceDescription: node.maintenanceDescription?.trim() || null,
        });
        return;
      }
      const tempId = node.id || `cat-${Date.now()}-${idx}`;
      categories.push({
        tempId,
        parentTempId,
        name: node.name,
        sortOrder: idx + 1,
      });
      walk(node.children ?? [], tempId);
    });
  };

  walk(items, null);
  return { categories, inspectionItems };
}

export async function syncTemplateNodes(templateId: number, items: SchemeItem[]): Promise<void> {
  return syncTemplateNodesWithProgress(templateId, items, () => {});
}

export async function syncTemplateNodesWithProgress(
  templateId: number,
  items: SchemeItem[],
  onProgress: (progress: { percent: number; message: string }) => void,
): Promise<void> {
  const emit = (percent: number, message: string) => {
    onProgress({ percent: Math.max(0, Math.min(100, Math.round(percent))), message });
  };
  emit(2, '正在读取现有检测项...');

  const [allCategories, allItems] = await Promise.all([
    inspectionCategoriesApi.listInspectionCategories(),
    inspectionItemsApi.listInspectionItems(),
  ]);

  const oldCategories = allCategories.filter((x) => x.templateid === templateId);
  const oldItems = allItems.filter((x) => x.templateid === templateId);

  const { categories, inspectionItems } = flattenScheme(items);
  const totalOps =
    oldItems.length +
    oldCategories.length +
    categories.length +
    inspectionItems.length;
  let doneOps = 0;
  const tick = (stage: string) => {
    doneOps += 1;
    const percent = totalOps > 0 ? 5 + (doneOps / totalOps) * 90 : 95;
    emit(percent, stage);
  };

  for (const item of oldItems) {
    await inspectionItemsApi.deleteInspectionItem(item.itemid);
    tick('正在删除旧检测项...');
  }
  for (const category of oldCategories) {
    await inspectionCategoriesApi.deleteInspectionCategory(category.categoryid);
    tick('正在删除旧分类...');
  }

  const tempToRealCategoryId = new Map<string, number>();

  for (const category of categories) {
    const parentId = category.parentTempId ? (tempToRealCategoryId.get(category.parentTempId) ?? 0) : 0;
    const newId = await inspectionCategoriesApi.createInspectionCategory({
      templateid: templateId,
      parentId,
      name: category.name,
      sortOrder: category.sortOrder,
    });
    tempToRealCategoryId.set(category.tempId, newId);
    tick('正在创建分类...');
  }

  for (const item of inspectionItems) {
    const categoryid = item.categoryTempId ? (tempToRealCategoryId.get(item.categoryTempId) ?? null) : null;
    await inspectionItemsApi.createInspectionItem({
      templateid: templateId,
      categoryid,
      name: item.name,
      valueType: item.valueType,
      ruleType: item.ruleType,
      threshold: item.threshold,
      sortOrder: item.sortOrder,
      priority: mapRequiredToPriority(item.required),
      displayCondition: item.displayCondition,
      operationGuide: item.operationGuide,
      suggestionRule: item.suggestionRule,
      suggestionContent: item.suggestionContent,
      hazardContent: item.hazardContent,
      maintenanceDescription: item.maintenanceDescription,
    });
    tick('正在创建检测项...');
  }

  emit(100, '同步完成');
}
