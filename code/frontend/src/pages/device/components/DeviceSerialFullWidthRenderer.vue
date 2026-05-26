<!-- ag-grid 全宽行：产品子表，逐行展示当前设备的所有 product -->
<template>
  <div ref="rootEl" class="device-product-panel">
    <div v-if="products.length > 0" class="device-product-shell">
      <table class="device-product-table">
        <colgroup>
          <col class="device-product-col device-product-col--index" />
          <col class="device-product-col device-product-col--id" />
          <col class="device-product-col device-product-col--mlfb" />
          <col class="device-product-col device-product-col--serial" />
          <col class="device-product-col device-product-col--series" />
          <col class="device-product-col device-product-col--size" />
          <col class="device-product-col device-product-col--time" />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Product ID</th>
            <th>产品型号</th>
            <th>序列号</th>
            <th>Series</th>
            <th>Size</th>
            <th>上次维护</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(product, index) in products" :key="product.id">
            <td>
              <span class="device-product-index">{{ index + 1 }}</span>
            </td>
            <td>
              <span class="device-product-chip">{{ product.productId ?? '—' }}</span>
            </td>
            <td>
              <div class="device-product-main">{{ product.mlfb || '—' }}</div>
            </td>
            <td class="device-product-table__mono">{{ product.serialno || '—' }}</td>
            <td>{{ product.series || '—' }}</td>
            <td>{{ product.size || '—' }}</td>
            <td>
              <span class="device-product-time">{{ product.lastMaintenanceText || '—' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="device-product-empty">当前设备暂无 product 数据。</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';

type DeviceProductRow = {
  id: string;
  productId: number | null;
  mlfb: string;
  serialno: string;
  series: string;
  size: string;
  lastMaintenanceText: string;
};

type ProductTableRow = {
  rowKind: 'productTable';
  parent: {
    id: string;
    products: DeviceProductRow[];
  };
};

const props = defineProps<{
  params: ICellRendererParams<ProductTableRow>;
}>();

const parent = computed(() => props.params.data?.parent);
const products = computed(() => parent.value?.products ?? []);
const rootEl = ref<HTMLElement | null>(null);

let ro: ResizeObserver | null = null;
let raf = 0;

function updateRowHeightFromDom() {
  const el = rootEl.value;
  const rowNode = props.params.node;
  const api = props.params.api;
  if (!el || !rowNode || !api) return;

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
.device-product-panel {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 1.125rem 1.25rem 1.25rem;
  overflow-y: auto;
}

.device-product-shell {
  width: 100%;
  max-width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 1rem;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 249, 252, 0.98) 100%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.device-product-table {
  width: 100%;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  background: transparent;
  padding: 0.5rem 0.75rem 0.8rem;
}

.device-product-col--index {
  width: 5.5rem;
}

.device-product-col--id {
  width: 8rem;
}

.device-product-col--mlfb {
  width: 22%;
}

.device-product-col--serial {
  width: 24%;
}

.device-product-col--series {
  width: 12%;
}

.device-product-col--size {
  width: 11%;
}

.device-product-col--time {
  width: 12rem;
}

.device-product-table th,
.device-product-table td {
  padding: 0.95rem 1rem;
  text-align: left;
  font-size: 0.84rem;
  vertical-align: middle;
  overflow: hidden;
}

.device-product-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(243, 247, 250, 0.92);
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.device-product-table tbody td {
  background: rgba(255, 255, 255, 0.92);
  border-top: 0.75rem solid transparent;
  border-bottom: 0;
}

.device-product-table tbody tr:hover {
  filter: saturate(1.02);
}

.device-product-table tbody tr:hover td {
  background: rgba(241, 248, 252, 0.98);
}

.device-product-table tbody td:first-child {
  border-top-left-radius: 0.9rem;
  border-bottom-left-radius: 0.9rem;
}

.device-product-table tbody td:last-child {
  border-top-right-radius: 0.9rem;
  border-bottom-right-radius: 0.9rem;
}

.device-product-table tbody tr:first-child td {
  border-top-width: 1rem;
}

.device-product-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.07);
  font-weight: 700;
}

.device-product-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.75rem;
  border-radius: 999px;
  background: rgba(0, 153, 204, 0.1);
  color: rgba(0, 73, 98, 1);
  font-weight: 600;
}

.device-product-main {
  font-weight: 600;
  color: var(--theme-color-text);
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-product-table__mono {
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-size: 0.82rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-product-time {
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  white-space: nowrap;
}

.device-product-empty {
  padding: 1.5rem 1.25rem;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 1rem;
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 249, 252, 0.98) 100%);
}
</style>

<style>
.ag-cell.ag-cell-full-width,
.ag-full-width-row,
.ag-full-width-container,
.ag-full-width-row .ag-cell-wrapper,
.ag-full-width-row .ag-cell-value,
.ag-full-width-container .ag-cell-wrapper,
.ag-full-width-container .ag-cell-value {
  width: 100% !important;
  max-width: 100% !important;
}

.ag-cell.ag-cell-full-width .device-product-panel,
.ag-full-width-container .device-product-panel {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  padding: 1rem 1.25rem 1.25rem 0.5rem !important;
}

.ag-cell.ag-cell-full-width .device-product-shell,
.ag-full-width-container .device-product-shell {
  position: relative;
  display: block;
  width: auto !important;
  max-width: 1120px;
  margin-left: clamp(2rem, 4vw, 3.75rem);
  margin-right: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.07);
}

.ag-cell.ag-cell-full-width .device-product-shell::before,
.ag-full-width-container .device-product-shell::before {
  content: '';
  position: absolute;
  left: -1.25rem;
  top: 1rem;
  bottom: 1rem;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(0, 153, 204, 0.26) 0%, rgba(0, 153, 204, 0.06) 100%);
}

.device-product-shell .device-product-table {
  border-spacing: 0 !important;
  border-collapse: separate !important;
  table-layout: fixed !important;
  width: 100% !important;
  background: transparent;
}

.device-product-shell .device-product-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(246, 249, 252, 0.96);
  color: var(--theme-color-soft-text, var(--theme-color-weak-text));
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0.9rem 1rem 0.85rem;
  text-align: left;
  vertical-align: middle;
}

.device-product-shell .device-product-table tbody td {
  background: rgba(255, 255, 255, 0.95);
  border-top: 0.6rem solid transparent;
  border-bottom: 0;
  padding: 0.9rem 1rem;
  text-align: left;
  font-size: 0.84rem;
  vertical-align: middle;
  overflow: hidden;
}

.device-product-shell .device-product-table tbody tr:first-child td {
  border-top-width: 0.8rem;
}

.device-product-shell .device-product-table tbody tr:hover td {
  background: rgba(243, 248, 251, 0.98);
}
</style>
