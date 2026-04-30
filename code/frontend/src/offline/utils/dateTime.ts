function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatChinaDateTimeParts(date: Date): string {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${values.year}-${pad(Number(values.month))}-${pad(Number(values.day))} ${pad(Number(values.hour))}:${pad(Number(values.minute))}`;
}

function formatChinaOffsetDateTimeParts(date: Date): string {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${values.year}-${pad(Number(values.month))}-${pad(Number(values.day))}T${pad(Number(values.hour))}:${pad(Number(values.minute))}:${pad(Number(values.second))}+08:00`;
}

export function nowChinaDateTime(): string {
  return formatChinaDateTimeParts(new Date());
}

export function nowChinaTimestamptz(): string {
  return formatChinaOffsetDateTimeParts(new Date());
}

export function normalizeChinaDateTime(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatChinaDateTimeParts(parsed);
  }

  const normalized = text.replace('T', ' ');
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  return matched?.[1] ?? normalized;
}

export function toChinaTimestamptz(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const matchedLocal = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (matchedLocal) {
    const [, year, month, day, hour, minute, second] = matchedLocal;
    return `${year}-${month}-${day}T${hour}:${minute}:${second ?? '00'}+08:00`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatChinaOffsetDateTimeParts(parsed);
  }

  return null;
}