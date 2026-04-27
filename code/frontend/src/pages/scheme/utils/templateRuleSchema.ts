export type SupportedValueType = 'number' | 'boolean' | 'enum' | 'text';

export type SupportedRuleType = 'number_range' | 'boolean_equal' | 'enum' | 'text_pattern';

export type AutoResultState = '' | 'normal' | 'abnormal';

type RuleObject = Record<string, unknown>;

function asFiniteNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function isPlainObject(value: unknown): value is RuleObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function inferNumericStep(precision: number): number {
  if (precision <= 0) {
    return 1;
  }
  return 10 ** -precision;
}

export function getDefaultRuleTypeForValueType(valueType: SupportedValueType): SupportedRuleType {
  if (valueType === 'number') return 'number_range';
  if (valueType === 'boolean') return 'boolean_equal';
  if (valueType === 'enum') return 'enum';
  return 'text_pattern';
}

export function getDefaultRuleJsonForValueType(valueType: SupportedValueType): string {
  if (valueType === 'number') {
    return JSON.stringify({ min: 0, max: 100, unit: '', precision: 0 }, null, 2);
  }
  if (valueType === 'boolean') {
    return JSON.stringify({ options: ['是', '否'], normal_value: '是' }, null, 2);
  }
  if (valueType === 'enum') {
    return JSON.stringify({ options: ['选项1', '选项2'], normal_values: ['选项1'] }, null, 2);
  }
  return JSON.stringify({ pattern: '', message: '' }, null, 2);
}

export function normalizeSupportedValueType(value: unknown): SupportedValueType | null {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (text === 'number' || text === 'numeric' || text === '数值') return 'number';
  if (text === 'boolean' || text === 'bool' || text === '布尔') return 'boolean';
  if (text === 'enum' || text === 'select' || text === '枚举') return 'enum';
  if (text === 'text' || text === 'string' || text === '文本') return 'text';
  return null;
}

export function normalizeSupportedRuleType(value: unknown): SupportedRuleType | null {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (text === 'number_range') return 'number_range';
  if (text === 'boolean_equal') return 'boolean_equal';
  if (text === 'enum' || text === 'select_include') return 'enum';
  if (text === 'text_pattern') return 'text_pattern';
  return null;
}

function parseRuleObject(ruleRaw: string, context: string): RuleObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(ruleRaw);
  } catch {
    throw new Error(`${context} 的 rule 不是合法 JSON`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`${context} 的 rule 必须是 JSON 对象`);
  }

  return parsed;
}

function assertSupportedCombination(
  valueType: SupportedValueType,
  ruleType: SupportedRuleType,
  context: string,
): void {
  const valid =
    (valueType === 'number' && ruleType === 'number_range') ||
    (valueType === 'boolean' && ruleType === 'boolean_equal') ||
    (valueType === 'enum' && ruleType === 'enum') ||
    (valueType === 'text' && ruleType === 'text_pattern');

  if (!valid) {
    throw new Error(`${context} 不支持组合：value_type=${valueType}, rule_type=${ruleType}`);
  }
}

