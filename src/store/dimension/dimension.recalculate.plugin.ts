import { DimensionSettingsState } from '@type';
import type { Observable, PluginSubscribe } from '../../utils';

function calculateRealSize({
  count,
  originItemSize,
  sizes,
}: Pick<DimensionSettingsState, 'count' | 'originItemSize' | 'sizes'>) {
  const safeCount = Math.max(0, count);
  let realSize = safeCount * originItemSize;
  for (let index in sizes) {
    const itemIndex = Number(index);
    if (
      !Number.isInteger(itemIndex) ||
      itemIndex < 0 ||
      itemIndex >= safeCount ||
      String(itemIndex) !== index
    ) {
      continue;
    }
    realSize += sizes[index] - originItemSize;
  }
  return realSize;
}

/**
 * Plugin which recalculates realSize on changes of sizes, originItemSize and count
 */
export const recalculateRealSizePlugin = (storeService: {
  store: Observable<DimensionSettingsState>;
  setStore: (k: Partial<DimensionSettingsState>) => void;
}): PluginSubscribe<DimensionSettingsState> => {
  /**
   * Recalculates realSize if size, origin size or count changes
   */
  return {
    /**
     * Reacts on changes of count, sizes and originItemSize
     */
    set(k) {
      switch (k) {
        case 'count':
        case 'sizes':
        case 'originItemSize': {
          // recalculate realSize
          storeService.setStore({
            realSize: calculateRealSize({
              count: storeService.store.get('count'),
              sizes: storeService.store.get('sizes'),
              originItemSize: storeService.store.get('originItemSize'),
            }),
          });
          break;
        }
      }
    },
  };
};
