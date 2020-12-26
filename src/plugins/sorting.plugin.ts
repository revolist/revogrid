import orderBy from 'lodash/orderBy';
import keys from 'lodash/keys';
import toArray from 'lodash/toArray';
import size from 'lodash/size';

import { RevoGrid } from '../interfaces';
import BasePlugin from './basePlugin';

import DimensionRows = RevoGrid.DimensionRows;

export type SortingOrder = Record<RevoGrid.ColumnProp, 'asc'|'desc'>;
type SourceSetEvent = {
	type: DimensionRows;
	source: RevoGrid.DataType[];
};
type ColumnSetEvent = {
	order: SortingOrder;
};

export default class SortingPlugin extends BasePlugin {
	private sorting: SortingOrder|null = null;

	get hasSorting() {
		return !!this.sorting;
	}

	constructor(protected revogrid: HTMLRevoGridElement) {
			super(revogrid);

			const beforeSourceSet = ({detail}: CustomEvent<SourceSetEvent>) => {
				if (this.hasSorting) {
					// is sorting allowed
					const event = this.emit('beforeSourceSortingApply');
					// sorting prevented
					if (event.defaultPrevented) {
						return;
					}
				}
				const data = this.setData(detail.source, detail.type);
				if (data) {
					detail.source = data;
				}
			};
			const afterColumnsSet = async({detail: {order}}: CustomEvent<ColumnSetEvent>) => {
        let items = await this.revogrid.getSource();
				this.sort(order, items);
			};
			const headerClick = async(e: CustomEvent<RevoGrid.InitialHeaderClick>) => {
				if (e.defaultPrevented) {
					return;
				}

				if (!e.detail.column.sortable) {
					return;
				}

				this.headerClick(e.detail.column, e.detail.index);
			};
			
			this.addEventListener('beforeSourceSet', beforeSourceSet);
			this.addEventListener('afterColumnsSet', afterColumnsSet);
			this.addEventListener('initialHeaderClick', headerClick);
	}

	private async headerClick(column: RevoGrid.ColumnRegular, index: number) {
		const order = column.order && column.order === 'asc' ? 'desc' : 'asc';
		const beforeSortingEvent = this.emit('beforeSorting', {column: column, order});
		if (beforeSortingEvent.defaultPrevented) {
			return;
		}
		const newCol = this.revogrid.updateColumnSorting(column, index, order);

		// apply sort data
		const canSortApply = this.emit('beforeSortingApply', { column: newCol, order });
		if (canSortApply.defaultPrevented) {
			return;
		}

		let items = await this.revogrid.getSource();
		this.sort({[column.prop]: order}, items);
	}
	
	private setData(data: RevoGrid.DataType[], type: DimensionRows, doSorting = true): RevoGrid.DataType[]|void {
    // sorting available for row type only
    if (type === 'row' && doSorting && this.sorting) {
      return this.sortItems(data, this.sorting);
    }
	}

	/**
	 * Sorting apply, available for row type only
	 * @param sorting - per column sorting
	 * @param data - this.stores['row'].store.get('source')
	 */
	private sort(sorting: SortingOrder, data: RevoGrid.DataType[]) {
		if (!size(sorting)) {
			this.sorting = null;
			return;
		}
		this.sorting = sorting;

		const source = this.sortItems(data, sorting);
		this.revogrid.source = source;
	}

	private sortItems(data: RevoGrid.DataType[], sorting: SortingOrder): RevoGrid.DataType[] {
		return orderBy(data, keys(sorting), toArray(sorting));
	}
}