export function validateRuleDefinition(params: {
  valueTypeRaw: unknown;
  ruleTypeRaw: unknown;
  ruleRaw?: string | null;
  context?: string;
}): {
  valueType: SupportedValueType;
  ruleType: SupportedRuleType;
  ruleRaw: string | null;
  ruleObject: RuleObject | null;
} {
  const context = params.context ?? '检测项';
  const valueType = normalizeSupportedValueType(params.valueTypeRaw);
  if (!valueType) {
    throw new Error(`${context} 的 value_type 不支持：${String(params.valueTypeRaw ?? '')}`);
  }

  const ruleType = normalizeSupportedRuleType(params.ruleTypeRaw);
  if (!ruleType) {
    throw new Error(`${context} 的 rule_type 不支持：${String(params.ruleTypeRaw ?? '')}`);
  }

  assertSupportedCombination(valueType, ruleType, context);

  const trimmedRule = String(params.ruleRaw ?? '').trim();
  if (ruleType === 'text_pattern' && !trimmedRule) {
    return {
      valueType,
      ruleType,
      ruleRaw: null,
      ruleObject: null,
    };
  }

  if (!trimmedRule) {
    throw new Error(`${context} 的 rule 不能为空`);
  }

  const ruleObject = parseRuleObject(trimmedRule, context);

  if (ruleType === 'number_range') {
    const min = asFiniteNumber(ruleObject.min);
    const max = asFiniteNumber(ruleObject.max);
    const precision = ruleObject.precision == null ? 0 : asFiniteNumber(ruleObject.precision);
    const step = ruleObject.step == null ? undefined : asFiniteNumber(ruleObject.step);

    if (min != null && max != null && min > max) {
      throw new Error(`${context} 的 number_range 要满足 min <= max`);
    }
    if (precision != null && (!Number.isInteger(precision) || precision < 0)) {
      throw new Error(`${context} 的 precision 必须是大于等于 0 的整数`);
    }
    if (step != null && step <= 0) {
      throw new Error(`${context} 的 step 必须大于 0`);
    }
  }

  if (ruleType === 'boolean_equal') {
    const normalValue = ruleObject.normal_value;
    if (normalValue == null || (typeof normalValue !== 'string' && typeof normalValue !== 'boolean')) {
      throw new Error(`${context} 的 boolean_equal 必须包含 normal_value`);
    }
    if (ruleObject.options != null) {
      if (!isStringArray(ruleObject.options) || ruleObject.options.length === 0) {
        throw new Error(`${context} 的 boolean_equal.options 必须是非空字符串数组`);
      }
      if (!ruleObject.options.includes(String(normalValue))) {
        throw new Error(`${context} 的 normal_value 必须属于 options`);
      }
    }
  }

  if (ruleType === 'enum') {
    if (!isStringArray(ruleObject.options) || ruleObject.options.length === 0) {
      throw new Error(`${context} 的 enum 必须包含非空 options 数组`);
    }
    if (ruleObject.normal_values != null) {
      if (!isStringArray(ruleObject.normal_values)) {
        throw new Error(`${context} 的 normal_values 必须是字符串数组`);
      }
      const invalidValue = ruleObject.normal_values.find((entry) => !ruleObject.options.includes(entry));
      if (invalidValue) {
        throw new Error(`${context} 的 normal_values 必须属于 options`);
      }
    }
  }

  if (ruleType === 'text_pattern') {
    if (ruleObject.pattern != null && typeof ruleObject.pattern !== 'string') {
      throw new Error(`${context} 的 text_pattern.pattern 必须是字符串`);
    }
    if (ruleObject.message != null && typeof ruleObject.message !== 'string') {
      throw new Error(`${context} 的 text_pattern.message 必须是字符串`);
    }
  }

  return {
    valueType,
    ruleType,
    ruleRaw: trimmedRule,
    ruleObject,
  };
}

export type DynamicFieldConfig = {
  dataType: 'numeric' | 'boolean' | 'enum' | 'string';
  unit?: string;
  options?: string[];
  normalValue?: string | boolean;
  normalValues?: string[];
  min?: number;
  max?: number;
  precision: number;
  step: number;
  pattern?: string;
  message?: string;
};

