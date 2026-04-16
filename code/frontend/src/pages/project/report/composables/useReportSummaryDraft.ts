import { computed, onMounted, ref, watch, type Ref } from 'vue';
import type { ReportData } from '@/mockdata/report/index.ts';
import type { ReportSummaryDraft } from '../types';

export function useReportSummaryDraft(projectId: Ref<string>, report: Ref<ReportData | null>) {
  const summary = ref<ReportSummaryDraft>({
    maintenanceSummary: '',
    sparePartsSuggestion: '',
  });

  const draftKey = computed(() => `report_summary_draft__project_${projectId.value}`);

  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey.value);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReportSummaryDraft>;
        summary.value = {
          maintenanceSummary: parsed.maintenanceSummary ?? '',
          sparePartsSuggestion: parsed.sparePartsSuggestion ?? '',
        };
      } else if (report.value?.summaryDefaults) {
        summary.value = {
          maintenanceSummary: report.value.summaryDefaults.maintenanceSummary ?? '',
          sparePartsSuggestion: report.value.summaryDefaults.sparePartsSuggestion ?? '',
        };
      } else {
        summary.value = { maintenanceSummary: '', sparePartsSuggestion: '' };
      }
    } catch {
      // ignore
    }
  }

  onMounted(() => loadDraft());

  watch(projectId, () => loadDraft());

  watch(
    summary,
    (v) => {
      try {
        localStorage.setItem(draftKey.value, JSON.stringify(v));
      } catch {
        // ignore
      }
    },
    { deep: true },
  );

  return { summary };
}
