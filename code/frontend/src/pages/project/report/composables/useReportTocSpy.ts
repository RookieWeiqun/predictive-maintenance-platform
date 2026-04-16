import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import type { ReportData } from '@/mockdata/report/index.ts';

export function useReportTocSpy(
  report: Ref<ReportData | null>,
  mainScrollRef: Ref<HTMLElement | null>,
) {
  const activeAnchor = ref('sec-cover');
  let observer: IntersectionObserver | null = null;

  function setupScrollSpy() {
    observer?.disconnect();
    const root = mainScrollRef.value;
    if (!root) return;
    const els = root.querySelectorAll('[data-toc-anchor]');
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        if (visible[0]?.target?.id) {
          activeAnchor.value = visible[0].target.id;
        }
      },
      { root, rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 1] },
    );
    els.forEach((el) => observer?.observe(el));
  }

  watch(
    () => report.value,
    () => {
      nextTick(() => setupScrollSpy());
    },
  );

  onMounted(() => {
    nextTick(() => setupScrollSpy());
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  function scrollToAnchor(id: string) {
    const root = mainScrollRef.value;
    const el = root?.querySelector(`#${CSS.escape(id)}`);
    if (el && root) {
      const top = (el as HTMLElement).offsetTop - 8;
      root.scrollTo({ top, behavior: 'smooth' });
      activeAnchor.value = id;
    }
  }

  return { activeAnchor, scrollToAnchor, setupScrollSpy };
}
