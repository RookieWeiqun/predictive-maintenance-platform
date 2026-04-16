/**
 * ECharts 配置纯函数，便于单测与与 Vue 生命周期解耦。
 */
import type { ServiceBasicInfo } from '@/mockdata/report/types';
import type { ReportData } from '@/mockdata/report/index.ts';

const EXEC_CHECK_PIE_COLORS = ['#d72332', '#e67e22', '#f1c40f', '#2ecc71'];

const PIE_DOUGHNUT_FLAT = {
  radius: ['40%', '70%'] as [string, string],
  itemStyle: {
    borderRadius: 0,
    borderWidth: 0,
  },
  label: { show: false },
  labelLine: { show: false },
  avoidLabelOverlap: false,
};

const PIE_LEGEND_BOTTOM = {
  orient: 'horizontal' as const,
  bottom: '3%',
  left: 'center' as const,
  icon: 'roundRect',
  itemGap: 14,
  textStyle: { fontSize: 12, color: 'var(--theme-color-weak-text)' },
};

export function buildExecStatsPieOption(s: ServiceBasicInfo['executionStatistics'] | undefined) {
  if (!s) return {};
  const data = [
    { name: '亟需维护', value: s.urgentMaintenance, itemStyle: { color: EXEC_CHECK_PIE_COLORS[0] } },
    { name: '要求维护', value: s.requiredMaintenance, itemStyle: { color: EXEC_CHECK_PIE_COLORS[1] } },
    { name: '建议维护', value: s.recommendedMaintenance, itemStyle: { color: EXEC_CHECK_PIE_COLORS[2] } },
    { name: '正常结果', value: s.normalResults, itemStyle: { color: EXEC_CHECK_PIE_COLORS[3] } },
  ];
  return {
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c} ({d}%)' },
    legend: PIE_LEGEND_BOTTOM,
    series: [
      {
        name: '检查结果',
        type: 'pie',
        center: ['50%', '46%'],
        ...PIE_DOUGHNUT_FLAT,
        data,
      },
    ],
  };
}

export function buildRadarOption(report: ReportData | null) {
  const radar = report?.systemEvaluation.radar ?? [];
  const indicators = radar.map((x) => ({ name: x.label, max: x.max ?? 100 }));
  const values = radar.map((x) => x.value ?? 0);
  const teal = '#00a59b';
  return {
    color: [teal],
    tooltip: { trigger: 'item' },
    radar: {
      indicator: indicators,
      center: ['50%', '54%'],
      radius: '72%',
      splitNumber: 4,
      axisName: { color: 'var(--theme-color-weak-text, #666)', fontSize: 11 },
      splitArea: {
        areaStyle: {
          color: ['rgba(0,165,155,0.06)', 'rgba(0,165,155,0.14)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.12)' } },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
    },
    series: [
      {
        type: 'radar',
        symbolSize: 6,
        lineStyle: { width: 2, color: teal },
        areaStyle: { color: 'rgba(0,165,155,0.22)' },
        data: [{ value: values, name: '综合得分' }],
      },
    ],
  };
}

export function buildBeforeAfterOption(report: ReportData | null) {
  const ba = report?.systemEvaluation.beforeAfter;
  if (!ba) return {};
  const primary =
    typeof window !== 'undefined' && document.documentElement
      ? getComputedStyle(document.documentElement).getPropertyValue('--theme-color-primary').trim() ||
        '#00a59b'
      : '#00a59b';
  return {
    color: [primary],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '10%', right: '8%', top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: ['维护前', '维护后'],
      axisLabel: { color: 'var(--theme-color-weak-text, #666)' },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      axisLabel: { color: 'var(--theme-color-weak-text, #666)' },
    },
    series: [
      {
        name: '综合得分',
        type: 'bar',
        data: [ba.beforeScore, ba.afterScore],
        barWidth: '46%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: primary,
        },
      },
    ],
  };
}
