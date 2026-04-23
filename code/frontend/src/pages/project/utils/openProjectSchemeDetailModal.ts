import { h } from 'vue';
import type { TreeContext, TreeModel } from '@siemens/ix';
import { showModal } from '@siemens/ix-vue';
import SchemeDetailModal, { SCHEME_DETAIL_MODAL_SIZE } from '@/pages/project/create/components/SchemeDetailModal.vue';
import { inspectionTemplatesApi } from '@/api';
import type { InspectionTemplateDto } from '@/api/modules/inspectionTemplates';
import { loadTemplateItemsByTemplateId } from '@/pages/scheme/utils/loadTemplateItems';
import type { SchemeItem } from '@/pages/scheme/utils/schemeUtils';
import { buildExpandedTreeContext, convertSchemeItemsToTreeModel } from '@/pages/project/utils/schemeTreeModel';

export type SchemeDetailCard = { id: string; name: string; model: string };

export type OpenSchemeDetailOptions = {
  /**
   * 向导「匹配方案」步骤：打开弹窗前若与当前选中方案 id 不一致，先通知父级选中，
   * 以便侧栏方案树与弹窗一致（详情页勿传）。
   */
  syncSelectionIfNeeded?: (schemeId: string) => void;
  currentSelectedSchemeId?: string;
  /** 接口未返回检测项或失败时，沿用父组件已有方案树（匹配步骤） */
  fallbackTreeModel?: TreeModel<any>;
  fallbackTreeContext?: TreeContext;
};

/**
 * 按模板 id 拉取检测项并弹出方案详情（详情页「查看详情」与向导卡片共用）。
 */
export async function openProjectSchemeDetailModal(
  scheme: SchemeDetailCard | null,
  schemeKind: 'equipment' | 'peripheral',
  options?: OpenSchemeDetailOptions,
): Promise<void> {
  if (!scheme) return;
  const sid = String(scheme.id ?? '').trim();
  if (options?.syncSelectionIfNeeded && String(options.currentSelectedSchemeId ?? '').trim() !== sid) {
    options.syncSelectionIfNeeded(sid);
  }

  let localTree: TreeModel<any> | undefined = options?.fallbackTreeModel;
  let localContext: TreeContext =
    options?.fallbackTreeContext ?? buildExpandedTreeContext(localTree);
  let localItems: SchemeItem[] = [];
  let templateDto: InspectionTemplateDto | undefined;

  const templateId = Number.parseInt(sid, 10);
  if (!Number.isNaN(templateId) && templateId > 0) {
    try {
      const [items, dto] = await Promise.all([
        loadTemplateItemsByTemplateId(templateId),
        inspectionTemplatesApi.getInspectionTemplate(templateId),
      ]);
      templateDto = dto;
      if (items.length > 0) {
        localItems = items;
        localTree = convertSchemeItemsToTreeModel(items);
        localContext = buildExpandedTreeContext(localTree);
      }
    } catch {
      /* 弹窗仍打开，沿用 fallbackTreeModel（若有） */
    }
  }

  showModal({
    size: SCHEME_DETAIL_MODAL_SIZE,
    centered: true,
    content: h(SchemeDetailModal, {
      data: {
        title: `方案详情：${scheme.name}`,
        scheme: {
          id: scheme.id,
          name: scheme.name,
          model: scheme.model || '-',
          schemeKind,
        },
        templateDto,
        schemeItems: localItems,
        schemeTreeModel: localTree,
        schemeTreeContext: localContext,
      },
    }),
  });
}
