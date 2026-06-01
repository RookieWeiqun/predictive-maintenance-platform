import * as XLSX from 'xlsx';
import type { SchemeItem } from './schemeUtils';
import {
  normalizeSupportedRuleType,
  normalizeSupportedValueType,
  validateRuleDefinition,
} from './templateRuleSchema';

type RawRow = Record<string, unknown>;

const TYPE_MAP: Record<string, SchemeItem['type']> = {
  visual: 'visual',
  外观: 'visual',
  electrical: 'electrical',
  电气: 'electrical',
  functional: 'functional',
  功能: 'functional',
  environment: 'environment',
  环境: 'environment',
};

const LEVEL_KEY_GROUPS = [
  ['2-装置级', '3-模块级', '4-检测项目', '5-检测项明细'],
  ['一级', '二级', '三级', '四级', '五级'],
  ['1-系统级', '2-装置级', '3-模块级', '4-检测项目', '5-检测项明细'],
] as const;

const ITEM_NAME_KEYS = ['检测项目', '项目名称', '名称', '5-检测项明细', '4-检测项目'] as const;
const TYPE_KEYS = ['检测类型', '类型', '数据类型'] as const;
const REQUIRED_KEYS = ['必填', '是否必填'] as const;
const UNIT_KEYS = ['单位'] as const;
const STANDARD_VALUE_KEYS = ['标准值'] as const;
const MIN_KEYS = ['最小阈值', '参数1'] as const;
const MAX_KEYS = ['最大阈值', '参数2'] as const;
const PROCEDURE_KEYS = ['测试步骤', '操作指导'] as const;
const EXPECTED_RESULT_KEYS = ['预期结果'] as const;
const TOLERANCE_KEYS = ['允许偏差'] as const;
const RULE_TYPE_KEYS = ['规则类型'] as const;
const THRESHOLD_KEYS = ['规则', 'threshold', 'Threshold'] as const;
const DATA_TYPE_KEYS = ['数据类型'] as const;
const PRIORITY_KEYS = ['权重', '优先级'] as const;
const OPERATION_GUIDE_KEYS = ['操作指导', '测试步骤'] as const;
const DISPLAY_CONDITION_KEYS = ['显示条件'] as const;
const SUGGESTION_RULE_KEYS = ['建议规则'] as const;
const SUGGESTION_CONTENT_KEYS = ['建议内容'] as const;
const HAZARD_CONTENT_KEYS = ['隐患内容'] as const;
const MAINTENANCE_DESCRIPTION_KEYS = ['维护说明'] as const;
const PARAM1_KEYS = ['参数1', '最小阈值'] as const;
const PARAM2_KEYS = ['参数2', '最大阈值'] as const;

function getString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseNumber(value: unknown): number | undefined {
  const text = getString(value);
  if (!text) return undefined;
  const n = Number.parseFloat(text);
  return Number.isFinite(n) ? n : undefined;
}

function parseRequired(value: unknown): boolean {
  const text = getString(value).toLowerCase();
  if (!text) return true;
  if (['high', 'medium', 'critical'].includes(text)) return true;
  if (text === 'low') return false;
  return !['否', 'false', '0', '可选', 'n', 'no'].includes(text);
}

function parseType(value: unknown): SchemeItem['type'] {
  const normalized = normalizeSupportedValueType(value);
  if (normalized === 'number') return 'electrical';
  if (normalized === 'boolean') return 'functional';
  if (normalized === 'enum') return 'functional';
  if (normalized === 'text') return 'visual';
  const text = getString(value).toLowerCase();
  return TYPE_MAP[text] ?? 'visual';
}

function parseRuleType(value: unknown): string {
  const normalized = normalizeSupportedRuleType(value);
  if (normalized) {
    return normalized;
  }
  const text = getString(value);
  if (!text) return 'number_range';
  if (text.includes('判断')) return 'boolean_equal';
  if (text.includes('阈值')) return 'number_range';
  return text;
}

function parseThresholdRaw(value: unknown): string | undefined {
  const text = getString(value);
  return text || undefined;
}

function getFirstValue(row: RawRow, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (getString(value)) return value;
  }
  return undefined;
}

function createNode(name: string): SchemeItem {
  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name,
    children: [],
  };
}

function getItemName(row: RawRow): string {
  for (const key of ITEM_NAME_KEYS) {
    const value = getString(row[key]);
    if (value) return value;
  }
  return '';
}

function detectLevelKeys(rows: RawRow[]): readonly string[] {
  for (const keys of LEVEL_KEY_GROUPS) {
    const hasAny = rows.some((row) => keys.some((key) => getString(row[key])));
    if (hasAny) return keys;
  }
  return LEVEL_KEY_GROUPS[0];
}

function normalizeLevelsByCarry(
  row: RawRow,
  keys: readonly string[],
  previousLevels: string[],
): string[] {
  const normalized = [...previousLevels];
  keys.forEach((key, idx) => {
    const current = getString(row[key]);
    if (current) {
      normalized[idx] = current;
      // 当前层级变化后，后续层级全部清空，避免串层级
      for (let i = idx + 1; i < normalized.length; i += 1) {
        normalized[i] = '';
      }
    }
  });
  return normalized;
}

