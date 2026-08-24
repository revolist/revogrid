import type { Observable, PluginSubscribe } from '../../utils';
import type { DSourceState, GDataType } from './data.store';

/**
 * Keeps the visible item collection empty while an asynchronous data operation
 * is pending. Proxy, trim, and source updates may still calculate new items,
 * but they must not expose those items until the owning operation releases the
 * pending state.
 */
export const pendingItemsPlugin = <T extends GDataType>(
  store: Observable<DSourceState<T, any>>,
  isPending: () => boolean,
): PluginSubscribe<DSourceState<T, any>> => ({
  set(key, value) {
    if (
      key === 'items' &&
      isPending() &&
      Array.isArray(value) &&
      value.length
    ) {
      // Writing an empty collection does not re-enter this branch, so the
      // guard safely replaces every attempted non-empty visibility update.
      store.set('items', []);
    }
  },
});
