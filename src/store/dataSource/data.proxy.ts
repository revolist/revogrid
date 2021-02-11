import { Observable, PluginSubscribe } from '../../interfaces';
import { DataSourceState } from '../../store/dataSource/data.store';

type State = DataSourceState<any, any>;

/**
 * All items
 * Used as proxy for sorting
 * Keep order but do not modify final source
 */
export const proxyPlugin = (store: Observable<State>): PluginSubscribe<State> => ({
  set(k, newVal) {
    if (!isProxy(k)) {
      return;
    }
    /**
     * Getting existing collection of items
     * Mark indexes as visible
     */
    const oldItems = store.get('items').reduce((r: Record<number, boolean>, v) => {
      r[v] = true;
      return r;
    }, {});
    /**
     * Check if new values where present in items
     * Filter item collection according presense
     */
    const newItems = newVal.reduce((r: number[], i: number) => {
      if (oldItems[i]) {
        r.push(i);
      }
      return r;
    }, []);
    store.set('items', newItems);
  },
});

function isProxy(k: keyof State): k is 'proxyItems' {
  return k === 'proxyItems';
}
