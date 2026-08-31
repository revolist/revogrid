import type { DataType } from '@type';

import { GROUP_DEPTH } from './grouping.const';
import { isGrouping } from './grouping.service';

type GroupedIndexNode = {
  children: Map<number, GroupedIndexNode>;
  items: number[];
};

/**
 * Restores group headers around already-sorted data indexes without rebuilding
 * the physical source. Group insertion order follows the first sorted member,
 * matching the order produced by regrouping a sorted source.
 */
export function gatherGroupedRowIndexes(
  source: DataType[],
  sortedDataIndexes: number[],
): number[] | undefined {
  const groupPathByDataIndex = new Map<number, number[]>();
  const currentGroupPath: number[] = [];

  source.forEach((model, physicalIndex) => {
    if (isGrouping(model)) {
      const depth = model[GROUP_DEPTH];
      if (typeof depth !== 'number') {
        return;
      }
      currentGroupPath.length = depth;
      currentGroupPath[depth] = physicalIndex;
      return;
    }
    if (model != null) {
      groupPathByDataIndex.set(physicalIndex, [...currentGroupPath]);
    }
  });

  const root: GroupedIndexNode = {
    children: new Map(),
    items: [],
  };
  for (const physicalIndex of sortedDataIndexes) {
    const groupPath = groupPathByDataIndex.get(physicalIndex);
    if (!groupPath?.length) {
      return undefined;
    }
    let node = root;
    for (const groupIndex of groupPath) {
      let child = node.children.get(groupIndex);
      if (!child) {
        child = { children: new Map(), items: [] };
        node.children.set(groupIndex, child);
      }
      node = child;
    }
    node.items.push(physicalIndex);
  }

  const groupedIndexes: number[] = [];
  const appendNode = (node: GroupedIndexNode) => {
    node.children.forEach((child, groupIndex) => {
      groupedIndexes.push(groupIndex);
      appendNode(child);
    });
    groupedIndexes.push(...node.items);
  };
  appendNode(root);
  return groupedIndexes;
}
