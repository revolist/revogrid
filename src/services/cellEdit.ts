import {Module} from './module.interfaces';
import interact from 'interactjs';
import selectionStore, {RangeI, setEdit} from '../store/selection.strore';
import {codesLetter} from '../utils/keyCodes';
import {isLetterKey} from '../utils/keyCodes.utils';

export default class CellEdit implements Module {
    private editCell: typeof selectionStore.state.edit = null;
    private readonly keyDownFunc: ((e: KeyboardEvent) => void);

    constructor(private target: string) {
        interact(this.target).on('doubletap', (): void => {
            const range: RangeI|null = selectionStore.get('range');
            if (range) {
                setEdit([range.x, range.y]);
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
            const range: RangeI|null = selectionStore.get('range');
            if (range) {
                setEdit([range.x, range.y, !isEnter ? e.key : '']);
            }
        }
    }

    save(): void {
        setEdit();
    }

    destroy(): void {
        interact(this.target).unset();
        document.removeEventListener('keydown', this.keyDownFunc);
    }
}