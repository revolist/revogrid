import { Observable, PluginSubscribe } from '../../utils';
import { DSourceState, GDataType } from './data.store';

export type TrimmedEntity = { [physicalIndexInSource: number]: boolean };
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
        // set trimmed items in store
        store.set(
          'items',
          getVisibleItems(store.get('proxyItems'), newVal as Trimmed),
        );
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

/**
 * Preserve proxy order while removing physical indexes hidden by any trim
 * layer.
 */
export function getVisibleItems(proxyItems: number[], trimmedItems: Trimmed) {
  const trimmed = gatherTrimmedItems(trimmedItems);
  return proxyItems.filter(index => !trimmed[index]);
}
