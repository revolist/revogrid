import { ObservableMap, Subscription } from "@stencil/store";
import { DataSourceState } from "../../store/dataSource/data.store";
type TrimmedEntity = Record<number, boolean>;
export type Trimmed = Record<string, TrimmedEntity>;


export const trimmedPlugin = (store: ObservableMap<DataSourceState<any, any>>): Subscription<DataSourceState<any, any>> => ({
	set(k, newVal, oldVal) {
		switch(k) {
			case 'trimmed':
				const items = store.get('items');
				const trimmedItems = newVal as Trimmed;
				const oldTrimmedItems = oldVal as Trimmed;
				let oldTrimmed: TrimmedEntity = {};
				let trimmed: TrimmedEntity = {};

				for (let trimmedKey in trimmedItems) {
					// trimmed overveight not trimmed
					for (let t in oldTrimmedItems[trimmedKey]) {
						oldTrimmed[t] = oldTrimmed[t] || oldTrimmedItems[trimmedKey][t];
					}

					// trimmed overveight not trimmed
					for (let t in trimmedItems[trimmedKey]) {
						trimmed[t] = trimmed[t] || trimmedItems[trimmedKey][t];
					}
				}

				// if nothings changed
				for (let o in oldTrimmed) {
					if (trimmed[o]) {
						delete oldTrimmed[o];
					}
				}
				const newItems = items.reduce((result: number[], v: number) => {
					// check if present in new trimmed remove from items (filter)
					if (!trimmed[v]) {
						result.push(v);
					}
					// clear old items which is visible anyway
					if (oldTrimmed[v]) {
						delete oldTrimmed[v];
					}
					return result;
				}, []);

				// check if not longer trimmed put back to items
				for (let o in oldTrimmed) {
					if (oldTrimmed[o]) {
						newItems.push(parseInt(o, 10));
					}
				}

				store.set('items', newItems);
				break;
		}
	}
});