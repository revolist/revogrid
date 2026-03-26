import { DimensionSettingsState } from '@type';
import type { Observable, PluginSubscribe } from '../../utils';

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
          let realSize = 0;
          const count = storeService.store.get('count');
          const sizes = storeService.store.get('sizes');
          const originItemSize = storeService.store.get('originItemSize');
          for (let i = 0; i < count; i++) {
            realSize += sizes[i] ?? originItemSize;
          }
          storeService.setStore({ realSize });
          break;
        }
      }
    },
  };
};
