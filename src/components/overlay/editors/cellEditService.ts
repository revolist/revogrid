import {Module} from '../../../services/module.interfaces';
import selectionStoreConnector from '../../../store/selection/selection.store.connector';

export default class CellEditService implements Module {
    edit(val: string|boolean): void {
        selectionStoreConnector.setEdit(val);
    }

    close(): void {
        selectionStoreConnector.setEdit(false);
    }

    destroy(): void {
    }
}