import { BasePlugin } from './base.plugin';
import type { PluginProviders } from '@type';
import { reduce } from 'lodash';

export type AutoSizeRowConfig = {
	/**
	 * Размер шрифта в пикселях
	 * по умолчанию 12px
	 */
	fontSize?: number;

	columnSize?: number;

	/**
	 * Межстрочный интервал
	 * по умолчанию 1.2
	 */
	lineHeight?: number;

	/**
	 * Отступы в ячейке (padding)
	 * по умолчанию 8px
	 */
	cellPadding?: number;

	/**
	 * Минимальная высота строки
	 * по умолчанию 30px
	 */
	minRowHeight?: number;

	/**
	 * Максимальная высота строки
	 * по умолчанию не ограничена
	 */
	maxRowHeight?: number;
};

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_LINE_HEIGHT = 1.2;
const DEFAULT_CELL_PADDING = 5;
const DEFAULT_MIN_HEIGHT = 30;
const DEFAULT_COLUMN_SIZE = 200;

export class AutoSizeRowPlugin extends BasePlugin {
	private readonly fontSize: number;
	private readonly lineHeight: number;
	private readonly cellPadding: number;
	private readonly minRowHeight: number;
	private readonly columnSize: number;
	private readonly maxRowHeight: number | undefined;
	private isColumnsInitialized = false;

	constructor(
		revogrid: HTMLRevoGridElement,
		public providers: PluginProviders,
		public config?: AutoSizeRowConfig,
	) {
		super(revogrid, providers);

		this.fontSize = config?.fontSize || DEFAULT_FONT_SIZE;
		this.lineHeight = config?.lineHeight || DEFAULT_LINE_HEIGHT;
		this.cellPadding = config?.cellPadding || DEFAULT_CELL_PADDING;
		this.minRowHeight = config?.minRowHeight || DEFAULT_MIN_HEIGHT;
		this.columnSize = config?.columnSize || DEFAULT_COLUMN_SIZE;
		this.maxRowHeight = config?.maxRowHeight;

		// Подписываемся на изменение данных
		this.addEventListener('aftersourceset', ({ detail: { source } }) => {
			// Проверяем инициализацию колонок
			if (!this.isColumnsInitialized) {
				this.checkColumnsInitialization();
			}
			this.calculateRowHeights(source);
		});

		// Подписываемся на изменение размеров колонок
		this.addEventListener('aftercolumnsset', () => {
			this.isColumnsInitialized = true;
			const source = this.providers.data.stores.rgRow.store.get('source');
			if (source) {
				this.calculateRowHeights(source);
			}
		});

		this.addEventListener('afteredit', ({ detail }) => {
			if ('rowIndex' in detail) {
				this.calculateRowHeight(detail.rowIndex);
			}
		});
	}

	private checkColumnsInitialization() {
		const columns = this.providers.column.getColumns();
		if (columns.length > 0) {
			const firstColumn = columns[0];
			const columnWidth = this.providers.dimension.stores[firstColumn.pin || 'rgCol'].store.get('sizes')[firstColumn.prop] || this.columnSize;
			if (columnWidth > 0) {
				this.isColumnsInitialized = true;
			}
		}
	}

	private calculateRowHeights(data: any[]) {

		// Если колонки еще не инициализированы, пропускаем расчет
		if (!this.isColumnsInitialized) {
			return;
		}

		const sizes: { [index: number]: number } = {};

		data.forEach((row, index) => {
			sizes[index] = this.getRowHeight(row);
		});

		this.providers.dimension.setCustomSizes('rgRow', sizes);
	}

	private calculateRowHeight(rowIndex: number) {
		// Если колонки еще не инициализированы, возвращаем минимальную высоту
		if (!this.isColumnsInitialized) {
			return this.minRowHeight;
		}

		const data = this.providers.data.stores.rgRow.store.get('source');
		const row = data[rowIndex];
		if (!row) return this.minRowHeight;

		const height = this.getRowHeight(row);
		this.providers.dimension.setCustomSizes('rgRow', { [rowIndex]: height });
		return height;
	}

	private getRowHeight(row: any): number {
		const columns = this.providers.column.getColumns();

		// Находим максимальную высоту среди всех ячеек
		const maxHeight = reduce(
			columns,
			(max, column) => {
				const value = row[column.prop];
				if (!value) return max;

				// Получаем ширину колонки
				const columnWidth = this.providers.dimension.stores[column.pin || 'rgCol'].store.get('sizes')[column.prop] || this.columnSize;

				if (!columnWidth) return max;

				// Вычисляем доступную ширину для текста (учитываем padding)
				const availableWidth = columnWidth - (this.cellPadding * 2);

				// Вычисляем количество строк
				const lines = this.calculateLines(value.toString(), availableWidth);

				// Вычисляем высоту для этого количества строк
				const height = (lines * this.fontSize * this.lineHeight) + (this.cellPadding * 2);

				return Math.max(max, height);
			},
			0
		);

		// Применяем ограничения
		let finalHeight = Math.max(maxHeight, this.minRowHeight);
		if (this.maxRowHeight) {
			finalHeight = Math.min(finalHeight, this.maxRowHeight);
		}

		return finalHeight;
	}

	private calculateLines(text: string, availableWidth: number): number {
		// Примерная ширина одного символа в пикселях
		const avgCharWidth = this.fontSize * 0.6;

		// Максимальное количество символов в строке
		const maxCharsPerLine = Math.floor(availableWidth / avgCharWidth);

		// Разбиваем текст на слова
		const words = text.split(/\s+/);

		let currentLineLength = 0;
		let lines = 1;

		for (const word of words) {
			const wordLength = word.length;

			// Если слово длиннее доступной ширины, разбиваем его
			if (wordLength > maxCharsPerLine) {
				lines += Math.ceil(wordLength / maxCharsPerLine);
				currentLineLength = wordLength % maxCharsPerLine;
			} else {
				// Если слово помещается в текущую строку
				if (currentLineLength + wordLength + 1 <= maxCharsPerLine) {
					currentLineLength += wordLength + 1;
				} else {
					// Если слово не помещается, начинаем новую строку
					lines++;
					currentLineLength = wordLength + 1;
				}
			}
		}

		return lines;
	}
}
