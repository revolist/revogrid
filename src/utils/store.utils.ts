import type { Observable } from '@type';

/** Set stores data */
function setStore<T extends { [key: string]: any }>(
  store: Observable<T>,
  data: Partial<T>,
) {
  for (let key in data) {
    store.set(key, data[key]);
  }
}

export { setStore };
