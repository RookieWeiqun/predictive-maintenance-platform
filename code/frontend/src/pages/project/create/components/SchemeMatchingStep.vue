<template>
  <div class="step-content">
    <h2 class="step-title">匹配维护方案</h2>
    <p class="step-description">
      <strong>设备方案</strong>：按产品型号（含产品分类）逐行匹配并选择设备检测模板；
      每行对应一个设备方案映射。
      <strong>外围方案</strong>：按<strong>工厂/车间</strong>分组，每组单独匹配
      <code>inspectiontype=2</code>；同一车间仅关联一个外围模板，多个候选时用下拉选择。
      <strong v-if="equipmentSchemeRows.length > 0">若某型号匹配到多个模板，请在该行“操作”中下拉选择。</strong>
    </p>
    
    <div v-if="devices.length === 0" class="empty-state">
      <p>请先完成"选择设备"步骤</p>
    </div>
    <div v-else-if="loadingMatched" class="empty-state">
      <p>正在匹配方案…</p>
    </div>
    <div v-else>
      <!-- 匹配结果 -->
      <div v-if="equipmentSchemeRows.length > 0 || peripheralWorkshopRows.length > 0" class="matched-schemes">
        <div class="schemes-header">
          <h3>匹配到的方案</h3>
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">设备总数</span>
              <span class="stat-value">{{ totalDeviceQuantity }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">设备型号数</span>
              <span class="stat-value">{{ uniqueModels.length }}</span>
            </div>
          </div>
        </div>
        <p
          v-if="equipmentSchemeRows.length === 0 && peripheralWorkshopRows.length > 0"
          class="scheme-pick-hint scheme-pick-hint--info"
        >
          未匹配到<strong>设备检测</strong>模板（上方无卡片）。请在下表选择<strong>外围检测</strong>方案；系统将用外围方案做本步的方案树预览与后续编辑。
        </p>
        <h4 v-if="equipmentSchemeRows.length > 0" class="subsection-title">设备检测方案（按型号）</h4>
        <div v-if="equipmentSchemeRows.length > 0" class="equipment-table-wrap">
          <table class="equipment-scheme-table">
            <thead>
              <tr>
                <th>产品型号 / 分类</th>
                <th>设备数量</th>
                <th>已选方案</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in equipmentSchemeRows" :key="row.key">
                <td>{{ row.label }}</td>
                <td>{{ row.deviceCount }}</td>
                <td>
                  <span v-if="resolveRowSelected(row)">
                    {{ resolveRowSelected(row)?.name }}
                  </span>
                  <span v-else class="muted">未匹配</span>
                </td>
                <td>
                  <div v-if="row.options.length > 1" class="row-actions">
                    <IxSelect
                      :model-value="row.selectedId"
                      placeholder="选择方案"
                      @update:model-value="(v: string) => $emit('update-equipment-scheme', row.key, v)"
                    >
                      <IxSelectItem
                        v-for="opt in row.options"
                        :key="opt.id"
                        :label="`${opt.name}（${opt.model}）`"
                        :value="opt.id"
                      />
                    </IxSelect>
                    <button
                      type="button"
                      class="link-btn"
                      :disabled="!resolveRowSelected(row)"
                      @click="openSchemeDetail(resolveRowSelected(row) || null)"
                    >
                      查看详情
                    </button>
                  </div>
                  <div v-else-if="row.options.length === 1" class="row-actions">
                    <span class="muted">已自动匹配</span>
                    <button
                      type="button"
                      class="link-btn"
                      @click="openSchemeDetail(resolveRowSelected(row) || null)"
                    >
                      查看详情
                    </button>
                  </div>
                  <span v-else class="muted">无可选方案</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="peripheralWorkshopRows.length > 0" class="peripheral-by-workshop">
          <h4 class="subsection-title">各车间外围检测方案</h4>
          <p class="peripheral-hint">每个车间最多关联一个外围模板；仅有一个候选时已自动选中。</p>
          <div class="peripheral-table-wrap">
            <table class="peripheral-scheme-table">
              <thead>
                <tr>
                  <th>工厂 / 车间</th>
                  <th>候选数</th>
                  <th>已选外围方案</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in peripheralWorkshopRows" :key="row.key">
                  <td>{{ row.label }}</td>
                  <td>{{ row.options.length }}</td>
                  <td>
                    <span v-if="resolvePeripheralSelected(row)">
                      {{ resolvePeripheralSelected(row)?.name }}
                    </span>
                    <span v-else class="muted">未匹配</span>
                  </td>
                  <td>
                    <div v-if="row.options.length > 1" class="row-actions">
                      <IxSelect
                        :model-value="row.selectedId"
                        placeholder="选择外围方案"
                        @update:model-value="(v: string) => $emit('update-peripheral', row.key, v)"
                      >
                        <IxSelectItem
                          v-for="opt in row.options"
                          :key="opt.id"
                          :label="`${opt.name}（${opt.model || '-'}）`"
                          :value="opt.id"
                        />
                      </IxSelect>
                      <button
                        type="button"
                        class="link-btn"
                        :disabled="!resolvePeripheralSelected(row)"
                        @click="openSchemeDetail(resolvePeripheralSelected(row) || null, 'peripheral')"
                      >
                        查看详情
                      </button>
                    </div>
                    <div v-else-if="row.options.length === 1" class="row-actions">
                      <span class="muted">已自动匹配</span>
                      <button
                        type="button"
                        class="link-btn"
                        @click="openSchemeDetail(resolvePeripheralSelected(row) || null, 'peripheral')"
                      >
                        查看详情
                      </button>
                    </div>
                    <span v-else class="muted">无可选方案</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>未匹配到模板：请确认设备已维护产品分类、工厂与车间，且后端存在对应 <code>inspectiontype</code>、<code>productcategory</code> 的模板。</p>
      </div>
      
      <div v-if="equipmentSchemeRows.length > 0" class="modal-hint">
        方案预览已移入弹窗，点击上方卡片可查看完整检测树。
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, watch, ref, withDefaults, onBeforeUnmount } from 'vue';
import { TreeModel, TreeContext } from '@siemens/ix';
import { IxSelect, IxSelectItem } from '@siemens/ix-vue';
import { openProjectSchemeDetailModal } from '@/pages/project/utils/openProjectSchemeDetailModal';
export interface SchemeCardLite {
  id: string;
  name: string;
  model: string;
  /** 设备检测 / 外围检测，用于展示标签 */
  schemeKind: 'equipment' | 'peripheral';
}

