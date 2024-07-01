
import { ObservableMap, Subscription } from './store.types';

export type Observable<T> = ObservableMap<T>;
export type PluginSubscribe<T> = Subscription<T>;

/** Set stores data */
export function setStore<T extends { [key: string]: any }>(
  store: Observable<T>,
  data: Partial<T>,
) {
  for (let key in data) {
    store.set(key, data[key]);
  }
}