function getLevelPath(row: RawRow, keys: readonly string[]): string[] {
  const cols = keys.map((key) => getString(row[key])).filter(Boolean);
  if (cols.length > 0) return cols;

  const pathText = getString(row['层级路径'] ?? row['路径']);
  if (!pathText) return [];
  return pathText
    .split(/[\/>＞\\|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function ensurePath(roots: SchemeItem[], path: string[]): SchemeItem[] {
  let current = roots;
  const chain: SchemeItem[] = [];
  for (const levelName of path) {
    let node = current.find((x) => x.name === levelName);
    if (!node) {
      node = createNode(levelName);
      current.push(node);
    }
    chain.push(node);
    if (!node.children) node.children = [];
    current = node.children;
  }
  return chain;
}

export function importInspectionItemsFromExcel(file: File): Promise<SchemeItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = reader.result;
        if (!(data instanceof ArrayBuffer)) {
          reject(new Error('Excel 文件读取失败'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Excel 中未找到工作表'));
          return;
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
        if (!rows.length) {
          reject(new Error('Excel 内容为空'));
          return;
        }

        const roots: SchemeItem[] = [];
        const levelKeys = detectLevelKeys(rows);
        let previousLevels = new Array(levelKeys.length).fill('') as string[];

        rows.forEach((row, index) => {
          const itemName = getItemName(row);
          if (!itemName) return;

          const filledLevels = normalizeLevelsByCarry(row, levelKeys, previousLevels);
          previousLevels = filledLevels;

          // 路径不包含当前行的叶子名称，避免“叶子节点重复包一层”
          const leafColumnValue = getString(row['5-检测项明细']) || itemName;
          const path = filledLevels
            .map((x) => x.trim())
            .filter((x) => x && x !== leafColumnValue);
          const fallbackPath = getLevelPath(row, levelKeys);
          const effectivePath = path.length ? path : fallbackPath;
          const chain = ensurePath(roots, effectivePath);
          const parent = chain[chain.length - 1];
          const siblings = parent ? (parent.children ?? (parent.children = [])) : roots;

          const rawDataType = getFirstValue(row, DATA_TYPE_KEYS);
          const rawRuleType = getFirstValue(row, RULE_TYPE_KEYS);
          const rawThreshold = parseThresholdRaw(getFirstValue(row, THRESHOLD_KEYS));
          const validatedRule = validateRuleDefinition({
            valueTypeRaw: rawDataType,
            ruleTypeRaw: rawRuleType,
            ruleRaw: rawThreshold,
            context: `Excel 第 ${index + 2} 行「${itemName}」`,
          });
          const requiredRaw = getFirstValue(row, [...REQUIRED_KEYS, ...PRIORITY_KEYS]);
          const ruleType = validatedRule.ruleType;
          const param1 = getFirstValue(row, ['参数1']);
          const param2 = getFirstValue(row, ['参数2']);
          const minThreshold = parseNumber(getFirstValue(row, MIN_KEYS));
          const maxThreshold = parseNumber(getFirstValue(row, MAX_KEYS));
          const expectedFromParams =
            ruleType === '判断'
              ? `${getString(param1) || '是'} / ${getString(param2) || '否'}`
              : undefined;

          const detectionItem: SchemeItem = {
            id: `import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            name: itemName,
            sortOrder: index + 1,
            dataType: validatedRule.valueType,
            operationGuide: getString(getFirstValue(row, OPERATION_GUIDE_KEYS)) || undefined,
            displayCondition: getString(getFirstValue(row, DISPLAY_CONDITION_KEYS)) || undefined,
            suggestionRule: getString(getFirstValue(row, SUGGESTION_RULE_KEYS)) || undefined,
            suggestionContent: getString(getFirstValue(row, SUGGESTION_CONTENT_KEYS)) || undefined,
            hazardContent: getString(getFirstValue(row, HAZARD_CONTENT_KEYS)) || undefined,
            maintenanceDescription: getString(getFirstValue(row, MAINTENANCE_DESCRIPTION_KEYS)) || undefined,
            ruleType: parseRuleType(rawRuleType),
            thresholdRaw: validatedRule.ruleRaw ?? undefined,
            param1: getString(getFirstValue(row, PARAM1_KEYS)) || undefined,
            param2: getString(getFirstValue(row, PARAM2_KEYS)) || undefined,
            type: parseType(validatedRule.valueType || getFirstValue(row, TYPE_KEYS)),
            required: parseRequired(requiredRaw),
            unit: getString(getFirstValue(row, UNIT_KEYS)) || undefined,
            standardValue: parseNumber(getFirstValue(row, STANDARD_VALUE_KEYS)),
            minThreshold,
            maxThreshold,
            testProcedure: getString(getFirstValue(row, PROCEDURE_KEYS)) || undefined,
            expectedResult: getString(getFirstValue(row, EXPECTED_RESULT_KEYS)) || expectedFromParams,
            tolerance: parseNumber(getFirstValue(row, TOLERANCE_KEYS)),
          };

          siblings.push(detectionItem);
        });

        if (!roots.length) {
          reject(new Error('未解析到有效检测项目，请检查 Excel 列名与数据'));
          return;
        }

        resolve(roots);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Excel 解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}
