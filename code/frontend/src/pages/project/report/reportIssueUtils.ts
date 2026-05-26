import type { InspectionTaskDetailDto } from '@/api/modules/inspectionTasks';

type ReportTaskItem = InspectionTaskDetailDto['task_items'][number];

function normalizeResultText(value: unknown): string {
  return String(value ?? '').trim();
}

export function getIssueSuggestionText(item: ReportTaskItem): string {
  const resultBlock = item.task_result ?? item.taskresult;
  const hazardResolved = typeof resultBlock?.hazardResolved === 'boolean'
    ? resultBlock.hazardResolved
    : null;
  const actionTaken = normalizeResultText(resultBlock?.actionTaken);
  const recommendationContent = normalizeResultText(resultBlock?.recommendationContent);

  if (hazardResolved === true && actionTaken) {
    return `处理结果：已处理\n解决措施：${actionTaken}`;
  }

  if (hazardResolved === false && recommendationContent) {
    return `处理结果：未处理\n建议：${recommendationContent}`;
  }

  if (hazardResolved === true) {
    return '处理结果：已处理';
  }

  if (hazardResolved === false) {
    return '处理结果：未处理';
  }

  const remarks = normalizeResultText(resultBlock?.remarks);
  if (remarks) {
    return remarks;
  }

  const value = normalizeResultText(resultBlock?.value);
  if (value) {
    return `建议结合检查结果“${value}”安排现场复核与处理。`;
  }

  return '建议现场复核该问题并制定针对性的整改措施。';
}