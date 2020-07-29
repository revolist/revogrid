import {Module} from '../../../services/module.interfaces';
import interact from 'interactjs';
import selectionStore, {setEdit} from '../../../store/selection.strore';
import dataProvider from "../../../services/data.provider";
import {codesLetter} from '../../../utils/keyCodes';
import {isLetterKey} from '../../../utils/keyCodes.utils';
import {Selection} from '../../../interfaces';
import Cell = Selection.Cell;

export default class CellEditService implements Module {
    private editCell: typeof selectionStore.state.edit = null;
    private readonly keyDownFunc: ((e: KeyboardEvent) => void);

    constructor(private target: string) {
        interact(this.target).on('doubletap', (): void => {
            const focus: Cell|null = selectionStore.get('focus');
            if (focus && !dataProvider.isReadOnly(focus.y, focus.x)) {
                setEdit({ x: focus.x, y: focus.y });
            }
        });
        this.keyDownFunc = (e: KeyboardEvent) => this.handleKeyDown(e);
        document.addEventListener('keydown', this.keyDownFunc);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        this.editCell = selectionStore.get('edit');
        if (this.editCell) {
            switch (e.code) {
                case codesLetter.ESCAPE:
                    setEdit();
                    break;
            }
            return;
        }
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isLetterKey(e.keyCode) || isEnter) {
            const focus: Cell|null = selectionStore.get('focus');
            if (focus && !dataProvider.isReadOnly(focus.y, focus.x)) {
                setEdit({
                    x: focus.x,
                    y: focus.y,
                    val: !isEnter ? e.key : ''
                });
            }
        }
    }

    close(): void {
        setEdit();
    }

    destroy(): void {
        interact(this.target).unset();
        document.removeEventListener('keydown', this.keyDownFunc);
    }
}