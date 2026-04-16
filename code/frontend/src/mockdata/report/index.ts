import reportsData from './reports.json';

export type ReportData = (typeof reportsData.reports)[number];

export type {
  ReportDocument,
  ReportDocumentMeta,
  ReportCoverBlock,
  ReportEvaluationObject,
  ReportProblemCard,
  ServiceBasicInfo,
  ServiceContactPerson,
  ServiceExecutionStatistics,
  ServiceDaysInfo,
} from './types';

export function getReportByProjectId(projectId: string): ReportData | null {
  return reportsData.reports.find((r) => String(r.projectId) === String(projectId)) ?? null;
}

