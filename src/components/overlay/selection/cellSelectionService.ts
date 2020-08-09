import interact from 'interactjs';
import {Module} from '../../../services/module.interfaces';
import selectionStore, {setFocus, setRange, setTempRange} from '../../../store/selection/selection.strore';
import {getCell} from '../../../services/cell.helpers';
import {codesLetter} from '../../../utils/keyCodes';
import viewportStore from '../../../store/viewPort/viewport.store';
import {Selection} from '../../../interfaces';
import Cell = Selection.Cell;

export default class CellSelectionService implements Module {
    private readonly keyDownFunc: ((e: KeyboardEvent) => void);
    constructor(private target: string, range: boolean = false) {
        if (range) {
            interact(target)
                .draggable({
                    listeners: {
                        start: event => {
                            const cell: Cell = getCell(event.currentTarget);
                            setFocus(cell);
                            setRange(cell, cell);
                        }
                    },
                    cursorChecker: () => 'default'
                })
                .dropzone({
                    ondrop: event => {
                        const finalCell: Cell = getCell(event.currentTarget);
                        const first: Cell = getCell(event.relatedTarget);
                        setRange(first, finalCell);
                        setTempRange();
                    },
                    ondragenter: event => {
                        const finalCell: Cell = getCell(event.currentTarget);
                        const first: Cell = getCell(event.relatedTarget);
                        setTempRange(first, finalCell);
                    }
                })
        }
        interact(target).on('tap', event => {
            const cell: Cell = getCell(event.currentTarget);
            let prevCell: Cell = cell;
            if (range && event.shiftKey) {
                prevCell = selectionStore.get('focus') || cell;
            }
            setRange(prevCell, cell);
            setFocus(prevCell);
        });

        this.keyDownFunc = (e: KeyboardEvent) => CellSelectionService.handleKeyDown(e, range);
        document.addEventListener('keydown', this.keyDownFunc);
    }

    private static handleKeyDown(e: KeyboardEvent, canRange: boolean): void {
        const range: typeof selectionStore.state.range = selectionStore.get('range');
        const focus: typeof selectionStore.state.focus = selectionStore.get('focus');
        if (!range || !focus) {
            return;
        }

        let start: Cell = {
            x: range.x,
            y: range.y
        };
        let end: Cell = start;
        let isMulti: boolean = canRange && e.shiftKey;

        // continue selection
        if (isMulti) {
            end = {
                x: range.x1,
                y: range.y1
            };
        }

        function doUpdate(start: Cell, end: Cell, isMulti: boolean = false) {
            if (isMulti) {
                setRange(start, end);
            } else {
                setRange(start, end);
                setFocus(end);
            }
        }

        let point: Cell;
        switch (e.code) {
            case codesLetter.ARROW_UP:
                point = end.y > focus.y ? end : start;
                if (point.y > 0) {
                    point.y--;
                    doUpdate(start, end, isMulti);
                }
                break;
            case codesLetter.ARROW_DOWN:
                point = end.y > focus.y ? end : start;
                if (point.y < viewportStore.row.get('realCount')) {
                    point.y++;
                    doUpdate(start, end, isMulti);
                }
                break;
            case codesLetter.ARROW_LEFT:
                point = end.x > focus.x ? end : start;
                if (point.x > 0) {
                    point.x--;
                    doUpdate(start, end, isMulti);
                }
                break;
            case codesLetter.ARROW_RIGHT:
                point = end.x > focus.x ? end : start;
                if (point.x < viewportStore.col.get('realCount')) {
                    point.x++;
                    doUpdate(start, end, isMulti);
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
