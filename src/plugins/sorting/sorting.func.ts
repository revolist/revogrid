import type { DataType } from '@type';
import type { SortingOrderFunction } from './sorting.types';
import { isGrouping } from '../groupingRow/grouping.service';

export function sortIndexByItems(
  indexes: number[],
  source: DataType[],
  sortingFunc: SortingOrderFunction = {},
): number[] {
  // if no sorting - return unsorted indexes
  if (Object.entries(sortingFunc).length === 0) {
    // Unsorted indexes
    return [...Array(indexes.length).keys()];
  }
  //
  /**
   * go through all indexes and align in new order
   * performs a multi-level sorting by applying multiple comparison functions to determine the order of the items based on different properties.
   */
  return indexes.sort((a, b) => {
    const itemA = source[a];
    const itemB = source[b];
    for (const [prop, cmp] of Object.entries(sortingFunc)) {
      if (isGrouping(itemA)) {
        if (itemA['__rvgr-prop'] !== prop) {
          return 0;
        }
      }
      if (isGrouping(itemB)) {
        if (itemB['__rvgr-prop'] !== prop) {
          return 0;
        }
      }
      /**
       * If the comparison function returns a non-zero value (sorted), it means that the items should be sorted based on the given property. In such a case, the function immediately returns the sorted value, indicating the order in which the items should be arranged.
       * If none of the comparison functions result in a non-zero value, indicating that the items are equal or should remain in the same order, the function eventually returns 0.
       */
      const sorted = cmp?.(prop, itemA, itemB);
      if (sorted) {
        return sorted;
      }
    }
    return 0;
  });
}
