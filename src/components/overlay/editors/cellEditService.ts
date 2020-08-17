import {Module} from '../../../services/module.interfaces';
import interact from 'interactjs';
import dataProvider from '../../../services/data.provider';
import {Selection} from '../../../interfaces';
import Cell = Selection.Cell;
import selectionStoreConnector from '../../../store/selection/selection.store.connector';

export default class CellEditService implements Module {
    constructor(private target: string) {
        interact(this.target).on('doubletap', (): void => {
            const focus: Cell|null = selectionStoreConnector.focused;
            if (focus && !dataProvider.isReadOnly(focus.y, focus.x)) {
                selectionStoreConnector.edit = { x: focus.x, y: focus.y };
            }
        });
    }

    close(): void {
        selectionStoreConnector.edit = undefined;
    }

    destroy(): void {
        interact(this.target).unset();
    }
}