import type { TreeContext, TreeModel } from '@siemens/ix';
import type { SchemeItem } from '@/pages/scheme/utils/schemeUtils';

/** 将方案检测项树转为 IxTree 的 TreeModel（向导与详情页共用） */
export function convertSchemeItemsToTreeModel(items: SchemeItem[]): TreeModel<any> {
  const model: TreeModel<any> = {
    root: {
      id: 'root',
      data: { name: '' },
      hasChildren: items.length > 0,
      children: items.map((item) => item.id),
    },
  };
  const walk = (nodes: SchemeItem[]) => {
    nodes.forEach((item) => {
      const children = Array.isArray(item.children) ? item.children : [];
      model[item.id] = {
        id: item.id,
        data: { name: item.name, required: item.required !== false },
        hasChildren: children.length > 0,
        children: children.map((c) => c.id),
      };
      if (children.length > 0) walk(children);
    });
  };
  walk(items);
  return model;
}

/** 展开树中所有带子节点（方案预览/详情弹窗） */
export function buildExpandedTreeContext(tree?: TreeModel<any>): TreeContext {
  if (!tree) return {};
  const ctx: TreeContext = {};
  const walk = (nodeId: string) => {
    const node = tree[nodeId];
    if (!node || !node.hasChildren) return;
    ctx[nodeId] = { isExpanded: true, isSelected: false };
    (node.children ?? []).forEach((childId) => walk(childId));
  };
  walk('root');
  return ctx;
}

/** 收集方案树中「必选」节点 id（用于确认步骤默认勾选） */
export function getAllRequiredItemIdsFromSchemeTree(model: TreeModel<any>): string[] {
  const ids: string[] = [];
  const traverse = (nodeId: string) => {
    const node = model[nodeId];
    if (node && node.data.required !== false) {
      ids.push(nodeId);
    }
    if (node?.children) {
      node.children.forEach((childId) => traverse(childId));
    }
  };
  if (model.root?.children) {
    model.root.children.forEach((childId) => traverse(childId));
  }
  return ids;
}
