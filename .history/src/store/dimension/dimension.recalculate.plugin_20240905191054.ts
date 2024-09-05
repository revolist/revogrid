import { DimensionSettingsState } from '@type';
import { Observable, PluginSubscribe } from '../../utils';

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
          for (let i = 0; i < count; i++) {
            realSize +=
              storeService.store.get('sizes')[i] ||
              storeService.store.get('originItemSize');
          }
          storeService.setStore({ realSize });
          break;
        }
      }
    },
  };
};
