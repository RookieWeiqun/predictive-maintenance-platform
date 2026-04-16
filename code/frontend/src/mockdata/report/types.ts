/**
 * 报告详情页的数据契约：与 `projects.json`、`devices.json`、`users.json` 等假数据对齐，
 * 未来可由后端返回相同 JSON 结构驱动页面渲染。
 */

/** 联系人：可结构化，也可仅用 label 一行展示 */
export interface ServiceContactPerson {
  name: string;
  phone?: string;
  /** 若后端已拼好展示串，优先于 name/phone */
  label?: string;
}

/** 服务执行统计（与长文案可二选一或并存，便于图表/表格复用） */
export interface ServiceExecutionStatistics {
  totalChecks: number;
  /** 亟需维护 */
  urgentMaintenance: number;
  /** 要求维护 */
  requiredMaintenance: number;
  /** 建议维护 */
  recommendedMaintenance: number;
  /** 正常结果 */
  normalResults: number;
  /** 若省略则由前端按数字拼句 */
  summaryText?: string;
}

/** 服务天数与人天，如「2 天 × 1 人」 */
export interface ServiceDaysInfo {
  days: number;
  persons: number;
  displayText?: string;
}

/**
 * 服务基本信息（现场执行维度，与封面 reportDocument.cover 互补）
 * 字段参考：服务 ID、城市、双方联系人、执行人、日期区间、人天、目标系统、类型、检查统计、备份状态等。
 */
export interface ServiceBasicInfo {
  /** 服务 ID 号码（可与 reportNo 不同，业务侧服务单号） */
  serviceId: string;
  companyName: string;
  /** 服务发生城市 */
  serviceCity: string;
  customerContact: ServiceContactPerson;
  siemensContact: ServiceContactPerson;
  /** 服务执行人，可多人 */
  serviceExecutors: string[];
  executionDateRange: string;
  serviceDays: ServiceDaysInfo;
  reportGeneratedDate: string;
  targetSystemName: string;
  serviceType: string;
  executionStatistics: ServiceExecutionStatistics;
  /** 数据备份状态，如「已完成」「未执行」 */
  dataBackupStatus: string;
}

/** 封面与页眉展示用元信息 */
export interface ReportDocumentMeta {
  coverTitle: string;
  tagline: string;
  /** 与封面「服务报告类型」一致 */
  reportType: string;
}

/** 封面基础信息卡片（字段与 UI 一一对应） */
export interface ReportCoverBlock {
  /** 展示用编号，通常与 reportNo 一致 */
  reportId: string;
  reportType: string;
  customerCompany: string;
  /** 建议：工厂 + 项目名称，便于与项目列表对照 */
  targetSystem: string;
  /** 建议：对接人邮箱，可与 users.json 中项目经理关联 */
  applicant: string;
  deliveryDate: string;
  remarks: string;
  version: string;
}

/** 目录「3.x 主要对象」锚点 */
export interface ReportEvaluationObject {
  anchor: string;
  title: string;
}

export type ProblemTagVariant = 'green' | 'purple' | 'yellow' | 'orange';

export interface ProblemAffectedTag {
  label: string;
  variant: ProblemTagVariant;
}

export interface ReportProblemCard {
  title: string;
  severity: string;
  description: string;
  affectedObjects: ProblemAffectedTag[];
  solutions: string[];
  recommendedService: {
    name: string;
    /** 1–5 */
    rating: number;
  };
}

/**
 * 报告页专用视图模型（与维护执行明细 serviceBasicInfo / systemEvaluation 等并列）
 */
export interface ReportDocument {
  meta: ReportDocumentMeta;
  cover: ReportCoverBlock;
  evaluationObjects: ReportEvaluationObject[];
  /** 若为空数组，页面可回退到 issuesAndSuggestions.deviceIssues 生成卡片 */
  problemCards: ReportProblemCard[];
}
