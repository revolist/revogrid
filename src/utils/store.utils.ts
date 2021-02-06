/** Set stores data */

import { Observable } from "../interfaces";
function setStore<T extends {[key: string]: any}>(store: Observable<T>, data: Partial<T>) {
  for (let key in data) {
    store.set(key, data[key]);
  }
}

export {setStore};
