import type { InspectionTaskDetailDto, InspectionTaskDto } from '@/api/modules/inspectionTasks';
import type { ProjectDto } from '@/api/modules/projects';
import type { CompanyDto } from '@/api/modules/companies';
import type { ReportData } from '@/mockdata/report';

type ProjectTaskDetailsReportSource = {
  project: ProjectDto;
  company: CompanyDto | null;
  tasks: InspectionTaskDto[];
  taskDetailsByTask: Array<{
    task: InspectionTaskDto;
    detail: InspectionTaskDetailDto;
  }>;
};

type TaskExecutionStatus = NonNullable<InspectionTaskDetailDto['task_items'][number]['execution_status']>;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10) || '-';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function joinDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const startText = formatDateOnly(start);
  const endText = formatDateOnly(end);
  if (startText === '-' && endText === '-') return '-';
  if (startText === endText) return startText;
  return `${startText} ~ ${endText}`;
}

function getTaskResultValue(item: InspectionTaskDetailDto['task_items'][number]): string {
  const resultBlock = item.task_result ?? item.taskresult;
  return String(resultBlock?.value ?? '').trim() || '-';
}

function getTaskResultRemarks(item: InspectionTaskDetailDto['task_items'][number]): string {
  const resultBlock = item.task_result ?? item.taskresult;
  return String(resultBlock?.remarks ?? '').trim() || '';
}

function getTaskResultState(item: InspectionTaskDetailDto['task_items'][number]): string {
  const resultBlock = item.task_result ?? item.taskresult;
  return String(resultBlock?.result_state ?? '').trim().toLowerCase();
}

function getTaskResultStateLabel(item: InspectionTaskDetailDto['task_items'][number]): string {
  const resultState = getTaskResultState(item);
  if (resultState === 'abnormal') return '不正常';
  if (resultState === 'normal') return '正常';
  return '';
}

function getAppendixDeviceSerialText(entry: ProjectTaskDetailsReportSource['taskDetailsByTask'][number]): string {
  const serial = entry.detail.task.serial_no?.trim() || String(entry.task.taskid ?? '-');
  const assignedUserName = entry.detail.task.assigned_user_name?.trim() || '';
  return [serial, assignedUserName].filter(Boolean).join(' ');
}

function isAbnormalTaskItem(item: InspectionTaskDetailDto['task_items'][number]): boolean {
  const resultState = getTaskResultState(item);
  if (resultState) {
    return resultState === 'abnormal';
  }
  const value = getTaskResultValue(item).toLowerCase();
  return value === 'abnormal' || value === '异常';
}

function getSeverity(item: InspectionTaskDetailDto['task_items'][number]): '高' | '中' | '低' {
  if (item.is_recheck) return '高';
  if (item.is_normal === false) return '中';
  return '低';
}

function getExecutionCounts(items: InspectionTaskDetailDto['task_items']) {
  const counts: Record<TaskExecutionStatus, number> = {
    pending: 0,
    completed: 0,
    skipped: 0,
    not_applicable: 0,
    recheck_required: 0,
  };

  for (const item of items) {
    const key = item.execution_status ?? 'pending';
    counts[key] += 1;
  }

  return counts;
}

function getRadar(items: InspectionTaskDetailDto['task_items'], total: number, completed: number, normal: number, attachments: number) {
  const applicableCount = items.filter((item) => item.execution_status !== 'not_applicable').length || total;
  const recheckCount = items.filter((item) => item.is_recheck).length;
  const withResultCount = items.filter((item) => getTaskResultValue(item) !== '-' || getTaskResultRemarks(item)).length;

  return [
    { label: '执行覆盖率', value: clampScore((completed / Math.max(total, 1)) * 100), max: 100 },
    { label: '结果完整度', value: clampScore((withResultCount / Math.max(total, 1)) * 100), max: 100 },
    { label: '正常率', value: clampScore((normal / Math.max(applicableCount, 1)) * 100), max: 100 },
    { label: '复检控制', value: clampScore(((applicableCount - recheckCount) / Math.max(applicableCount, 1)) * 100), max: 100 },
    { label: '图片覆盖率', value: clampScore((attachments / Math.max(total, 1)) * 100), max: 100 },
  ];
}

