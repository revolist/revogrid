import { Observable, PluginSubscribe } from "../../interfaces";
import { DataSourceState } from "../../store/dataSource/data.store";

type TrimmedEntity = Record<number, boolean>;
export type Trimmed = Record<string, TrimmedEntity>;


export const trimmedPlugin = <T>(store: Observable<DataSourceState<T, any>>): PluginSubscribe<DataSourceState<T, any>> => ({
	set(k, newVal) {
		switch(k) {
			case 'trimmed':
				const proxy = store.get('proxyItems');
				const trimmedItems = newVal as Trimmed;
				let trimmed: TrimmedEntity = {};

				for (let trimmedKey in trimmedItems) {
					// trimmed overveight not trimmed
					for (let t in trimmedItems[trimmedKey]) {
						trimmed[t] = trimmed[t] || trimmedItems[trimmedKey][t];
					}
				}

				const newItems = proxy.reduce((result: number[], v: number) => {
					// check if present in new trimmed remove from items (filter)
					if (!trimmed[v]) {
						result.push(v);
					}
					return result;
				}, []);


				store.set('items', newItems);
				break;
		}
	}
});