import interact from 'interactjs';
import {DATA_COL, MIN_COL_SIZE} from '../../utils/consts';
import {Module} from '../../services/module.interfaces';
import dimensionProvider from '../../services/dimension.provider';
import {getCell} from '../../services/cell.helpers';
import {ColumnDataSchemaRegular, Selection} from '../../interfaces';
import Cell = Selection.Cell;
import columnProvider from "../../services/column.data.provider";

interface Config {
    resize?: boolean;
    headerClick?(col: ColumnDataSchemaRegular): void;
}

export default class HeaderService implements Module {
    constructor(private target: string, config: Config) {
        if (config.resize) {
            interact(target).resizable({
                edges: { bottom: false, right: true },
                onend: event => {
                    const index: number = parseInt(event.target.getAttribute(DATA_COL), 10);
                    const col: ColumnDataSchemaRegular = columnProvider.getColumn(index);
                    let width: number = event.rect.width;
                    const minSize: number = col.minSize || MIN_COL_SIZE;
                    if (width < minSize) {
                        width = minSize;
                    }
                    dimensionProvider.setSize('col', { [index]: width });
                }
            });
        }
        interact(target).on('tap', event => {
            const cell: Cell = getCell(event.currentTarget);
            const col: ColumnDataSchemaRegular = columnProvider.getColumn(cell.x);
            col && config?.headerClick(col);
        });
    }

    destroy(): void {
        interact(this.target).unset();
    }
}
