import { DSourceState } from '@store';
import type { Observable, PluginSubscribe } from '../../utils';

type State = DSourceState<any, any>;

/**
 * Todo:
 * Refactor proxy plugin: when items changed outside proxy get recalculated
 */

/**
 * Proxy plugin for data source.
 * 
 * This plugin is used keep sortint in the data source, even when trimming is applied sorting has to be preserved.
 */
export const proxyPlugin = (store: Observable<State>): PluginSubscribe<State> => ({
  /**
   * Set the value of a property in the store.
   * If the key is 'proxyItems' it will filter the items in the data source according to the new value.
   * The new value should be an array of numbers representing the indexes of the items that should be visible.
   * The method will return a new array of numbers with the indexes of the items that should be visible.
   * The method will also update the 'items' property of the store with the new array.
   */
  set(k, newVal) {
    if (k !== 'proxyItems') {
      return;
    }
    /**
     * Getting existing collection of items (trimmed and filtered)
     * Mark indexes as visible
     */
    const oldItems = store.get('items').reduce((r, v: number) => {
      r.add(v);
      return r;
    }, new Set<number>());
    /**
     * Check if new values where present in items, keep filtering and trimming
     */
    const newItems = newVal.reduce((r: number[], i: number) => {
      if (oldItems.has(i)) {
        r.push(i);
      }
      return r;
    }, []);
    store.set('items', newItems);
  },
});
