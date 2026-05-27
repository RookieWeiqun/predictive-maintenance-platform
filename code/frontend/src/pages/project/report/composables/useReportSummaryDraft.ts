import { computed, onMounted, ref, watch, type Ref } from 'vue';
import type { ReportData } from '@/mockdata/report/index.ts';
import type { ReportSummaryDraft } from '../types';

function normalizeDraft(value: Partial<ReportSummaryDraft> | null | undefined): ReportSummaryDraft {
  return {
    maintenanceSummary: value?.maintenanceSummary ?? '',
    sparePartsSuggestion: value?.sparePartsSuggestion ?? '',
  };
}

function hasDraftContent(value: Partial<ReportSummaryDraft> | null | undefined): boolean {
  return Boolean(value?.maintenanceSummary?.trim() || value?.sparePartsSuggestion?.trim());
}

export function useReportSummaryDraft(
  projectId: Ref<string>,
  report: Ref<ReportData | null>,
  persistedSummary: Ref<ReportSummaryDraft | null>,
) {
  const summary = ref<ReportSummaryDraft>({
    maintenanceSummary: '',
    sparePartsSuggestion: '',
  });

  const draftKey = computed(() => `report_summary_draft__project_${projectId.value}`);

  function loadDraft() {
    try {
      const raw = localStorage.getItem(draftKey.value);
      const localDraft = raw ? normalizeDraft(JSON.parse(raw) as Partial<ReportSummaryDraft>) : null;
      const savedSummary = normalizeDraft(persistedSummary.value);
      if (hasDraftContent(savedSummary)) {
        summary.value = savedSummary;
      } else if (hasDraftContent(localDraft)) {
        summary.value = localDraft;
      } else if (persistedSummary.value) {
        summary.value = savedSummary;
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

  watch([projectId, persistedSummary], () => loadDraft());

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
