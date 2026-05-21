<!-- 报告详情页：左侧目录 + SieDiag 风格正文 -->
<template>
  <div class="project-report-page">
    <IxContentHeader :header-title="`报告详情${project ? `：${project.name}` : ''}`">
      <IxButton variant="secondary" @click="goToDetail">返回项目</IxButton>
      <IxButton
        variant="secondary"
        :disabled="!project || !report || wordExporting"
        @click="exportWord"
      >
        {{ wordExporting ? '导出中…' : '导出Word' }}
      </IxButton>
      <IxButton variant="primary" :disabled="!project" @click="downloadPdf">下载PDF</IxButton>
    </IxContentHeader>

    <section class="page-section">
      <div v-if="reportLoading" class="report-empty">报告数据加载中…</div>
      <div v-else-if="!report" class="report-empty">当前项目暂无可用于填充报告的任务数据（projectId={{ projectId }}）</div>
      <div v-else class="report-layout">
        <aside :class="['report-toc', { 'report-toc--collapsed': tocCollapsed }]">
          <div class="report-toc__head">
            <span v-show="!tocCollapsed" class="report-toc__title">目录</span>
            <button
              type="button"
              class="report-toc__collapse"
              :title="tocCollapsed ? '展开目录' : '收起目录'"
              @click="tocCollapsed = !tocCollapsed"
            >
              <IxIcon :name="tocCollapsed ? iconChevronRight : iconChevronLeft" size="16" />
            </button>
          </div>
          <nav v-show="!tocCollapsed" class="report-toc__nav" aria-label="报告目录">
            <template v-for="node in tocNodes" :key="node.id">
              <button
                type="button"
                class="report-toc__node"
                :class="[
                  `report-toc__node--l${node.level}`,
                  { 'is-active': activeAnchor === node.id },
                ]"
                @click="scrollToAnchor(node.id)"
              >
                {{ node.label }}
              </button>
            </template>
          </nav>
        </aside>

        <div ref="mainScrollRef" class="report-main">
          <!-- 封面：标题区居中；服务基本信息单卡左对齐（便于扫读长表单） -->
          <article id="sec-cover" class="report-sheet report-sheet--cover" data-toc-anchor>
            <header class="cover-header">
              <div class="cover-header__brand">
                <img :src="logoUrl" alt="Siemens" class="cover-logo" width="100" height="42" />
              </div>
              <div class="cover-header__tagline">{{ presentation.tagline }}</div>
            </header>
            <h1 class="cover-title">{{ presentation.coverTitle }}</h1>
            <p class="cover-id">报告编号：{{ basicInfo.reportId }}</p>

            <div class="basic-info-card cover-info-card">
              <h2 class="basic-info-card__title">服务基本信息</h2>
              <div class="basic-info-card__divider" />
              <dl v-if="serviceBasicBlock" class="basic-info-card__list cover-info-card__list">
                <div class="basic-info-row">
                  <dt>服务单号</dt>
                  <dd>{{ serviceBasicBlock.serviceId }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>客户与现场</dt>
                  <dd>{{ serviceBasicBlock.companyName }} · {{ serviceBasicBlock.serviceCity }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>目标系统</dt>
                  <dd>{{ serviceBasicBlock.targetSystemName }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>联系人</dt>
                  <dd>{{ coverContactsDual }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>现场执行</dt>
                  <dd>{{ coverExecutionDense }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>服务与备份</dt>
                  <dd>{{ serviceBasicBlock.serviceType }} · 备份 {{ serviceBasicBlock.dataBackupStatus }}</dd>
                </div>
                <div
                  v-if="basicInfo.remarks && basicInfo.remarks !== '-'"
                  class="basic-info-row basic-info-row--block"
                >
                  <dt>备注</dt>
                  <dd class="service-stats-text">{{ basicInfo.remarks }}</dd>
                </div>
                <div class="cover-info-meta" role="group" aria-label="报告与交付">
                  <div class="cover-info-meta__title">报告与交付</div>
                  <div class="basic-info-row">
                    <dt>申请人</dt>
                    <dd>{{ basicInfo.applicant }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>报告生成</dt>
                    <dd>{{ serviceBasicBlock.reportGeneratedDate }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>交付日期</dt>
                    <dd>{{ basicInfo.deliveryDate }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>版本</dt>
                    <dd>{{ basicInfo.version }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>类型</dt>
                    <dd>{{ shortReportType }}</dd>
                  </div>
                </div>
              </dl>
              <dl v-else class="basic-info-card__list cover-info-card__list">
                <div class="basic-info-row">
                  <dt>客户</dt>
                  <dd>{{ basicInfo.customerCompany }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>目标系统</dt>
                  <dd>{{ basicInfo.targetSystem }}</dd>
                </div>
                <div class="basic-info-row">
                  <dt>申请人</dt>
                  <dd>{{ basicInfo.applicant }}</dd>
                </div>
                <div
                  v-if="basicInfo.remarks && basicInfo.remarks !== '-'"
                  class="basic-info-row basic-info-row--block"
                >
                  <dt>备注</dt>
                  <dd class="service-stats-text">{{ basicInfo.remarks }}</dd>
                </div>
                <div class="cover-info-meta" role="group" aria-label="报告与交付">
                  <div class="cover-info-meta__title">报告与交付</div>
                  <div class="basic-info-row">
                    <dt>交付日期</dt>
                    <dd>{{ basicInfo.deliveryDate }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>版本</dt>
                    <dd>{{ basicInfo.version }}</dd>
                  </div>
                  <div class="basic-info-row">
                    <dt>类型</dt>
                    <dd>{{ shortReportType }}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </article>

          <article id="sec-devices" class="report-sheet" data-toc-anchor>
            <h2 class="sheet-h2">1 维护设备清单</h2>

            <div v-if="!maintenanceDeviceRows.length" class="empty-block muted">
              当前项目暂无可展示的维护设备清单。
            </div>
            <div v-else class="table-shell report-device-shell">
              <div class="report-device-caption">{{ maintenanceDeviceCaption }}</div>
              <div class="report-device-table-wrap">
                <table class="report-device-table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>电气室</th>
                      <th>设备名称</th>
                      <th>设备型号</th>
                      <th>序列号</th>
                      <th>所属部门</th>
                      <th>设备编号</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in maintenanceDeviceRows" :key="row.key">
                      <td>{{ index + 1 }}</td>
                      <td>{{ row.electricRoom }}</td>
                      <td>{{ row.equipmentName }}</td>
                      <td>{{ row.deviceModel }}</td>
                      <td>{{ row.serialNumber }}</td>
                      <td>{{ row.department }}</td>
                      <td>{{ row.equipmentNumber }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>

          <article id="sec-issues" class="report-sheet" data-toc-anchor>
            <h2 class="sheet-h2">2 发现与建议</h2>
            <p class="sheet-lead">
              按问题逐条展开，展示设备基础信息、问题描述、解决措施及现场照片。
            </p>

            <div v-if="!reportIssueEntries.length" class="empty-block muted">
              当前项目暂无异常问题条目。
            </div>
            <div v-else class="report-issue-list">
              <div v-for="issue in reportIssueEntries" :key="issue.key" class="report-issue-block">
                <table class="report-issue-table">
                  <tbody>
                    <tr>
                      <td rowspan="5" class="report-issue-table__room">{{ issue.electricRoom }}</td>
                      <td rowspan="2" class="report-issue-table__number">问题 {{ issue.index }}</td>
                      <td class="report-issue-table__label">设备名称:</td>
                      <td>{{ issue.equipmentName }}</td>
                      <td class="report-issue-table__label">设备型号:</td>
                      <td>{{ issue.deviceModel }}</td>
                    </tr>
                    <tr>
                      <td class="report-issue-table__label">设备编号:</td>
                      <td>{{ issue.equipmentNumber }}</td>
                      <td class="report-issue-table__label">序列号:</td>
                      <td>{{ issue.serialNumber }}</td>
                    </tr>
                    <tr>
                      <td colspan="5" class="report-issue-table__textcell">
                        <strong>问题描述:</strong>
                        <div v-if="issue.issueHierarchy" class="report-issue-table__hierarchy">
                          {{ issue.issueHierarchy }}
                        </div>
                        <p>{{ issue.issueDescription }}</p>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="5" class="report-issue-table__textcell">
                        <strong>解决措施或建议:</strong>
                        <p>{{ issue.suggestion }}</p>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="5">
                        <div v-if="issue.images.length" class="report-photo-grid">
                          <button
                            v-for="(image, imageIndex) in issue.images"
                            :key="`${issue.key}-photo-${imageIndex + 1}`"
                            type="button"
                            class="report-photo-slot report-photo-slot__button"
                            @click="openAppendixImagePreview(image, `${issue.equipmentName} 问题 ${issue.index} 照片 ${imageIndex + 1}`)"
                          >
                            <img
                              :src="image"
                              :alt="`${issue.equipmentName} 问题 ${issue.index} 照片 ${imageIndex + 1}`"
                              class="report-photo-slot__image"
                            />
                          </button>
                        </div>
                        <div v-else class="report-photo-empty">暂无图片</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </article>

          <!-- 报告总结（可编辑） -->
          <div id="sec-summary" class="report-sheet report-sheet--editor" data-toc-anchor>
            <h2 class="sheet-h2">3 报告总结</h2>
            <div class="editor-header">
              <div class="editor-title">人工维护区</div>
              <div class="editor-subtitle">自动保存草稿</div>
            </div>
            <div class="summary-form">
              <label class="summary-field">
                <span class="summary-field__label">维护总结说明</span>
                <textarea
                  v-model="summary.maintenanceSummary"
                  class="summary-field__control"
                  placeholder="请输入本次维护总结说明"
                />
              </label>
              <label class="summary-field">
                <span class="summary-field__label">备件建议</span>
                <textarea
                  v-model="summary.sparePartsSuggestion"
                  class="summary-field__control"
                  placeholder="请输入备件建议"
                />
              </label>
            </div>
          </div>

          <div id="sec-appendix" class="report-sheet report-sheet--muted" data-toc-anchor>
            <h2 class="sheet-h2">4 附录：详细检查报告</h2>
            <p>
              按车间/设备展示层级检查项目、检查结果、过程数据、问题隐患说明、维护与优化建议、参考图片（来自检测数据与专家规则）。
            </p>
            <div v-if="appendixWorkshops.length === 0" class="empty-block muted">
              暂无详细检查项数据。
            </div>
            <div v-else class="appendix-workshops">
              <section
                v-for="(workshop, workshopIndex) in appendixWorkshops"
                :key="`workshop-${workshopIndex}`"
                class="appendix-workshop"
              >
                <h3 class="sheet-h3">{{ workshop.name }}</h3>
                <div
                  v-for="(device, deviceIndex) in workshop.devices ?? []"
                  :key="`device-${workshopIndex}-${deviceIndex}`"
                  class="appendix-device"
                >
                  <div class="appendix-device__title">{{ device.model || '任务设备' }}</div>
                  <div
                    v-for="(group, groupIndex) in device.items ?? []"
                    :key="`group-${workshopIndex}-${deviceIndex}-${groupIndex}`"
                    class="appendix-group"
                  >
                    <div class="appendix-group__panel">
                      <div class="appendix-group__header">
                        <span class="appendix-group__bar" aria-hidden="true" />
                        <h4 class="appendix-group__title">
                          <template
                            v-for="(crumb, crumbIndex) in getAppendixBreadcrumbs(group.name)"
                            :key="`crumb-${workshopIndex}-${deviceIndex}-${groupIndex}-${crumbIndex}`"
                          >
                            <span class="appendix-group__crumb">{{ crumb }}</span>
                            <span
                              v-if="crumbIndex < getAppendixBreadcrumbs(group.name).length - 1"
                              class="appendix-group__separator"
                              aria-hidden="true"
                              >›</span
                            >
                          </template>
                        </h4>
                      </div>
                      <table class="appendix-table">
                        <thead>
                          <tr>
                            <th>检查项</th>
                            <th>检测结果</th>
                            <th>检测值</th>
                            <th>备注</th>
                            <th>问题隐患说明</th>
                            <th>维护与优化建议</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(entry, entryIndex) in group.children ?? []"
                            :key="`entry-${workshopIndex}-${deviceIndex}-${groupIndex}-${entryIndex}`"
                          >
                            <td>{{ entry.name || '-' }}</td>
                            <td>{{ entry.result || '-' }}</td>
                            <td>{{ entry.processData || '-' }}</td>
                            <td>{{ entry.remark || '-' }}</td>
                            <td>{{ entry.hazardNote || '-' }}</td>
                            <td>{{ entry.suggestion || '-' }}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div
                        v-if="getAppendixVisibleImages(group).length > 0"
                        class="appendix-gallery"
                      >
                        <div class="appendix-gallery__head">参考图片</div>
                        <div class="appendix-gallery__grid">
                          <figure
                            v-for="(image, imageIndex) in getAppendixVisibleImages(group)"
                            :key="`image-${workshopIndex}-${deviceIndex}-${groupIndex}-${image.src}-${imageIndex}`"
                            class="appendix-gallery__item"
                          >
                            <button
                              type="button"
                              class="appendix-gallery__button"
                              @click="openAppendixImagePreview(image.src, `${image.label || group.name || '检查分组'} 图片 ${imageIndex + 1}`)"
                            >
                              <img
                                :src="image.src"
                                :alt="`${image.label || group.name || '检查分组'} 图片 ${imageIndex + 1}`"
                                class="appendix-gallery__image"
                                loading="lazy"
                              />
                            </button>
                            <figcaption class="appendix-gallery__caption">{{ image.label || '-' }}</figcaption>
                          </figure>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div
            v-if="appendixImagePreview"
            class="appendix-lightbox"
            role="dialog"
            aria-modal="true"
            :aria-label="appendixImagePreview.alt"
            @click="closeAppendixImagePreview"
          >
            <button
              type="button"
              class="appendix-lightbox__close"
              aria-label="关闭图片预览"
              @click.stop="closeAppendixImagePreview"
            >
              <IxIcon :name="iconClose" size="20" />
            </button>
            <figure class="appendix-lightbox__figure" @click.stop>
              <img
                :src="appendixImagePreview.src"
                :alt="appendixImagePreview.alt"
                class="appendix-lightbox__image"
              />
            </figure>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IxContentHeader, IxButton, IxIcon, showToast } from '@siemens/ix-vue';
/**
 * 图标：设计名为 kebab-case（见 https://ix.siemens.io/docs/icons/icon-library ），
 * 从 `@siemens/ix-icons/icons` 导入 `iconXxx` 常量。
 * `<IxIcon>` 必须使用 **`:name="iconXxx"`**（底层 `ix-icon` 只认 `name`，用 `:icon` 会无效并显示占位符）。
 */
import {
  iconChevronLeft,
  iconChevronRight,
  iconClose,
} from '@siemens/ix-icons/icons';

import logoUrl from '../../../../image/siemens logo.svg';
import { buildWordReportWebhookPayload, requestWordReportDownload } from '@/config/n8n';
import { attachmentsApi, companiesApi, equipmentsApi, inspectionTasksApi, productsApi, projectEquipmentsApi, projectsApi } from '@/api';
import { getReportByProjectId, type ReportData } from '@/mockdata/report';
import type { CompanyDto } from '@/api/modules/companies';
import type { EquipmentDto } from '@/api/modules/equipments';
import type { InspectionTaskDetailDto, InspectionTaskDto } from '@/api/modules/inspectionTasks';
import type { ProductDto } from '@/api/modules/products';
import type { ProjectDto } from '@/api/modules/projects';
import { buildReportFromProjectTaskDetailsSource } from './reportApiAdapter';
import { getIssueSuggestionText } from './reportIssueUtils';

import {
  buildTocNodes,
  formatContactPerson,
  formatServiceDaysText,
  getServiceBasicBlock,
} from './reportViewUtils';
import { useReportSummaryDraft } from './composables/useReportSummaryDraft';
import { useReportTocSpy } from './composables/useReportTocSpy';

type ReportProjectView = {
  id: string;
  name: string;
  factory?: string;
};

type ReportTaskDetailEntry = {
  task: InspectionTaskDto;
  detail: InspectionTaskDetailDto;
};

type MaintenanceDeviceRow = {
  key: string;
  electricRoom: string;
  equipmentName: string;
  deviceModel: string;
  serialNumber: string;
  department: string;
  equipmentNumber: string;
};

type ReportIssueEntry = {
  key: string;
  index: number;
  electricRoom: string;
  equipmentName: string;
  deviceModel: string;
  serialNumber: string;
  equipmentNumber: string;
  issueHierarchy: string;
  issueDescription: string;
  suggestion: string;
  images: string[];
};

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.id ?? ''));

const project = ref<ReportProjectView | null>(null);
const report = ref<ReportData | null>(null);
const reportLoading = ref(false);
const appendixImagePreview = ref<{ src: string; alt: string } | null>(null);
const projectCompany = ref<CompanyDto | null>(null);
const taskDetailsEntries = ref<ReportTaskDetailEntry[]>([]);
const projectEquipmentList = ref<EquipmentDto[]>([]);
const equipmentMapRef = ref(new Map<number, EquipmentDto>());
const productMapRef = ref(new Map<number, ProductDto>());
const productsByEquipmentRef = ref(new Map<number, ProductDto[]>());

const wordExporting = ref(false);

const tocCollapsed = ref(false);
const mainScrollRef = ref<HTMLElement | null>(null);

const serviceBasicBlock = computed(() => getServiceBasicBlock(report.value));
const { activeAnchor, scrollToAnchor } = useReportTocSpy(report, mainScrollRef);
const { summary } = useReportSummaryDraft(projectId, report);

const presentation = computed(() => {
  const m = report.value?.reportDocument?.meta;
  return {
    coverTitle: m?.coverTitle ?? '设备预防性维护诊断报告',
    tagline: m?.tagline ?? '预维护平台 · 服务报告',
  };
});

/** 封面卡片：联系人一行展示 */
const coverContactsDual = computed(() => {
  const sb = serviceBasicBlock.value;
  if (!sb) return '-';
  return `用户 ${formatContactPerson(sb.customerContact)} · 西门子 ${formatContactPerson(sb.siemensContact)}`;
});

/** 封面卡片：执行人、日期、人天一行 */
const coverExecutionDense = computed(() => {
  const sb = serviceBasicBlock.value;
  if (!sb) return '-';
  return `${sb.serviceExecutors.join('、')} · ${sb.executionDateRange} · ${formatServiceDaysText(sb.serviceDays)}`;
});

const basicInfo = computed(() => {
  const r = report.value;
  const c = r?.reportDocument?.cover;
  const m = r?.reportDocument?.meta;
  const sb = serviceBasicBlock.value;
  const pj = project.value;
  const targetFallback =
    `${sb?.companyName ?? ''}${pj?.factory ? ` · ${pj.factory}` : ''}`.trim() || '-';
  return {
    reportId: c?.reportId ?? r?.reportNo ?? '-',
    reportType: c?.reportType ?? m?.reportType ?? '预防性维护智能诊断报告',
    customerCompany: c?.customerCompany ?? sb?.companyName ?? '-',
    targetSystem: c?.targetSystem ?? sb?.targetSystemName ?? targetFallback,
    applicant: c?.applicant ?? formatContactPerson(sb?.customerContact),
    /** 交付日期：以封面为准，无则回退服务单报告日 */
    deliveryDate: c?.deliveryDate ?? sb?.reportGeneratedDate ?? r?.generatedAt ?? '-',
    remarks: c?.remarks ?? '-',
    version: c?.version ?? r?.version ?? '-',
  };
});

/** 报告类型短展示（避免与标题重复冗长） */
const shortReportType = computed(() => {
  const t = basicInfo.value.reportType;
  return t.replace(/报告$/, '').trim() || t;
});

const tocNodes = computed(() => buildTocNodes(report.value, project.value?.name ?? ''));
const appendixWorkshops = computed(() => report.value?.appendixDetailedInspection?.workshops ?? []);
const maintenanceDeviceCaption = computed(() => {
  const companyName = report.value?.serviceBasicInfo?.companyName?.trim()
    || projectCompany.value?.companyname?.trim()
    || '客户';
  const projectName = project.value?.name?.trim() || '项目';
  return `${companyName} ${projectName} 维护设备清单`;
});

function normalizeText(value: unknown, fallback = '-'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function resolveEquipmentName(product: ProductDto | null | undefined, equipment: EquipmentDto | null | undefined): string {
  return normalizeText(product?.equipmentname ?? equipment?.equipmentname, '');
}

function resolveEquipmentNumber(product: ProductDto | null | undefined, equipment: EquipmentDto | null | undefined): string {
  return normalizeText(product?.equipmentnumber ?? (equipment?.number != null ? String(equipment.number) : ''), '');
}

function resolveDepartment(product: ProductDto | null | undefined, equipment: EquipmentDto | null | undefined): string {
  return normalizeText(product?.department, '');
}

function resolveElectricRoom(equipment: EquipmentDto | null | undefined): string {
  return normalizeText(equipment?.electricroom, '');
}

function getEntryProduct(entry: ReportTaskDetailEntry): ProductDto | null {
  const productId = Number(entry.detail.task.product_id ?? entry.task.productid ?? 0);
  return Number.isFinite(productId) && productId > 0 ? productMapRef.value.get(productId) ?? null : null;
}

function getEntryEquipment(product: ProductDto | null): EquipmentDto | null {
  const equipId = Number(product?.equipid ?? 0);
  return Number.isFinite(equipId) && equipId > 0 ? equipmentMapRef.value.get(equipId) ?? null : null;
}

function resolveDeviceModel(product: ProductDto | null | undefined, entry?: ReportTaskDetailEntry): string {
  return normalizeText(product?.mlfb ?? entry?.detail.task.template_name ?? entry?.task.taskNo ?? '-');
}

function resolveSerialNumber(product: ProductDto | null | undefined, entry?: ReportTaskDetailEntry): string {
  return normalizeText(product?.serialno ?? entry?.detail.task.serial_no ?? entry?.task.serialno ?? '-');
}

function getTaskResultValue(item: InspectionTaskDetailDto['task_items'][number]): string {
  return String(item.task_result?.value ?? item.taskresult?.value ?? '').trim();
}

function getTaskResultRemarks(item: InspectionTaskDetailDto['task_items'][number]): string {
  return String(item.task_result?.remarks ?? item.taskresult?.remarks ?? '').trim();
}

function getTaskResultState(item: InspectionTaskDetailDto['task_items'][number]): string {
  return String(item.task_result?.result_state ?? item.taskresult?.result_state ?? '').trim().toLowerCase();
}

function isIssueItem(item: InspectionTaskDetailDto['task_items'][number]): boolean {
  const resultState = getTaskResultState(item);
  if (resultState) return resultState === 'abnormal';
  if (item.is_normal === false || item.is_recheck === true) return true;
  const value = getTaskResultValue(item).toLowerCase();
  return value === '异常' || value === 'abnormal';
}

function resolveAttachmentImageUrl(attachment: Record<string, unknown>): string | null {
  const candidates = [
    attachment.url,
    attachment.file_url,
    attachment.fileUrl,
    attachment.preview_url,
    attachment.previewUrl,
    attachment.path,
    attachment.local_path,
    attachment.localPath,
    attachment.photopath,
    attachment.photoPath,
    attachment.filepath,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim();
    if (!value) continue;
    if (/^(data:|blob:|https?:)/i.test(value) || value.startsWith('/')) return value;
    const resolved = attachmentsApi.resolveAttachmentFileUrl(value);
    if (resolved) return resolved;
  }

  return null;
}

function buildIssueDescription(item: InspectionTaskDetailDto['task_items'][number]): string {
  const itemName = String(item.item_name ?? '').trim();
  const remarks = getTaskResultRemarks(item);
  const value = getTaskResultValue(item);
  const detailText = [value, remarks].filter(Boolean).join('；');
  if (itemName && detailText) return `${itemName}：${detailText}`;
  if (itemName) return itemName;
  return detailText || '现场发现异常，待补充问题描述。';
}

function buildIssueHierarchy(item: InspectionTaskDetailDto['task_items'][number]): string {
  return getAppendixBreadcrumbs(item.category_path).join('›');
}

function buildIssueSuggestion(item: InspectionTaskDetailDto['task_items'][number]): string {
  return getIssueSuggestionText(item);
}

const maintenanceDeviceRows = computed<MaintenanceDeviceRow[]>(() => {
  const rows: MaintenanceDeviceRow[] = [];

  for (const equipment of projectEquipmentList.value) {
    const equipId = Number(equipment.equipid ?? 0);
    const products = productsByEquipmentRef.value.get(equipId) ?? [];

    if (products.length === 0) {
      rows.push({
        key: `equip-${equipId || rows.length}`,
        electricRoom: resolveElectricRoom(equipment),
        equipmentName: resolveEquipmentName(null, equipment),
        deviceModel: '',
        serialNumber: '',
        department: resolveDepartment(null, equipment),
        equipmentNumber: resolveEquipmentNumber(null, equipment),
      });
      continue;
    }

    for (const product of products) {
      rows.push({
        key: `equip-${equipId}-product-${product.productid ?? rows.length}`,
        electricRoom: resolveElectricRoom(equipment),
        equipmentName: resolveEquipmentName(product, equipment),
        deviceModel: normalizeText(product.mlfb, ''),
        serialNumber: normalizeText(product.serialno, ''),
        department: resolveDepartment(product, equipment),
        equipmentNumber: resolveEquipmentNumber(product, equipment),
      });
    }
  }
  return rows;
});

const reportIssueEntries = computed<ReportIssueEntry[]>(() => {
  const rows: ReportIssueEntry[] = [];

  for (const entry of taskDetailsEntries.value) {
    const product = getEntryProduct(entry);
    const equipment = getEntryEquipment(product);

    for (const item of entry.detail.task_items) {
      if (!isIssueItem(item)) continue;

      rows.push({
        key: `${entry.task.taskid ?? 'task'}-${item.item_id}`,
        index: rows.length + 1,
        electricRoom: resolveElectricRoom(equipment),
        equipmentName: resolveEquipmentName(product, equipment),
        deviceModel: resolveDeviceModel(product, entry),
        serialNumber: resolveSerialNumber(product, entry),
        equipmentNumber: resolveEquipmentNumber(product, equipment),
        issueHierarchy: buildIssueHierarchy(item),
        issueDescription: buildIssueDescription(item),
        suggestion: buildIssueSuggestion(item),
        images: (item.attachments ?? [])
          .map((attachment) => resolveAttachmentImageUrl(attachment))
          .filter((image): image is string => Boolean(image)),
      });
    }
  }

  return rows;
});

function getAppendixBreadcrumbs(value: string | null | undefined): string[] {
  return String(value ?? '')
    .split(/\s*[\/›>]+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAppendixRenderableImage(value: string | null | undefined): boolean {
  const text = String(value ?? '').trim();
  if (!text) return false;
  return /^(data:|blob:|https?:)/i.test(text) || text.startsWith('/');
}

function getAppendixVisibleImages(
  group: { children?: Array<{ name?: string | null; images?: string[] | null }> } | null | undefined,
): Array<{ src: string; label: string }> {
  const imageMap = new Map<string, { src: string; label: string }>();
  for (const entry of group?.children ?? []) {
    for (const image of entry.images ?? []) {
      if (!isAppendixRenderableImage(image)) continue;
      if (!imageMap.has(image)) {
        imageMap.set(image, {
          src: image,
          label: normalizeText(entry.name, '-'),
        });
      }
    }
  }
  return Array.from(imageMap.values());
}

function openAppendixImagePreview(src: string, alt: string): void {
  appendixImagePreview.value = { src, alt };
}

function closeAppendixImagePreview(): void {
  appendixImagePreview.value = null;
}

function handleAppendixPreviewKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeAppendixImagePreview();
  }
}

async function loadReportData(): Promise<void> {
  const pid = Number(projectId.value);
  if (!Number.isFinite(pid) || pid <= 0) {
    project.value = null;
    report.value = null;
    projectCompany.value = null;
    taskDetailsEntries.value = [];
    projectEquipmentList.value = [];
    equipmentMapRef.value = new Map();
    productMapRef.value = new Map();
    productsByEquipmentRef.value = new Map();
    return;
  }

  reportLoading.value = true;
  try {
    const projectDto = await projectsApi.getProject(pid);
    const taskList = await inspectionTasksApi.searchInspectionTasks({ projectid: pid });
    const validTasks = taskList
      .filter((task) => task.taskid != null && task.taskid > 0)
      .sort((left, right) => Number(right.taskid ?? 0) - Number(left.taskid ?? 0));

    const company = projectDto.companyid > 0
      ? await companiesApi.getCompany(projectDto.companyid).catch(() => null)
      : null;
    projectCompany.value = company;
    const taskDetailsByTask = await Promise.all(
      validTasks.map(async (task) => ({
        task,
        detail: await inspectionTasksApi.getInspectionTaskDetail(Number(task.taskid)),
      })),
    );
    taskDetailsEntries.value = taskDetailsByTask;
    const attachmentsByTaskitem = new Map(
      (
        await Promise.all(
          taskDetailsByTask.map(async ({ task }) => {
            const taskId = Number(task.taskid ?? 0);
            if (!Number.isFinite(taskId) || taskId <= 0) {
              return [] as Array<readonly [string, Array<{ attaid?: string; taskid?: number | null; taskitemid?: string; filepath?: string | null; url: string | null }>]>
;
            }

            try {
              const attachments = await attachmentsApi.listAttachmentsByTaskid(taskId);
              const grouped = new Map<string, Array<{ attaid?: string; taskid?: number | null; taskitemid?: string; filepath?: string | null; url: string | null }>>();

              for (const attachment of attachments) {
                const taskItemId = String(attachment.taskitemid ?? '').trim();
                if (!taskItemId) continue;
                const list = grouped.get(taskItemId) ?? [];
                list.push({
                  ...attachment,
                  url: attachmentsApi.resolveAttachmentFileUrl(attachment.filepath),
                });
                grouped.set(taskItemId, list);
              }

              return Array.from(grouped.entries()).map(([taskItemId, list]) => [taskItemId, list] as const);
            } catch {
              return [] as Array<readonly [string, Array<{ attaid?: string; taskid?: number | null; taskitemid?: string; filepath?: string | null; url: string | null }>]>
;
            }
          }),
        )
      ).flat(),
    );
    const hydratedTaskDetailsByTask = taskDetailsByTask.map((entry) => ({
      ...entry,
      detail: {
        ...entry.detail,
        task_items: entry.detail.task_items.map((item) => ({
          ...item,
          attachments: attachmentsByTaskitem.get(String(item.item_id ?? '').trim()) ?? item.attachments ?? [],
        })),
      },
    }));
    taskDetailsEntries.value = hydratedTaskDetailsByTask;

    const projectEquipmentLinks = await projectEquipmentsApi.listByProject(pid).catch(() => []);
    const equipmentIds = Array.from(
      new Set(
        projectEquipmentLinks
          .map((item) => Number(item.equipmentid ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const equipments = await Promise.all(
      equipmentIds.map(async (equipmentId) => await equipmentsApi.getEquipment(equipmentId).catch(() => null)),
    );
    const realEquipments = equipments.filter((item): item is EquipmentDto => item != null);
    projectEquipmentList.value = realEquipments;
    equipmentMapRef.value = new Map(
      realEquipments
        .filter((item) => Number(item.equipid ?? 0) > 0)
        .map((item) => [Number(item.equipid), item]),
    );

    const productsByEquipment = new Map<number, ProductDto[]>();
    const productById = new Map<number, ProductDto>();

    await Promise.all(
      realEquipments.map(async (equipment) => {
        const equipId = Number(equipment.equipid ?? 0);
        if (!Number.isFinite(equipId) || equipId <= 0) return;
        const products = await productsApi.searchProducts({ equipmentid: equipId }).catch(() => []);
        productsByEquipment.set(equipId, products);
        for (const product of products) {
          const productId = Number(product.productid ?? 0);
          if (Number.isFinite(productId) && productId > 0) {
            productById.set(productId, product);
          }
        }
      }),
    );

    for (const entry of hydratedTaskDetailsByTask) {
      const productId = Number(entry.detail.task.product_id ?? entry.task.productid ?? 0);
      if (!Number.isFinite(productId) || productId <= 0 || productById.has(productId)) continue;
      const product = await productsApi.getProduct(productId).catch(() => null);
      if (!product) continue;
      productById.set(productId, product);
      const equipId = Number(product.equipid ?? 0);
      if (Number.isFinite(equipId) && equipId > 0) {
        const list = productsByEquipment.get(equipId) ?? [];
        if (!list.some((item) => Number(item.productid ?? 0) === productId)) {
          list.push(product);
          productsByEquipment.set(equipId, list);
        }
        if (!equipmentMapRef.value.has(equipId)) {
          const equipment = await equipmentsApi.getEquipment(equipId).catch(() => null);
          if (equipment) {
            equipmentMapRef.value.set(equipId, equipment);
            projectEquipmentList.value = [...projectEquipmentList.value, equipment];
          }
        }
      }
    }

    productMapRef.value = productById;
    productsByEquipmentRef.value = productsByEquipment;

    const factoryList = Array.from(
      new Set(
        projectEquipmentList.value
          .map((item) => String(item.factory ?? '').trim())
          .filter(Boolean),
      ),
    );
    project.value = {
      id: String(projectDto.projectid ?? pid),
      name: projectDto.projectname?.trim() || `项目 #${pid}`,
      factory: factoryList.join(' / ') || undefined,
    };

    if (validTasks.length === 0) {
      report.value = getReportByProjectId(String(pid)) ?? null;
      return;
    }

    report.value = buildReportFromProjectTaskDetailsSource({
      project: projectDto as ProjectDto,
      company,
      tasks: validTasks,
      productById: productMapRef.value,
      equipmentById: equipmentMapRef.value,
      taskDetailsByTask: hydratedTaskDetailsByTask,
    });
  } catch (error) {
    report.value = null;
    showToast({ message: error instanceof Error ? error.message : '报告数据加载失败' });
  } finally {
    reportLoading.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleAppendixPreviewKeydown);
  void loadReportData();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleAppendixPreviewKeydown);
});

watch(projectId, () => {
  void loadReportData();
});

function goToDetail() {
  if (!projectId.value) return;
  router.push(`/project/detail/${projectId.value}`);
}

async function exportWord() {
  if (!project.value || !report.value) return;
  wordExporting.value = true;
  try {
    await requestWordReportDownload(
      buildWordReportWebhookPayload({
        report: report.value,
        projectId: projectId.value,
        summary: {
          maintenanceSummary: summary.value.maintenanceSummary,
          sparePartsSuggestion: summary.value.sparePartsSuggestion,
        },
      }),
    );
    showToast({ message: 'Word 报告已开始下载' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Word 导出失败';
    showToast({ message: msg });
  } finally {
    wordExporting.value = false;
  }
}

function downloadPdf() {
  alert('下载 PDF：原型占位（待接入真实导出逻辑）');
}
</script>

<style scoped>
@import './styles/report-page.css';

.report-device-shell {
  overflow: hidden;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.75rem;
  background: var(--theme-color-surface, #fff);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
}

.report-device-caption {
  padding: 0.9rem 1.1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--theme-color-text);
  background: color-mix(in srgb, var(--theme-color-primary) 5%, white);
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.report-device-table-wrap {
  overflow-x: auto;
}

.report-device-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

.report-device-table th,
.report-device-table td {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--theme-color-soft-border);
  text-align: center;
  font-size: 0.9rem;
}

.report-device-table th {
  color: var(--theme-color-text);
  font-weight: 600;
  background: color-mix(in srgb, var(--theme-color-primary) 8%, white);
}

.report-device-table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--theme-color-primary) 2%, white);
}

.report-issue-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-issue-block {
  overflow: hidden;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.75rem;
  background: var(--theme-color-surface, #fff);
}

.report-issue-table {
  width: 100%;
  border-collapse: collapse;
}

.report-issue-table td {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--theme-color-soft-border);
  vertical-align: middle;
}

.report-issue-table__room {
  width: 64px;
  background: color-mix(in srgb, var(--theme-color-primary) 8%, white);
  color: var(--theme-color-primary);
  font-weight: 700;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.report-issue-table__number {
  width: 96px;
  font-weight: 700;
  color: var(--theme-color-text);
  text-align: center;
  background: color-mix(in srgb, var(--theme-color-primary) 4%, white);
}

.report-issue-table__label {
  width: 112px;
  color: var(--theme-color-weak-text);
  font-weight: 600;
  text-align: right;
  background: color-mix(in srgb, var(--theme-color-primary) 2%, white);
}

.report-issue-table__textcell {
  line-height: 1.8;
  color: var(--theme-color-text);
}

.report-issue-table__textcell strong {
  display: block;
  margin-bottom: 0.45rem;
  color: var(--theme-color-text);
}

.report-issue-table__hierarchy {
  margin-bottom: 0.45rem;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--theme-color-primary);
  font-weight: 600;
}

.report-issue-table__textcell p {
  margin: 0;
  white-space: pre-wrap;
}

.report-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.report-photo-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 148px;
  padding: 0.85rem;
  border: 1px dashed color-mix(in srgb, var(--theme-color-primary) 30%, var(--theme-color-soft-border));
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--theme-color-primary) 2%, white);
}

.report-photo-slot__button {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
}

.report-photo-slot__image {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 0.6rem;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.report-photo-slot__placeholder {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.report-photo-slot__hint {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--theme-color-weak-text);
}

.report-photo-empty {
  padding: 1rem 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

@media (max-width: 768px) {
  .report-issue-table__room {
    width: 42px;
    font-size: 0.75rem;
  }

  .report-issue-table__number,
  .report-issue-table__label,
  .report-issue-table td,
  .report-device-table th,
  .report-device-table td {
    font-size: 0.8rem;
  }

  .report-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.appendix-workshops {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
}

.appendix-workshop,
.appendix-device {
  display: flex;
  flex-direction: column;
}

.appendix-workshop {
  gap: 1rem;
}

.appendix-device {
  gap: 1rem;
  padding: 1rem 1.125rem 1.125rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 1rem;
  /* background: linear-gradient(180deg, rgba(0, 153, 153, 0.04), rgba(255, 255, 255, 0.96)); */
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.appendix-device__title {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--theme-color-text);
  letter-spacing: 0.01em;
}

.appendix-group {
  display: flex;
  flex-direction: column;
}

.appendix-group__panel {
  overflow: hidden;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.9rem;
  background: var(--theme-color-base);
}

.appendix-group__header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: linear-gradient(90deg, rgba(0, 153, 153, 0.12), rgba(0, 153, 153, 0.02));
  border-bottom: 1px solid var(--theme-color-soft-border);
}

.appendix-group__bar {
  width: 0.28rem;
  min-width: 0.28rem;
  align-self: stretch;
  border-radius: 999px;
  background: linear-gradient(180deg, #009999, #0f766e);
}

.appendix-group__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.45rem;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--theme-color-text);
}

.appendix-group__crumb:last-child {
  color: #0f766e;
}

.appendix-group__separator {
  color: var(--theme-color-text-soft);
  font-weight: 500;
}

.appendix-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--theme-color-base);
}

.appendix-table th,
.appendix-table td {
  padding: 0.75rem;
  text-align: left;
  vertical-align: top;
  border: 1px solid var(--theme-color-soft-border);
  font-size: 0.875rem;
}

.appendix-table th:first-child,
.appendix-table td:first-child {
  border-left: none;
}

.appendix-table th:last-child,
.appendix-table td:last-child {
  border-right: none;
}

.appendix-table tbody tr:last-child td {
  border-bottom: none;
}

.appendix-gallery {
  padding: 0.9rem 1rem 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
  /* background: linear-gradient(180deg, rgba(0, 153, 153, 0.03), rgba(255, 255, 255, 0.9)); */
}

.appendix-gallery__head {
  margin-bottom: 0.75rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #0f766e;
}

.appendix-gallery__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.appendix-gallery__item {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.75rem;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.appendix-gallery__button {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
}

.appendix-gallery__image {
  display: block;
  width: 100%;
  height: 168px;
  object-fit: cover;
  background: #e2e8f0;
  transition: transform 160ms ease, filter 160ms ease;
}

.appendix-gallery__caption {
  padding: 0.65rem 0.75rem 0.8rem;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--theme-color-text);
  text-align: center;
}

.appendix-gallery__button:hover .appendix-gallery__image,
.appendix-gallery__button:focus-visible .appendix-gallery__image {
  transform: scale(1.03);
  filter: saturate(1.04);
}

.appendix-gallery__button:focus-visible {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.appendix-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(6px);
}

.appendix-lightbox__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
}

.appendix-lightbox__figure {
  max-width: min(1100px, 100%);
  max-height: 100%;
  margin: 0;
}

.appendix-lightbox__image {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 4rem);
  border-radius: 1rem;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.36);
  background: #fff;
}

.appendix-table th {
  background: var(--theme-color-soft);
  color: var(--theme-color-text);
  font-weight: 600;
}

.appendix-table td {
  color: var(--theme-color-text-soft);
}
</style>