export function buildReportFromProjectTaskDetailsSource(source: ProjectTaskDetailsReportSource): ReportData {
  const { project, company, tasks, taskDetailsByTask } = source;
  const primaryTask = tasks[0] ?? null;
  const reportNo = `PRJ-${project.projectid ?? 'UNKNOWN'}`;
  const generatedAt = formatDateOnly(primaryTask?.completetime ?? project.createdate);
  const items = taskDetailsByTask.flatMap((entry) => entry.detail.task_items);
  const totalChecks = items.length;
  const completedItems = items.filter((item) => item.execution_status === 'completed').length;
  const normalItems = items.filter((item) => {
    const value = getTaskResultValue(item).toLowerCase();
    return value === 'normal' || value === '正常';
  }).length;
  const recheckItems = items.filter((item) => item.is_recheck).length;
  const abnormalItems = items.filter((item) => isAbnormalTaskItem(item)).length;
  const attachmentCount = items.reduce((sum, item) => sum + (item.attachments?.length ?? 0), 0);
  const overallScore = clampScore(((completedItems + normalItems) / Math.max(totalChecks * 2, 1)) * 100);
  const overallRating = overallScore >= 85 ? '良好' : overallScore >= 70 ? '一般' : '需关注';
  const executionCounts = getExecutionCounts(items);

  return {
    projectId: String(project.projectid ?? ''),
    reportNo,
    version: 'V1.0',
    generatedAt,
    serviceBasicInfo: {
      serviceId: primaryTask?.taskNo?.trim() || reportNo,
      companyName: company?.companyname?.trim() || project.projectname?.trim() || '未命名项目',
      serviceCity: '中国',
      customerContact: primaryTask?.assigneduserid != null ? `用户#${primaryTask.assigneduserid}` : '-',
      siemensContact: '-',
      serviceExecutors: primaryTask?.assigneduserid != null ? [`用户#${primaryTask.assigneduserid}`] : ['-'],
      executionDateRange: joinDateRange(project.createdate, primaryTask?.completetime),
      serviceDays: {
        days: 1,
        persons: primaryTask?.assigneduserid != null ? 1 : 0,
        displayText: primaryTask?.assigneduserid != null ? '1 天 × 1 人' : '-',
      },
      reportGeneratedDate: generatedAt,
      targetSystemName: [project.projectname?.trim(), `${tasks.length} 个任务`].filter(Boolean).join(' · ') || '任务执行系统',
      serviceType: '任务执行检查报告',
      executionStatistics: {
        totalChecks,
        urgentMaintenance: recheckItems,
        requiredMaintenance: abnormalItems,
        recommendedMaintenance: executionCounts.skipped + executionCounts.not_applicable,
        normalResults: normalItems,
      },
      dataBackupStatus: '未知',
    },
    systemEvaluation: {
      overallRating,
      overallScore,
      radar: getRadar(items, totalChecks, completedItems, normalItems, attachmentCount),
      healthPie: [
        { label: '正常', value: normalItems, color: '#2ecc71' },
        { label: '待复检', value: recheckItems, color: '#e67e22' },
        { label: '异常', value: abnormalItems, color: '#e74c3c' },
      ],
      beforeAfter: {
        beforeScore: overallScore,
        afterScore: overallScore,
        notes: '当前报告基于任务与任务项现有数据自动生成，维护前后对比数据暂未接入。',
      },
    },
    issuesAndSuggestions: {
      deviceIssues: taskDetailsByTask.flatMap((entry) =>
        entry.detail.task_items.filter((item) => isAbnormalTaskItem(item)).map((item) => ({
          deviceModel: entry.detail.task.template_name?.trim() || entry.task.taskNo?.trim() || `任务#${entry.task.taskid}`,
          serialNumber: entry.detail.task.serial_no?.trim() || String(entry.task.taskid ?? '-'),
          severity: getSeverity(item),
          issue: item.item_name,
          suggestion: getTaskResultRemarks(item) || getTaskResultValue(item),
        })),
      ),
      attachments: taskDetailsByTask.flatMap((entry) =>
        entry.detail.task_items.flatMap((item, itemIndex) =>
          (item.attachments ?? []).map((_, attachmentIndex) => ({
            title: `${entry.detail.task.task_no?.trim() || `任务#${entry.task.taskid}`} / ${item.item_name} 附件 ${attachmentIndex + 1}`,
            type: 'image',
            ref: `ATT-${entry.task.taskid ?? 'X'}-${itemIndex + 1}-${attachmentIndex + 1}`,
          })),
        ),
      ),
    },
    appendixDetailedInspection: {
      workshops: taskDetailsByTask.length === 0
        ? []
        : [
            {
              name: project.projectname?.trim() || '项目',
              devices: taskDetailsByTask.map((entry) => {
                const groups = Array.from(
                  new Set(
                    entry.detail.task_items
                      .map((item) => String(item.category_path ?? '').trim() || '未分类检查项')
                      .filter(Boolean),
                  ),
                );

                return {
                  model: entry.detail.task.template_name?.trim() || entry.task.taskNo?.trim() || `任务#${entry.task.taskid}`,
                  serialNumber: getAppendixDeviceSerialText(entry),
                  items: groups.map((group) => ({
                    name: group,
                    children: entry.detail.task_items
                      .filter((item) => (String(item.category_path ?? '').trim() || '未分类检查项') === group)
                      .map((item) => ({
                        name: item.item_name,
                        result: getTaskResultStateLabel(item) || '-',
                        processData: getTaskResultValue(item),
                        remark: getTaskResultRemarks(item) || '-',
                        hazardNote: '',
                        suggestion: '',
                        images: (item.attachments ?? []).map((_, idx) => `ATT-${entry.task.taskid ?? 'X'}-${item.item_id}-${idx + 1}`),
                      })),
                  })),
                };
              }),
            },
          ],
    },
    summaryDefaults: {
      maintenanceSummary:
        totalChecks > 0
          ? `本次共汇总 ${tasks.length} 个任务、${totalChecks} 条检查项，其中正常 ${normalItems} 条，异常 ${abnormalItems} 条。`
          : '当前项目尚未获取到可用于生成报告的任务项数据。',
      sparePartsSuggestion: '当前接口未返回备件建议，后续可在报告总结中人工补充。',
    },
    reportDocument: {
      meta: {
        coverTitle: '设备预防性维护诊断报告',
        tagline: '预维护平台 · 任务报告',
        reportType: '任务执行检查报告',
      },
      cover: {
        reportId: reportNo,
        reportType: '任务执行检查报告',
        customerCompany: company?.companyname?.trim() || project.projectname?.trim() || '未命名项目',
        targetSystem: [project.projectname?.trim(), `${tasks.length} 个任务`].filter(Boolean).join(' · ') || '任务执行系统',
        applicant: primaryTask?.assigneduserid != null ? `用户#${primaryTask.assigneduserid}` : '-',
        deliveryDate: generatedAt,
        remarks: primaryTask?.taskNo?.trim() ? `任务编号：${primaryTask.taskNo.trim()}` : '-',
        version: 'V1.0',
      },
      evaluationObjects: [],
      problemCards: taskDetailsByTask.flatMap((entry) =>
        entry.detail.task_items.filter((item) => isAbnormalTaskItem(item)).map((item) => ({
          title: item.item_name,
          severity: getSeverity(item),
          description: getTaskResultRemarks(item) || getTaskResultValue(item),
          affectedObjects: [
            {
              label: entry.detail.task.serial_no?.trim() || entry.task.taskNo?.trim() || `任务#${entry.task.taskid}`,
              variant: item.is_recheck ? 'orange' : 'yellow',
            },
          ],
          solutions: [getTaskResultRemarks(item) || getTaskResultValue(item)],
          recommendedService: {
            name: item.is_recheck ? '复检与现场维护服务' : '现场检查与整改服务',
            rating: item.is_recheck ? 4 : 3,
          },
        })),
      ),
    },
  };
}