interface Device {
  id: string;
  model: string;
  quantity: number;
}

export interface PeripheralWorkshopRow {
  key: string;
  label: string;
  options: { id: string; name: string; model?: string }[];
  selectedId: string;
}

interface Props {
  devices: Device[];
  /** 设备检测候选（卡片，给后续步骤复用） */
  matchedSchemeCards: SchemeCardLite[];
  equipmentSchemeRows?: {
    key: string;
    label: string;
    deviceCount: number;
    selectedId: string;
    options: { id: string; name: string; model: string }[];
  }[];
  /** 各车间外围检测候选与当前选中 id */
  peripheralWorkshopRows?: PeripheralWorkshopRow[];
  loadingMatched?: boolean;
  selectedSchemeId: string;
  schemeTreeModel?: TreeModel<any>;
  schemeTreeContext?: TreeContext;
}

const props = withDefaults(defineProps<Props>(), {
  loadingMatched: false,
  peripheralWorkshopRows: () => [],
  equipmentSchemeRows: () => [],
});

let alive = true;
onBeforeUnmount(() => {
  alive = false;
});

const emit = defineEmits<{
  'select-scheme': [schemeId: string];
  'update-equipment-scheme': [modelKey: string, templateId: string];
  'update-peripheral': [workshopKey: string, templateId: string];
  'update-tree-context': [context: TreeContext];
}>();

const totalDeviceQuantity = computed(() => {
  return props.devices.reduce((sum, device) => sum + device.quantity, 0);
});

const uniqueModels = computed(() => {
  const models = props.devices.map(d => d.model).filter(Boolean);
  return [...new Set(models)];
});

const equipmentSchemeRows = computed(() => props.equipmentSchemeRows ?? []);

function resolveRowSelected(row: {
  selectedId: string;
  options: { id: string; name: string; model: string }[];
}) {
  const selectedId = String(row.selectedId ?? '').trim();
  if (selectedId) {
    const s = row.options.find((x) => x.id === selectedId);
    if (s) return s;
  }
  if (row.options.length === 1) return row.options[0];
  return null;
}

function resolvePeripheralSelected(row: PeripheralWorkshopRow) {
  const selectedId = String(row.selectedId ?? '').trim();
  if (selectedId) {
    const s = row.options.find((x) => x.id === selectedId);
    if (s) return s;
  }
  if (row.options.length === 1) return row.options[0];
  return null;
}

async function openSchemeDetail(
  scheme: { id: string; name: string; model?: string } | null,
  schemeKind: 'equipment' | 'peripheral' = 'equipment',
) {
  if (!scheme) return;
  await openProjectSchemeDetailModal(
    { id: scheme.id, name: scheme.name, model: scheme.model || '-' },
    schemeKind,
    {
      syncSelectionIfNeeded: (schemeId) => emit('select-scheme', schemeId),
      currentSelectedSchemeId: props.selectedSchemeId,
      fallbackTreeModel: props.schemeTreeModel,
      fallbackTreeContext: props.schemeTreeContext || defaultExpandedContext.value,
    },
  );
}

