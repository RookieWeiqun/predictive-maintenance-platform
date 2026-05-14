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

          <!-- 1 系统综合评估 -->
          <article id="sec-2" class="report-sheet" data-toc-anchor>
            <h2 class="sheet-h2">1 系统综合评估</h2>
            <p class="sheet-lead">
              基于本次采集的现场数据对维护对象进行总体评估：
            </p>
          </article>

          <article id="sec-2-1" class="report-sheet report-sheet--sub" data-toc-anchor>
            <h3 class="sheet-h3">1.1 总体维护评价与指标分布</h3>
            <p class="muted sheet-lead-tight">系统总体评估得分为： {{ report.systemEvaluation.overallScore }}，评价登记为：{{ report.systemEvaluation.overallRating }}</p>
            <div class="eval-suite-row eval-suite-row--merged">

              <div class="eval-suite-charts">
                <div v-if="serviceBasicBlock" class="eval-suite-chart-block">
                  <p class="eval-suite-pie__cap muted">现场检查分布（饼图）</p>
                  <div class="eval-suite-chart-cell">
                    <div
                      ref="execStatsPieRef"
                      class="exec-stats-pie-echart exec-stats-pie-echart--merged"
                      role="img"
                      aria-label="现场检查结果分布饼图"
                    />
                  </div>
                </div>
                <div class="eval-suite-chart-block">
                  <p class="eval-suite-pie__cap muted">各项评估指标（雷达图）</p>
                  <div class="eval-suite-chart-cell eval-suite-chart-cell--radar">
                    <div
                      ref="radarChartRef"
                      class="radar-echart radar-echart--merged"
                      role="img"
                      aria-label="评估指标雷达图"
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article id="sec-2-3" class="report-sheet report-sheet--sub" data-toc-anchor>
            <h3 class="sheet-h3">1.2 维护前后评估对比</h3>
            <template v-if="hasMaintenanceScoreDelta">
              <p class="muted">维护处理前后综合得分对比如下（满分 100）。</p>
              <div
                ref="beforeAfterChartRef"
                class="before-after-echart"
                role="img"
                aria-label="维护前后评估对比图"
              />
              <p v-if="report.systemEvaluation.beforeAfter.notes" class="before-after-notes">
                {{ report.systemEvaluation.beforeAfter.notes }}
              </p>
            </template>
            <div v-else class="before-after-fallback muted">
              <p>
                本次记录中维护前后综合得分一致（{{
                  report.systemEvaluation.beforeAfter.beforeScore
                }}
                分），或未单独拆分维护动作前后的评分；若有现场处置说明见下文。
              </p>
              <p v-if="report.systemEvaluation.beforeAfter.notes" class="before-after-notes">
                {{ report.systemEvaluation.beforeAfter.notes }}
              </p>
            </div>
          </article>

          <!-- 2 主要对象分析与评估 -->
          <article id="sec-3" class="report-sheet" data-toc-anchor>
            <h2 class="sheet-h2">2 发现与建议</h2>
            <p class="sheet-lead">按主要评估对象拆分展示问题卡片与推荐服务（演示数据按对象顺序分配卡片）。</p>
            <!-- 目录锚点：保留 2.x 的跳转能力 -->
            <div class="eval-anchor-list" aria-hidden="true">
              <div v-for="ev in mainObjectEvaluations" :id="ev.anchor" :key="ev.anchor" class="eval-anchor" />
            </div>

            <div v-if="!displayProblemCards.length" class="empty-block muted">暂无问题卡片条目。</div>
            <div v-else class="problem-cards">
              <div v-for="(card, cidx) in displayProblemCards" :key="`eval-card-${cidx}`" class="problem-card">
                <div class="problem-card__accent" aria-hidden="true" />
                <div class="problem-card__inner">
                  <header class="problem-card__head">
                    <div>
                      <div class="problem-card__title">{{ card.title }}</div>
                      <p class="problem-card__desc">{{ card.description }}</p>
                    </div>
                    <span class="severity-badge" :class="`severity-badge--${card.severityKey}`">
                      {{ card.severity }}
                    </span>
                  </header>

                  <section class="problem-card__section problem-card__section--objects">
                    <div class="problem-card__section-head">
                      <span class="problem-card__label">涉及对象：</span>
                      <button type="button" class="problem-card__chev" aria-label="展开或筛选">
                        <IxIcon :name="iconChevronDownSmall" size="12" />
                      </button>
                    </div>
                    <div class="object-tags">
                      <span
                        v-for="(tag, ti) in card.affectedObjects"
                        :key="ti"
                        class="object-tag"
                        :class="`object-tag--${tag.variant}`"
                      >
                        {{ tag.label }}
                      </span>
                    </div>
                  </section>

                  <section class="problem-card__section problem-card__section--solution">
                    <span class="problem-card__label">解决建议：</span>
                    <ul class="problem-card__bullets">
                      <li v-for="(line, li) in card.solutions" :key="li">{{ line }}</li>
                    </ul>
                    <IxButton class="problem-card__btn" variant="primary" @click="onViewDetail(card)">
                      <IxIcon :name="iconAuditReport" size="16" class="btn-ico" />
                      查看详细建议
                    </IxButton>
                  </section>

                  <section class="problem-card__section problem-card__section--service">
                    <div class="problem-card__label">推荐服务</div>
                    <IxButton class="problem-card__btn problem-card__btn--secondary" variant="primary">
                      <IxIcon :name="iconGenericDeviceMaintenance" size="16" class="btn-ico" />
                      {{ card.recommendedService.name }}
                    </IxButton>
                    <div class="stars-row">
                      <span class="stars-label">推荐度</span>
                      <span class="stars" :aria-label="`推荐度 ${card.recommendedService.rating} / 5`">
                        <span
                          v-for="s in 5"
                          :key="s"
                          class="star"
                          :class="{ 'star--on': s <= card.recommendedService.rating }"
                        >
                          ★
                        </span>
                      </span>
                    </div>
                  </section>
                </div>
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
                            :key="`image-${workshopIndex}-${deviceIndex}-${groupIndex}-${imageIndex}`"
                            class="appendix-gallery__item"
                          >
                            <button
                              type="button"
                              class="appendix-gallery__button"
                              @click="openAppendixImagePreview(image, `${group.name || '检查分组'} 图片 ${imageIndex + 1}`)"
                            >
                              <img
                                :src="image"
                                :alt="`${group.name || '检查分组'} 图片 ${imageIndex + 1}`"
                                class="appendix-gallery__image"
                                loading="lazy"
                              />
                            </button>
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
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IxContentHeader, IxButton, IxIcon, showToast } from '@siemens/ix-vue';
/**
 * 图标：设计名为 kebab-case（见 https://ix.siemens.io/docs/icons/icon-library ），
 * 从 `@siemens/ix-icons/icons` 导入 `iconXxx` 常量。
 * `<IxIcon>` 必须使用 **`:name="iconXxx"`**（底层 `ix-icon` 只认 `name`，用 `:icon` 会无效并显示占位符）。
 */
