import type { ReportData } from '@/mockdata/report/index.ts';
import type { ServiceBasicInfo, ServiceContactPerson, ServiceDaysInfo } from '@/mockdata/report/types';
import type { TocNode } from './types';

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

/** 是否存在含 serviceId 的结构化服务信息 */
export function getServiceBasicBlock(report: ReportData | null | undefined): ServiceBasicInfo | null {
  const s = report?.serviceBasicInfo as unknown;
  if (!s || typeof s !== 'object' || !('serviceId' in s)) return null;
  return s as ServiceBasicInfo;
}

export function buildTocNodes(_report: ReportData | null | undefined, _projectName: string): TocNode[] {
  return [
    { id: 'sec-cover', label: '封面 / 服务基本信息', level: 1 },
    { id: 'sec-devices', label: '1 维护设备清单', level: 1 },
    { id: 'sec-issues', label: '2 发现与建议', level: 1 },
    { id: 'sec-summary', label: '3 报告总结', level: 1 },
    { id: 'sec-appendix', label: '4 附录', level: 1 },
  ];
}
