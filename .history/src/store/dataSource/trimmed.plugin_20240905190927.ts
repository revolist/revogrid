import { Observable, PluginSubscribe } from '../../utils/store.utils';
import { DSourceState, GDataType } from './data.store';

export type TrimmedEntity = Record<number, boolean>;
export type Trimmed = Record<string, TrimmedEntity>;

/**
 * Hide items from main collection
 * But keep them in store
 */
export const trimmedPlugin = <T extends GDataType>(
  store: Observable<DSourceState<T, any>>,
): PluginSubscribe<DSourceState<T, any>> => ({
  set(k, newVal) {
    switch (k) {
      case 'trimmed': {
        const proxy = store.get('proxyItems');
        const trimmed = gatherTrimmedItems(newVal as Trimmed);
        const newItems = proxy.filter(v => !trimmed[v]);

        store.set('items', newItems);
        break;
      }
    }
  },
});

export function gatherTrimmedItems(trimmedItems: Trimmed) {
  const trimmed: TrimmedEntity = {};

  for (let trimmedKey in trimmedItems) {
    // trimmed overweight not trimmed
    for (let t in trimmedItems[trimmedKey]) {
      trimmed[t] = trimmed[t] || trimmedItems[trimmedKey][t];
    }
  }
  return trimmed;
}