import {
  iconChevronDownSmall,
  iconChevronLeft,
  iconChevronRight,
  iconClose,
  iconAuditReport,
  iconGenericDeviceMaintenance,
} from '@siemens/ix-icons/icons';

import logoUrl from '../../../../image/siemens logo.svg';
import { buildWordReportWebhookPayload, requestWordReportDownload } from '@/config/n8n';
import { attachmentsApi, companiesApi, equipmentsApi, inspectionTasksApi, productsApi, projectsApi } from '@/api';
import { getReportByProjectId, type ReportData } from '@/mockdata/report';
import type { ProjectDto } from '@/api/modules/projects';
import { buildReportFromProjectTaskDetailsSource } from './reportApiAdapter';

import type { ProblemCardView } from './types';
import {
  buildTocNodes,
  formatContactPerson,
  formatServiceDaysText,
  getServiceBasicBlock,
  mapRawProblemCards,
} from './reportViewUtils';
import { useReportCharts } from './composables/useReportCharts';
import { useReportSummaryDraft } from './composables/useReportSummaryDraft';
import { useReportTocSpy } from './composables/useReportTocSpy';

type ReportProjectView = {
  id: string;
  name: string;
  factory?: string;
};

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.id ?? ''));

const project = ref<ReportProjectView | null>(null);
const report = ref<ReportData | null>(null);
const reportLoading = ref(false);
const appendixImagePreview = ref<{ src: string; alt: string } | null>(null);

const wordExporting = ref(false);

