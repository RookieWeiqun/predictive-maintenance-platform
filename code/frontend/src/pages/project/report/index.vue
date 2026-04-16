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
      <div v-if="!report" class="report-empty">未找到报告 mock 数据（projectId={{ projectId }}）</div>
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
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
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
  iconAuditReport,
  iconGenericDeviceMaintenance,
} from '@siemens/ix-icons/icons';

import projectsData from '@/mockdata/project/projects.json';
import { getReportByProjectId } from '@/mockdata/report/index.ts';
import logoUrl from '../../../../image/siemens logo.svg';
import { buildWordReportWebhookPayload, requestWordReportDownload } from '@/config/n8n';

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

type Project = (typeof projectsData.projects)[number];

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.id ?? ''));

const project = computed<Project | undefined>(() => {
  return projectsData.projects.find((p) => String(p.id) === projectId.value);
});

const report = computed(() => getReportByProjectId(projectId.value));

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
</style>