// 默认展开的上下文
const defaultExpandedContext = ref<TreeContext>({});

// 当方案树模型变化时，默认展开所有节点（卸载后禁止 emit，避免 emitsOptions / DOM 阶段报错）
watch(
  () => props.schemeTreeModel,
  (newModel: TreeModel<any> | undefined) => {
    if (!newModel || !alive) return;

    const model = newModel;
    const context: TreeContext = {};
    function traverse(nodeId: string) {
      const node = model[nodeId];
      if (node && node.hasChildren) {
        context[nodeId] = { isExpanded: true, isSelected: false };
        if (node.children) {
          node.children.forEach((childId) => traverse(childId));
        }
      }
    }
    if (model.root && model.root.children) {
      model.root.children.forEach((childId) => traverse(childId));
    }
    defaultExpandedContext.value = context;
    if (alive) {
      emit('update-tree-context', context);
    }
  },
  { immediate: true, flush: 'post' },
);

</script>

<style scoped>
.step-content {
  min-height: 400px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--theme-color-text);
}

.step-description {
  color: var(--theme-color-text-soft);
  margin-bottom: 1.5rem;
}

.scheme-pick-hint {
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  background: var(--theme-color-warning-soft, rgba(255, 152, 0, 0.14));
  color: var(--theme-color-warning, #e65100);
  font-size: 0.875rem;
}

.scheme-pick-hint--info {
  background: var(--theme-color-info-soft, rgba(0, 84, 166, 0.08));
  color: var(--theme-color-text);
}

.scheme-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.scheme-card-head .scheme-title {
  margin: 0;
  flex: 1;
  min-width: 0;
}

.scheme-type-badge {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  line-height: 1.2;
  background: var(--theme-color-soft);
  color: var(--theme-color-text-soft);
}

.scheme-type-badge[data-kind='equipment'] {
  background: var(--theme-color-primary-soft, rgba(0, 84, 166, 0.12));
  color: var(--theme-color-primary);
}

.scheme-type-badge[data-kind='peripheral'] {
  background: var(--theme-color-success-soft, rgba(0, 176, 79, 0.12));
  color: var(--theme-color-success);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--theme-color-text-soft);
}

.subsection-title {
  margin: 1.25rem 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.peripheral-by-workshop {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--theme-color-soft-border);
}

.peripheral-hint {
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
  margin: 0 0 1rem 0;
}

.peripheral-row {
  margin-bottom: 1rem;
  max-width: 520px;
}

.peripheral-empty {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.peripheral-table-wrap {
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.peripheral-scheme-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.peripheral-scheme-table th,
.peripheral-scheme-table td {
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding: 0.625rem 0.75rem;
  vertical-align: middle;
  font-size: 0.875rem;
}

.peripheral-scheme-table th {
  text-align: left;
  background: var(--theme-color-soft);
  font-weight: 600;
}

.peripheral-scheme-table tbody tr:last-child td {
  border-bottom: none;
}

.matched-schemes {
  margin-bottom: 2rem;
}

.schemes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.schemes-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.summary-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--theme-color-text-soft);
  line-height: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--theme-color-primary, #0054a6);
  line-height: 1.2;
}

.scheme-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

.scheme-cards-grid--single {
  grid-template-columns: minmax(280px, 420px);
}

.scheme-card {
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  width: 100%;
  box-sizing: border-box;
}

.scheme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.scheme-card-content {
  padding: 1rem;
}

.scheme-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-color-text);
}

.scheme-info {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-label {
  color: var(--theme-color-text-soft);
}

.info-value {
  color: var(--theme-color-text);
  font-weight: 500;
}

.scheme-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: var(--theme-color-text-soft);
}

.modal-hint {
  margin-top: 1rem;
  font-size: 0.8125rem;
  color: var(--theme-color-text-soft);
}

.equipment-table-wrap {
  margin-top: 0.5rem;
  border: 1px solid var(--theme-color-soft-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.equipment-scheme-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.equipment-scheme-table th,
.equipment-scheme-table td {
  border-bottom: 1px solid var(--theme-color-soft-border);
  padding: 0.625rem 0.75rem;
  vertical-align: middle;
  font-size: 0.875rem;
}

.equipment-scheme-table th {
  text-align: left;
  background: var(--theme-color-soft);
  font-weight: 600;
}

.equipment-scheme-table tbody tr:last-child td {
  border-bottom: none;
}

.row-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--theme-color-primary);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0;
}

.link-btn:disabled {
  color: var(--theme-color-weak-text);
  cursor: not-allowed;
}

.muted {
  color: var(--theme-color-text-soft);
}
</style>
