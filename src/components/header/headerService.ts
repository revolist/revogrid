import interact from 'interactjs';
import {DATA_COL} from '../../utils/consts';
import {Module} from '../../services/module.interfaces';
import dimensionProvider from '../../services/dimension.provider';
import {getCell} from '../../services/cell.helpers';
import {Selection} from '../../interfaces';
import Cell = Selection.Cell;

interface Config {
    resize?: boolean;
    headerClick?(col: number): void;
}

export default class HeaderService implements Module {
    constructor(private target: string, config: Config) {
        if (config.resize) {
            interact(target).resizable({
                edges: { bottom: false, right: true },
                onend: event => {
                    const index: number = parseInt(event.target.getAttribute(DATA_COL), 10);
                    dimensionProvider.setSize({ [index]: event.rect.width }, 'col');
                }
            });
        }
        interact(target).on('tap', event => {
            const cell: Cell = getCell(event.currentTarget);
            config?.headerClick(cell.x);
        });
    }

    destroy(): void {
        interact(this.target).unset();
    }
}
