
import { ObservableMap, Subscription } from './store.types';

export type Observable<T> = ObservableMap<T>;
export type PluginSubscribe<T> = Subscription<T>;

/**
 * Sets the given data on the specified store.
 *
 * @param store - The store to set data on.
 * @param data - The data to set on the store.
 */
export function setStore<T extends Record<string, any>>(
  store: ObservableMap<T>,
  data: Partial<T>,
): void {
  for (const key of Object.keys(data) as Array<keyof T & string>) {
    store.set(key, data[key]!);
  }
}
