function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function nowChinaDateTime(): string {
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
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );

  return `${values.year}-${pad(Number(values.month))}-${pad(Number(values.day))}T${pad(Number(values.hour))}:${pad(Number(values.minute))}:${pad(Number(values.second))}`;
}