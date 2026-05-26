type DisplayConditionOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

type DisplayConditionClause = {
  field: string;
  operator: DisplayConditionOperator;
  value: string | number | boolean;
};

type DisplayConditionJson = {
  logic: 'AND' | 'OR' | 'CUSTOM';
  conditions: DisplayConditionClause[];
};

function normalizeConditionValue(raw: string): string | number | boolean {
  const text = raw.trim();
  if (!text) return '';
  if (text === '是') return true;
  if (text === '否') return false;
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && text === String(numeric)) {
    return numeric;
  }
  return text;
}

function parseClause(input: string): DisplayConditionClause | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = /^(.*?)(>=|<=|!=|=|>|<)(.*)$/.exec(trimmed);
  if (!match) return null;
  const field = match[1]?.trim() ?? '';
  const operator = (match[2] ?? '=') as DisplayConditionOperator;
  const right = match[3]?.trim() ?? '';
  if (!field || !right) return null;
  return {
    field,
    operator,
    value: normalizeConditionValue(right),
  };
}

export function encodeDisplayCondition(raw: string | null | undefined): string | null {
  const expression = String(raw ?? '').trim();
  if (!expression) return null;

  const segments = expression.split(/\s+(And|Or)\s+/i).filter(Boolean);
  const clauses: DisplayConditionClause[] = [];
  const connectors: string[] = [];

  segments.forEach((segment, index) => {
    if (index % 2 === 1) {
      connectors.push(segment.trim().toUpperCase());
      return;
    }
    const clause = parseClause(segment);
    if (clause) clauses.push(clause);
  });

  let logic: DisplayConditionJson['logic'] = 'CUSTOM';
  if (connectors.length > 0 && connectors.every((x) => x === 'AND')) logic = 'AND';
  else if (connectors.length > 0 && connectors.every((x) => x === 'OR')) logic = 'OR';
  else if (clauses.length === 1 && connectors.length === 0) logic = 'AND';

  return JSON.stringify({
    logic,
    conditions: clauses,
  } satisfies DisplayConditionJson);
}

export function decodeDisplayCondition(raw: string | null | undefined): string {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text) as {
      expression?: unknown;
      logic?: unknown;
      conditions?: Array<{ field?: unknown; operator?: unknown; value?: unknown }>;
    };
    if (typeof parsed.expression === 'string' && parsed.expression.trim()) {
      return parsed.expression.trim();
    }
    if (Array.isArray(parsed.conditions) && parsed.conditions.length > 0) {
      const normalizedLogic = String(parsed.logic ?? 'AND').trim().toUpperCase();
      const joiner = normalizedLogic === 'OR' ? ' Or ' : ' And ';
      return parsed.conditions
        .map((condition) => {
          const field = String(condition.field ?? '').trim();
          const operator = String(condition.operator ?? '').trim();
          const value = condition.value;
          if (!field || !operator || value === undefined || value === null) return '';
          const encodedValue =
            typeof value === 'boolean' ? (value ? '是' : '否') : String(value).trim();
          return `${field}${operator}${encodedValue}`;
        })
        .filter(Boolean)
        .join(joiner);
    }
  } catch {
    // keep legacy plain-text content as-is
  }
  return text;
}