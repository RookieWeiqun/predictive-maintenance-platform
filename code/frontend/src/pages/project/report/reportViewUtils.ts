import type { ReportData } from '@/mockdata/report/index.ts';
import type { ServiceBasicInfo, ServiceContactPerson, ServiceDaysInfo } from '@/mockdata/report/types';
import type { ProblemCardView, TocNode } from './types';

export function formatContactPerson(c: ServiceContactPerson | string | undefined): string {
  if (c == null || c === '') return '-';
  if (typeof c === 'string') return c;
  if (c.label) return c.label;
  if (c.phone) return `${c.name}（${c.phone}）`;
  return c.name;
}

export function formatServiceDaysText(d: ServiceDaysInfo | number | undefined): string {
  if (d == null) return '-';
  if (typeof d === 'number') return `${d} 天`;
  return d.displayText ?? `${d.days} 天 × ${d.persons} 人`;
}

export function severityKeyFromLabel(sev: string): ProblemCardView['severityKey'] {
  if (sev === '严重') return 'critical';
  if (sev === '高') return 'high';
  if (sev === '中') return 'mid';
  return 'low';
}

export function mapRawProblemCards(report: ReportData | null | undefined): ProblemCardView[] {
  if (!report) return [];
  const raw = report.reportDocument?.problemCards;
  if (raw?.length) {
    return raw.map((c) => ({
      title: c.title,
      severity: c.severity,
      severityKey: severityKeyFromLabel(c.severity),
      description: c.description,
      affectedObjects: c.affectedObjects.map((t) => ({
        label: t.label,
        variant: t.variant ?? 'green',
      })),
      solutions: c.solutions,
      recommendedService: c.recommendedService,
    }));
  }
  const issues = report.issuesAndSuggestions.deviceIssues ?? [];
  return issues.map((it) => ({
    title: `${it.deviceModel} / ${it.serialNumber}`,
    severity: `${it.severity}风险`,
    severityKey: severityKeyFromLabel(it.severity),
    description: it.issue,
    affectedObjects: [{ label: it.serialNumber, variant: 'green' }],
    solutions: [it.suggestion],
    recommendedService: { name: '现场维护与优化服务', rating: 3 },
  }));
}

/** 是否存在含 serviceId 的结构化服务信息 */
export function getServiceBasicBlock(report: ReportData | null | undefined): ServiceBasicInfo | null {
  const s = report?.serviceBasicInfo as unknown;
  if (!s || typeof s !== 'object' || !('serviceId' in s)) return null;
  return s as ServiceBasicInfo;
}

export function buildTocNodes(report: ReportData | null | undefined, projectName: string): TocNode[] {
  const mainObjectEvaluations = report?.reportDocument?.evaluationObjects?.length
    ? report.reportDocument.evaluationObjects
    : [{ anchor: 'eval-fallback', title: `${projectName || '项目'} 综合评估` }];

  const nodes: TocNode[] = [{ id: 'sec-cover', label: '封面 / 服务基本信息', level: 1 }];
  nodes.push(
    { id: 'sec-2', label: '1 系统综合评估', level: 1 },
    { id: 'sec-2-1', label: '1.1～1.2 评价与雷达图', level: 2 },
    { id: 'sec-2-3', label: '1.3 维护前后对比', level: 2 },
    { id: 'sec-2-4', label: '1.4 评估对象一览', level: 2 },
    { id: 'sec-3', label: '2 主要对象分析与评估', level: 1 },
  );
  let n = 1;
  for (const ev of mainObjectEvaluations) {
    nodes.push({
      id: ev.anchor,
      label: `2.${n} ${ev.title}`,
      level: 2,
    });
    n += 1;
  }
  nodes.push(
    { id: 'sec-summary', label: '3 报告总结', level: 1 },
    { id: 'sec-appendix', label: '4 附录', level: 1 },
  );
  return nodes;
}
