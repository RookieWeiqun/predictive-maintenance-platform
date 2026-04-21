<!-- ag-grid 全宽行：IxCard，展示序列号与上次维护时间（数据来自接口字段，无则显示 —） -->
<template>
  <div ref="rootEl" class="device-serial-strip">
    <div
      v-for="card in cards"
      :key="card.serial"
      class="device-serial-card-wrap"
    >
      <IxCard variant="outline" class="device-serial-card" @click="(e) => onCardClick(card.serial, e)">
        <IxCardContent>
          <!-- 注意：定位规则依赖 `ix-typography:last-of-type`，两行顺序不要调整 -->
          <IxTypography class="device-serial-card__sn">
            序列号：<span class="device-serial-card__mono">{{ card.serial }}</span>
          </IxTypography>
          <IxTypography class="device-serial-card__time">
            上次维护：{{ card.lastMaintText }} ｜ 任务：{{ card.taskCount }}
          </IxTypography>
        </IxCardContent>
      </IxCard>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, nextTick } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import { IxCard, IxCardContent, IxTypography, showModal } from '@siemens/ix-vue';
import DeviceTaskModal from './DeviceTaskModal.vue';

type MaintenanceInfo = {
  lastMaintenanceDate: string;
};

type SerialStripRow = {
  rowKind: 'serialStrip';
  parent: {
    id: string;
    serialNumbers: string[];
    maintenance: MaintenanceInfo;
    taskEntries?: {
      taskid: number;
      taskNo: string;
      statusText: string;
      templateName: string;
      productid: number;
      serialno: string;
      items: {
        name: string;
        categorypath: string;
        result: string;
      }[];
    }[];
    fallbackTemplateName?: string;
    fallbackTaskItems?: {
      name: string;
      categorypath: string;
      result: string;
    }[];
  };
};

const props = defineProps<{
  params: ICellRendererParams<SerialStripRow>;
}>();

const parent = computed(() => props.params.data?.parent);
const rootEl = ref<HTMLElement | null>(null);

/** 任务上的 serialno 与卡片序列号一致；设备接口的 serialNumbers 常与 Product 不一致，详情页已用产品序列号纠正，此处再兜底避免误走「单条模板」合成任务 */
function taskEntriesForSerial(serial: string) {
  const all = parent.value?.taskEntries ?? [];
  const s = serial.trim();
  const matched = all.filter((x) => (x.serialno ?? '').trim() === s);
  if (matched.length > 0) return matched;
  if (s === '—' || s === '') return all;
  return matched;
}
let ro: ResizeObserver | null = null;
let raf = 0;

function formatDateYmd(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

const cards = computed(() => {
  const p = parent.value;
  if (!p) return [];
  const lastText = formatDateYmd(p.maintenance?.lastMaintenanceDate ?? '');
  return p.serialNumbers.map((serial) => ({
    serial,
    lastMaintText: lastText || '—',
    taskCount: taskEntriesForSerial(serial).length,
  }));
});

function onCardClick(serial: string, event: Event) {
  const tasks = taskEntriesForSerial(serial);
  const fallbackItems = parent.value?.fallbackTaskItems ?? [];
  const fallbackTemplateName = parent.value?.fallbackTemplateName || '模板检测项';
  const displayTasks =
    tasks.length > 0
      ? tasks
      : fallbackItems.length > 0
        ? [
            {
              taskid: -1,
              taskNo: '尚未生成任务数据',
              statusText: '无记录',
              templateName: fallbackTemplateName,
              items: fallbackItems,
            },
          ]
        : [];
  showModal({
    size: '900',
    centered: true,
    content: h(DeviceTaskModal, {
      data: {
        title: `序列号 ${serial} 的检测任务`,
        tasks: displayTasks,
      },
    }),
  });
  event.stopPropagation();
}

function updateRowHeightFromDom() {
  const el = rootEl.value;
  const rowNode = props.params.node;
  const api = props.params.api;
  if (!el || !rowNode || !api) return;

  // 取实际内容高度（含两行/滚动条等），并加一点余量避免裁切
  const next = Math.max(72, Math.ceil(el.scrollHeight + 2));
  if (rowNode.rowHeight === next) return;
  rowNode.setRowHeight(next);
  api.onRowHeightChanged();
}

onMounted(async () => {
  await nextTick();
  updateRowHeightFromDom();

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updateRowHeightFromDom());
    });
    if (rootEl.value) ro.observe(rootEl.value);
  }
});

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  ro?.disconnect();
  ro = null;
});
</script>

<style scoped>
/* 根容器：至少显示 2 行，超过 2 行出现滚动条 */
.device-serial-strip {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.75rem 1rem;

  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-content: flex-start;
  align-items: stretch;
  gap: 0.625rem;

  /* 约两行卡片高度（含 gap），超出则滚动 */
  max-height: 132px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
}

.device-serial-strip > .device-serial-card-wrap {
  flex: 0 0 auto;
  display: block;
}

.device-serial-card__mono {
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 600;
}

/* 适当增大序列号字体，符合大卡片信息密度 */
.device-serial-card__sn {
  font-size: 0.875rem;
  text-align: left;
}

.device-serial-card__time {
  font-size: 0.8125rem;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  text-align: left;
}

/* 更干净的滚动条占位，避免内容贴边 */
.device-serial-strip {
  scrollbar-gutter: stable both-edges;
}
</style>

<style>
/*
  关键机制说明（你提到的“组件样式调整机制”）：
  `IxCard`/`IxTypography` 最终渲染为 Web Component（`<ix-card>` / `<ix-typography>`）。
  当它们作为子组件输出时，父组件的 `<style scoped>` 很难稳定命中其最终的根节点样式。
  所以必须把 `ix-card { ... }` 这类规则放到非 scoped 的样式中，并用 `.device-serial-card-wrap` 做命名空间。
*/

/* 按你给的要求定义（仅作用于本组件展开区） */
.device-serial-card-wrap ix-card {
  /* 尺寸：更协调，且在不同屏幕下更稳定 */
  width: clamp(11rem, 16vw, 12rem);
  height: clamp(3rem, 7.5vw, 5rem);

  position: relative;
  cursor: pointer;
  margin: 0.25rem;

  /* 视觉：更像 iX 的信息卡片（层次、圆角、柔和描边） */
  border-radius: 0.625rem;
  overflow: hidden;
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(0, 255, 185, 0.10) 0%, rgba(0, 255, 185, 0.00) 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);

  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.10),
    0 1px 8px rgba(0, 0, 0, 0.22);

  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    filter 140ms ease;
}

.device-serial-card-wrap ix-card:hover {
  transform: translateY(-1px);
  filter: saturate(1.03);
  box-shadow:
    inset 0 0 0 1px rgba(0, 255, 185, 0.45),
    0 5px 14px rgba(0, 0, 0, 0.28);
}

.device-serial-card-wrap ix-card:active {
  transform: translateY(0);
  box-shadow:
    inset 0 0 0 1px rgba(0, 255, 185, 0.55),
    0 2px 12px rgba(0, 0, 0, 0.26);
}

.device-serial-card-wrap ix-card:focus-visible {
  outline: 2px solid var(--theme-color-primary);
  outline-offset: 2px;
}

.device-serial-card-wrap ix-card ix-typography:last-of-type {
  position: absolute;
  bottom: 1rem;
}

/* 覆盖 AG Grid 全宽单元格内可能把 flex 主轴设为纵向的样式 */
.ag-cell.ag-cell-full-width .device-serial-strip,
.ag-full-width-container .device-serial-strip {
  flex-direction: row !important;
  flex-wrap: wrap !important;
  display: flex !important;
}
</style>