export function buildDynamicFieldConfig(input: {
  dataType?: string | null;
  ruleType?: string | null;
  thresholdRaw?: string | null;
  unit?: string | null;
  minThreshold?: number;
  maxThreshold?: number;
}): DynamicFieldConfig {
  const valueType = normalizeSupportedValueType(input.dataType) ?? 'text';
  const normalizedRuleType = normalizeSupportedRuleType(input.ruleType);
  const fallbackRuleType = getDefaultRuleTypeForValueType(valueType);
  const ruleType = normalizedRuleType ?? fallbackRuleType;

  let ruleObject: RuleObject | null = null;
  const raw = String(input.thresholdRaw ?? '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isPlainObject(parsed)) {
        ruleObject = parsed;
      }
    } catch {
      ruleObject = null;
    }
  }

  if (valueType === 'number' && ruleType === 'number_range') {
    const precisionValue = ruleObject ? asFiniteNumber(ruleObject.precision) : undefined;
    const precision = precisionValue != null && Number.isInteger(precisionValue) && precisionValue >= 0
      ? precisionValue
      : 0;
    const stepValue = ruleObject ? asFiniteNumber(ruleObject.step) : undefined;
    return {
      dataType: 'numeric',
      unit: typeof ruleObject?.unit === 'string' ? ruleObject.unit : input.unit ?? undefined,
      min: ruleObject ? asFiniteNumber(ruleObject.min) ?? input.minThreshold : input.minThreshold,
      max: ruleObject ? asFiniteNumber(ruleObject.max) ?? input.maxThreshold : input.maxThreshold,
      precision,
      step: stepValue && stepValue > 0 ? stepValue : inferNumericStep(precision),
    };
  }

  if (valueType === 'boolean' && ruleType === 'boolean_equal') {
    const options = isStringArray(ruleObject?.options) && ruleObject.options.length > 0
      ? ruleObject.options
      : ['是', '否'];
    return {
      dataType: 'boolean',
      options,
      normalValue:
        typeof ruleObject?.normal_value === 'string' || typeof ruleObject?.normal_value === 'boolean'
          ? ruleObject.normal_value
          : undefined,
      precision: 0,
      step: 1,
    };
  }

  if (valueType === 'enum' && ruleType === 'enum') {
    return {
      dataType: 'enum',
      options: isStringArray(ruleObject?.options) ? ruleObject.options : [],
      normalValues: isStringArray(ruleObject?.normal_values) ? ruleObject.normal_values : undefined,
      precision: 0,
      step: 1,
    };
  }

  return {
    dataType: 'string',
    pattern: typeof ruleObject?.pattern === 'string' ? ruleObject.pattern : undefined,
    message: typeof ruleObject?.message === 'string' ? ruleObject.message : undefined,
    precision: 0,
    step: 1,
  };
}

export function evaluateFieldValueAgainstRule(input: {
  dataType?: string | null;
  ruleType?: string | null;
  thresholdRaw?: string | null;
  value: unknown;
}): AutoResultState {
  const dynamicConfig = buildDynamicFieldConfig({
    dataType: input.dataType,
    ruleType: input.ruleType,
    thresholdRaw: input.thresholdRaw,
  });
  const textValue = String(input.value ?? '').trim();
  if (!textValue) {
    return '';
  }

  if (dynamicConfig.dataType === 'numeric') {
    const numericValue = Number(textValue);
    if (!Number.isFinite(numericValue)) {
      return 'abnormal';
    }
    if (dynamicConfig.precision <= 0 && !Number.isInteger(numericValue)) {
      return 'abnormal';
    }
    if (dynamicConfig.min != null && numericValue < dynamicConfig.min) {
      return 'abnormal';
    }
    if (dynamicConfig.max != null && numericValue > dynamicConfig.max) {
      return 'abnormal';
    }
    return 'normal';
  }

  if (dynamicConfig.dataType === 'boolean') {
    if (dynamicConfig.normalValue == null) {
      return 'normal';
    }
    return textValue === String(dynamicConfig.normalValue) ? 'normal' : 'abnormal';
  }

  if (dynamicConfig.dataType === 'enum') {
    if (!dynamicConfig.normalValues || dynamicConfig.normalValues.length === 0) {
      return 'normal';
    }
    return dynamicConfig.normalValues.includes(textValue) ? 'normal' : 'abnormal';
  }

  if (!dynamicConfig.pattern) {
    return 'normal';
  }

  try {
    return new RegExp(dynamicConfig.pattern).test(textValue) ? 'normal' : 'abnormal';
  } catch {
    return 'abnormal';
  }
}