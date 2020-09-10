import interact from 'interactjs';
import {codesLetter} from '../../utils/keyCodes';
import {Selection, RevoGrid} from '../../interfaces';
import Cell = Selection.Cell;
import {getItemByPosition} from "../../store/dimension/dimension.helpers";

interface Config {
    canRange: boolean;
    focus(cell: Cell, isMulti?: boolean): void;
    range(start: Cell, end: Cell): void;
    tempRange(start: Cell, end: Cell): void;
    autoFill(isAutofill: boolean): Cell|null;
    change(area: Partial<Cell>, isMulti?: boolean): void;
}

type EventData = {el: HTMLElement, rows: RevoGrid.DimensionSettingsState, cols: RevoGrid.DimensionSettingsState};

export default class CellSelectionService {
    public canRange: boolean = false;
    private autoFillMode: Cell|null = null;

    constructor(private target: string, private config: Config) {
        this.canRange = config.canRange;
        /*
        interact(`${target} .${CELL_CLASS}`)
            .draggable({
                listeners: {
                    start: e => {
                        if (!this.canRange) {
                            return;
                        }
                        config.focus(getCell(e.currentTarget));
                    }
                },
                cursorChecker: () => 'default'
            })
            .dropzone({
                ondrop: e => {
                    if (!this.canRange) {
                        return;
                    }
                    config.range(getCell(e.currentTarget), getCell(e.relatedTarget))
                },
                ondragenter: e => {
                    if (!this.canRange) {
                        return;
                    }
                    config.tempRange(getCell(e.relatedTarget), getCell(e.currentTarget));
                }
            }); */

    }

    onMouseDown({x, y, target, shiftKey}: MouseEvent, data: EventData): void {
        const autoFill = this.isAutoFill({target: target as HTMLElement});
        if (autoFill) {
            this.autoFillMode = this.config.autoFill(true);
        } else {
            const focusCell: Cell = this.getCurrentCell({x, y}, data);
            this.config.focus(focusCell, this.canRange && shiftKey);
        }
    }

    onMouseUp({x, y}: MouseEvent, data: EventData): void {
        if (!this.autoFillMode) {
            return;
        }
        const current: Cell = this.getCurrentCell({x, y}, data);
        this.config.range(this.autoFillMode, current);
        this.autoFillMode = null;
    }

    onMouseMove({x, y}: MouseEvent, data: EventData): void {
        if (this.autoFillMode) {
            const current: Cell = this.getCurrentCell({x, y}, data);
            this.config.tempRange(this.autoFillMode, current);
        }
    }

    keyDown(e: KeyboardEvent): void {
        const isMulti: boolean = this.canRange && e.shiftKey;
        switch (e.code) {
            case codesLetter.ARROW_UP:
            case codesLetter.ARROW_DOWN:
            case codesLetter.ARROW_LEFT:
            case codesLetter.ARROW_RIGHT:
                e.preventDefault();
                break;
        }
        switch (e.code) {
            case codesLetter.ARROW_UP:
                this.config.change({ y: -1 }, isMulti);
                break;
            case codesLetter.ARROW_DOWN:
                this.config.change({ y: 1 }, isMulti);
                break;
            case codesLetter.ARROW_LEFT:
                this.config.change({ x: -1 }, isMulti);
                break;
            case codesLetter.ARROW_RIGHT:
                this.config.change({ x: 1 }, isMulti);
                break;
        }
    }

    destroy(): void {
        interact(this.target).unset();
    }

    private getCurrentCell({x, y}: Cell, {el, rows, cols}: EventData): Cell {
        const {top, left} = el.getBoundingClientRect();
        const row = getItemByPosition(rows, y - top);
        const col = getItemByPosition(cols, x - left);
        return { x: col.itemIndex, y: row.itemIndex };
    }

    private isAutoFill({target}: {target?: HTMLElement}): boolean {
        return target?.classList.contains('autofill-handle');
    }
}
