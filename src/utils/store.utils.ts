/** Set stores data */

import {ObservableMap} from '@stencil/store';

function setStore<T extends {[key: string]: any}>(store: ObservableMap<T>, data: Partial<T>) {
  for (let key in data) {
    store.set(key, data[key]);
  }
}

export {setStore};
