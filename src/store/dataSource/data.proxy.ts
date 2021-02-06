import { Observable, PluginSubscribe } from "../../interfaces";
import { DataSourceState } from "../../store/dataSource/data.store";

type State = DataSourceState<any, any>;

export const proxyPlugin = (store: Observable<State>): PluginSubscribe<State> => ({
	set(k, newVal) {
    if (!isProxy(k)) {
      return;
    }
    const items = store.get('items').reduce((r: Record<number, boolean>, v) => {
      r[v] = true;
      return r;
    }, {});
    const newItems = newVal.reduce((r: number[], i: number) => {
      if (items[i]) {
        r.push(i);
      }
      return r;
    }, []);
    store.set('items', newItems);
	}
});

function isProxy(k: keyof State): k is 'proxyItems' {
  return k === 'proxyItems';
}
