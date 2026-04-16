import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, RadarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ReportData } from '@/mockdata/report/index.ts';
import type { ServiceBasicInfo } from '@/mockdata/report/types';
import {
  buildBeforeAfterOption,
  buildExecStatsPieOption,
  buildRadarOption,
} from '../reportChartOptions';

echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  RadarChart,
  BarChart,
  PieChart,
  CanvasRenderer,
]);

export type ReportChartMountRefs = {
  radarChartRef: Ref<HTMLDivElement | null>;
  beforeAfterChartRef: Ref<HTMLDivElement | null>;
  execStatsPieRef: Ref<HTMLDivElement | null>;
};

export function useReportCharts(
  report: Ref<ReportData | null>,
  serviceBasicBlock: Ref<ServiceBasicInfo | null>,
  hasMaintenanceScoreDelta: Ref<boolean>,
  { radarChartRef, beforeAfterChartRef, execStatsPieRef }: ReportChartMountRefs,
) {

  let radarChart: echarts.ECharts | null = null;
  let beforeAfterChart: echarts.ECharts | null = null;
  let execStatsPieChart: echarts.ECharts | null = null;

  function onResizeCharts() {
    radarChart?.resize();
    beforeAfterChart?.resize();
    execStatsPieChart?.resize();
  }

  function disposeRadar() {
    radarChart?.dispose();
    radarChart = null;
  }

  function disposeBeforeAfter() {
    beforeAfterChart?.dispose();
    beforeAfterChart = null;
  }

  function disposeExecStatsPie() {
    execStatsPieChart?.dispose();
    execStatsPieChart = null;
  }

  function initOrUpdateRadar() {
    if (!radarChartRef.value || !report.value) return;
    if (!radarChart) {
      radarChart = echarts.init(radarChartRef.value);
      window.addEventListener('resize', onResizeCharts);
    }
    radarChart.setOption(buildRadarOption(report.value), true);
    radarChart.resize();
  }

  function initOrUpdateBeforeAfter() {
    if (!hasMaintenanceScoreDelta.value || !beforeAfterChartRef.value || !report.value) {
      disposeBeforeAfter();
      return;
    }
    if (!beforeAfterChart) {
      beforeAfterChart = echarts.init(beforeAfterChartRef.value);
    }
    beforeAfterChart.setOption(buildBeforeAfterOption(report.value), true);
    beforeAfterChart.resize();
  }

  function initOrUpdateExecStatsPie() {
    if (!serviceBasicBlock.value || !execStatsPieRef.value) {
      disposeExecStatsPie();
      return;
    }
    if (!execStatsPieChart) {
      execStatsPieChart = echarts.init(execStatsPieRef.value);
    }
    execStatsPieChart.setOption(
      buildExecStatsPieOption(serviceBasicBlock.value.executionStatistics),
      true,
    );
    execStatsPieChart.resize();
  }

  function refreshAllCharts() {
    nextTick(() => {
      initOrUpdateRadar();
      initOrUpdateBeforeAfter();
      initOrUpdateExecStatsPie();
    });
  }

  watch(
    () =>
      [
        report.value,
        radarChartRef.value,
        beforeAfterChartRef.value,
        execStatsPieRef.value,
        hasMaintenanceScoreDelta.value,
        serviceBasicBlock.value,
      ] as const,
    () => refreshAllCharts(),
    { deep: true },
  );

  onMounted(() => refreshAllCharts());

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResizeCharts);
    disposeRadar();
    disposeBeforeAfter();
    disposeExecStatsPie();
  });
}
