/**
 * 方案相关的工具函数
 */

export interface SchemeItem {
  id: string;
  name: string;
  // 模板标准字段
  dataType?: string;
  priority?: string;
  operationGuide?: string;
  displayCondition?: string;
  suggestionRule?: string;
  suggestionContent?: string;
  hazardContent?: string;
  maintenanceDescription?: string;
  ruleType?: string;
  thresholdRaw?: string;
  param1?: string;
  param2?: string;
  // 兼容历史字段
  type?: string;
  required?: boolean;
  standardValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  unit?: string;
  testProcedure?: string;
  expectedResult?: string;
  tolerance?: number;
  children?: SchemeItem[];
}

export interface AtomicScheme {
  id: string;
  name: string;
  type: 'peripheral' | 'equipment';
  description?: string;
  deviceTypes?: string[];
  categoryId?: string;
  subCategoryId?: string;
  model?: string;
  items: SchemeItem[];
}

export function mapRequiredToPriority(required: boolean | undefined): string {
  return required !== false ? 'True' : 'False';
}

export function mapPriorityToRequired(priority: string | null | undefined): boolean {
  const normalized = String(priority ?? '').trim().toLowerCase();
  if (!normalized) return true;
  if (['false', '0', 'no', 'n', 'low', '否'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'y', '是'].includes(normalized)) return true;
  return true;
}

/**
 * 判断是否为检测项目（第四层，有 type 和 required 字段）
 */
export const isDetectionItem = (item: any): boolean => {
  return item.type !== undefined && item.required !== undefined;
};

/**
 * 获取类型标签
 */
export const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    visual: '外观',
    electrical: '电气',
    functional: '功能',
    environment: '环境',
  };
  return typeMap[type] || type;
};

/**
 * 查找项目
 */
export const findItemById = (items: SchemeItem[], id: string): SchemeItem | null => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 将方案数据转换为 TreeModel
 */
import { TreeModel } from '@siemens/ix';

export const convertToTreeModel = (items: SchemeItem[]): TreeModel<any> => {
  const model: TreeModel<any> = {
    root: {
      id: 'root',
      data: { name: '' },
      hasChildren: items.length > 0,
      children: items.map(item => item.id),
    },
  };
  
  function processItems(items: SchemeItem[]) {
    items.forEach(item => {
      const hasChildren = item.children && item.children.length > 0;
      const isItem = isDetectionItem(item);
      
      // 检测项目（第四层）显示类型和必填信息
      let displayName = item.name;
      if (isItem) {
        const typeLabel = getTypeLabel(item.type || '');
        const requiredLabel = item.required !== false ? ' [必填]' : ' [可选]';
        displayName = `${item.name} (${typeLabel}${requiredLabel})`;
      }
      
      model[item.id] = {
        id: item.id,
        data: { 
          ...item,
          name: displayName,
          originalName: item.name,
          type: item.type || '',
          required: item.required !== false,
          isDetectionItem: isItem,
        },
        hasChildren: !!hasChildren,
        children: hasChildren ? item.children!.map(child => child.id) : [],
      };
      
      if (hasChildren) {
        processItems(item.children!);
      }
    });
  }
  
  processItems(items);
  return model;
};

/**
 * 扁平化的行数据接口（用于 ag-grid community 版本）
 */
export interface FlatRow {
  id: string;
  name: string;
  level: number;
  parentId?: string;
  dataType?: string;
  priority?: string;
  operationGuide?: string;
  displayCondition?: string;
  suggestionRule?: string;
  suggestionContent?: string;
  hazardContent?: string;
  maintenanceDescription?: string;
  ruleType?: string;
  thresholdRaw?: string;
  param1?: string;
  param2?: string;
  type?: string;
  typeLabel?: string;
  required?: boolean;
  requiredLabel?: string;
  unit?: string;
  standardValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
  testProcedure?: string;
  expectedResult?: string;
  tolerance?: number;
  isDetectionItem: boolean;
  hasChildren: boolean;
  expanded?: boolean;
}

/**
 * 将嵌套的检测项目转换为扁平化的行数据（用于 ag-grid community 版本）
 */
export const convertToFlatRows = (items: SchemeItem[], parentId?: string, level: number = 0): FlatRow[] => {
  const result: FlatRow[] = [];
  
  items.forEach((item) => {
    const isItem = isDetectionItem(item);
    const hasChildren = item.children && item.children.length > 0;
    
    const row: FlatRow = {
      id: item.id,
      name: item.name,
      level: level,
      parentId: parentId,
      dataType: item.dataType,
      priority: item.priority,
      operationGuide: item.operationGuide ?? item.testProcedure,
      displayCondition: item.displayCondition,
      suggestionRule: item.suggestionRule,
      suggestionContent: item.suggestionContent,
      hazardContent: item.hazardContent,
      maintenanceDescription: item.maintenanceDescription,
      ruleType: item.ruleType,
      thresholdRaw: item.thresholdRaw,
      param1: item.param1 ?? (item.minThreshold !== undefined ? String(item.minThreshold) : undefined),
      param2: item.param2 ?? (item.maxThreshold !== undefined ? String(item.maxThreshold) : undefined),
      type: item.type,
      typeLabel: item.type ? getTypeLabel(item.type) : undefined,
      required: item.required,
      requiredLabel: item.required !== false ? '必填' : '可选',
      unit: item.unit,
      standardValue: item.standardValue,
      minThreshold: item.minThreshold,
      maxThreshold: item.maxThreshold,
      testProcedure: item.testProcedure,
      expectedResult: item.expectedResult,
      tolerance: item.tolerance,
      isDetectionItem: isItem,
      hasChildren: !!hasChildren,
      expanded: level < 2, // 默认展开前两层
    };
    
    result.push(row);
    
    if (hasChildren && item.children) {
      const childRows = convertToFlatRows(item.children, item.id, level + 1);
      result.push(...childRows);
    }
  });
  
  return result;
};