const tocCollapsed = ref(false);
const mainScrollRef = ref<HTMLElement | null>(null);

const serviceBasicBlock = computed(() => getServiceBasicBlock(report.value));

/** 维护前后得分不同则展示柱状对比图 */
const hasMaintenanceScoreDelta = computed(() => {
  const ba = report.value?.systemEvaluation.beforeAfter;
  if (!ba) return false;
  return ba.beforeScore !== ba.afterScore;
});

const radarChartRef = useTemplateRef<HTMLDivElement>('radarChartRef');
const beforeAfterChartRef = useTemplateRef<HTMLDivElement>('beforeAfterChartRef');
const execStatsPieRef = useTemplateRef<HTMLDivElement>('execStatsPieRef');

useReportCharts(report, serviceBasicBlock, hasMaintenanceScoreDelta, {
  radarChartRef,
  beforeAfterChartRef,
  execStatsPieRef,
});
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

const mainObjectEvaluations = computed(() => {
  const list = report.value?.reportDocument?.evaluationObjects;
  if (list?.length) return list;
  return [{ anchor: 'eval-fallback', title: `${project.value?.name ?? '项目'} 综合评估` }];
});

const tocNodes = computed(() => buildTocNodes(report.value, project.value?.name ?? ''));

const displayProblemCards = computed(() => mapRawProblemCards(report.value));
const appendixWorkshops = computed(() => report.value?.appendixDetailedInspection?.workshops ?? []);

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

function getAppendixVisibleImages(group: { children?: Array<{ images?: string[] | null }> } | null | undefined): string[] {
  const imageSet = new Set<string>();
  for (const entry of group?.children ?? []) {
    for (const image of entry.images ?? []) {
      if (!isAppendixRenderableImage(image)) continue;
      imageSet.add(image);
    }
  }
  return Array.from(imageSet);
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
    return;
  }

  reportLoading.value = true;
  try {
    const projectDto = await projectsApi.getProject(pid);
    const taskList = await inspectionTasksApi.searchInspectionTasks({ projectid: pid });
    const validTasks = taskList
      .filter((task) => task.taskid != null && task.taskid > 0)
      .sort((left, right) => Number(right.taskid ?? 0) - Number(left.taskid ?? 0));

    project.value = {
      id: String(projectDto.projectid ?? pid),
      name: projectDto.projectname?.trim() || `项目 #${pid}`,
    };

    if (pid === 1) {
      report.value = getReportByProjectId('1');
      return;
    }

    if (validTasks.length === 0) {
      report.value = null;
      return;
    }

    const company = projectDto.companyid > 0
      ? (await companiesApi.listCompanies()).find((item) => item.companyid === projectDto.companyid) ?? null
      : null;
    const taskDetailsByTask = await Promise.all(
      validTasks.map(async (task) => ({
        task,
        detail: await inspectionTasksApi.getInspectionTaskDetail(Number(task.taskid)),
      })),
    );
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
    const productIds = Array.from(
      new Set(
        hydratedTaskDetailsByTask
          .map(({ task, detail }) => Number(detail.task.product_id ?? task.productid))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
    const products = await Promise.all(
      productIds.map(async (id) => {
        try {
          return await productsApi.getProduct(id);
        } catch {
          return null;
        }
      }),
    );
    const productById = new Map(
      products
        .filter((item): item is NonNullable<typeof item> => item != null && Number(item.productid) > 0)
        .map((item) => [Number(item.productid), item]),
    );
    const equipmentIds = Array.from(
      new Set(
        products
          .map((item) => Number(item?.equipid ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
    const equipments = await Promise.all(
      equipmentIds.map(async (id) => {
        try {
          return await equipmentsApi.getEquipment(id);
        } catch {
          return null;
        }
      }),
    );
    const equipmentById = new Map(
      equipments
        .filter((item): item is NonNullable<typeof item> => item != null && Number(item.equipid) > 0)
        .map((item) => [Number(item.equipid), item]),
    );

    report.value = buildReportFromProjectTaskDetailsSource({
      project: projectDto as ProjectDto,
      company,
      tasks: validTasks,
      productById,
      equipmentById,
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

function onViewDetail(card: ProblemCardView) {
  alert(`查看详细建议：${card.title}（原型占位）`);
}
</script>

<style scoped>
@import './styles/report-page.css';

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
