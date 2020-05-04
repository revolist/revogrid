/**
* Global stores data
*/

import {ObservableMap} from '@stencil/store';
import each from 'lodash/each';

function setStore<T extends {[key: string]: any}>(store: ObservableMap<T>, data: Partial<T>) {
  each(data, (val, key: string) => {
    store.set(key, val);
  });
}

export {setStore};
