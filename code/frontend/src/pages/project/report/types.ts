/** 报告详情页本地类型（视图层，与 mock `ReportData` 组合使用） */

export type ProblemCardView = {
  title: string;
  severity: string;
  severityKey: 'critical' | 'high' | 'mid' | 'low';
  description: string;
  affectedObjects: { label: string; variant: string }[];
  solutions: string[];
  recommendedService: { name: string; rating: number };
};

export type TocNode = { id: string; label: string; level: 1 | 2 };

export type ReportSummaryDraft = {
  maintenanceSummary: string;
  sparePartsSuggestion: string;
};
