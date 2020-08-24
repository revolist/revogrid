import selectionStoreConnector from '../../../store/selection/selection.store.connector';

export default class CellEditService {
    edit(val: string|boolean): void {
        selectionStoreConnector.setEdit(val);
    }

    close(): void {
        selectionStoreConnector.setEdit(false);
    }

    destroy(): void {
    }
}