import interact from 'interactjs';
import {ActiveCell, Module} from './module.interfaces';
import selectionStore, {setRange, setTempRange} from '../store/selection.strore';
import {getCell} from './cell.helpers';
import {codesLetter} from "../utils/keyCodes";
import {rowsStore as viewportRows, colsStore as viewportCols} from '../store/viewport.store';

export default class CellSelection implements Module {
    private readonly keyDownFunc: ((e: KeyboardEvent) => void);
    constructor(private target: string, range: boolean = false) {
        if (range) {
            interact(target)
                .draggable({
                    listeners: {
                        start: (event): void => {
                            const cell = getCell(event.currentTarget);
                            setRange([cell.x, cell.y], [cell.x, cell.y]);
                        }
                    },
                    cursorChecker: (): string => 'default'
                })
                .dropzone({
                    ondrop: (event): void => {
                        const finalCell = getCell(event.currentTarget);
                        const first = getCell(event.relatedTarget);
                        setRange([first.x, first.y], [finalCell.x, finalCell.y]);
                        setTempRange();
                    },
                    ondragenter: (event): void => {
                        const finalCell = getCell(event.currentTarget);
                        const first = getCell(event.relatedTarget);
                        setTempRange([first.x, first.y], [finalCell.x, finalCell.y]);
                    }
                })
        }
        interact(target).on('tap', (event): void => {
            const cell: ActiveCell = getCell(event.currentTarget);
            setRange([cell.x, cell.y], [cell.x, cell.y]);
        });

        this.keyDownFunc = (e: KeyboardEvent) => this.handleKeyDown(e);
        document.addEventListener('keydown', this.keyDownFunc);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const range: typeof selectionStore.state.range = selectionStore.get('range');
        if (!range) {
            return;
        }

        switch (e.code) {
            case codesLetter.ARROW_UP:
                if (range.y > 0) {
                    range.y--;
                    setRange([range.x, range.y], [range.x, range.y]);
                }
                break;
            case codesLetter.ARROW_DOWN:
                const maxY: number = viewportRows.get('realCount');
                if (range.y < maxY) {
                    range.y++;
                    setRange([range.x, range.y], [range.x, range.y]);
                }
                break;
            case codesLetter.ARROW_LEFT:
                if (range.x > 0) {
                    range.x--;
                    setRange([range.x, range.y], [range.x, range.y]);
                }
                break;
            case codesLetter.ARROW_RIGHT:
                const maxX: number = viewportCols.get('realCount');
                if (range.x < maxX) {
                    range.x++;
                    setRange([range.x, range.y], [range.x, range.y]);
                }
                break;
        }
        switch (e.code) {
            case codesLetter.ARROW_UP:
            case codesLetter.ARROW_DOWN:
            case codesLetter.ARROW_LEFT:
            case codesLetter.ARROW_RIGHT:
                e.preventDefault();
                break;
        }
    }

    destroy(): void {
        interact(this.target).unset();
        document.removeEventListener('keydown', this.keyDownFunc);
    }
}
