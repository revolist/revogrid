import interact from 'interactjs';
import {getCell} from '../../services/cell.helpers';
import {codesLetter} from '../../utils/keyCodes';
import {Selection} from '../../interfaces';
import Cell = Selection.Cell;

interface Config {
    canRange: boolean;
    focus(cell: Cell, isMulti?: boolean): void;
    range(start: Cell, end: Cell): void;
    tempRange(start: Cell, end: Cell): void;
    change(area: Partial<Cell>, isMulti?: boolean): void;
}

export default class CellSelectionService {
    public canRange: boolean = false;

    constructor(private target: string, private config: Config) {
        this.canRange = config.canRange;
        interact(target)
            .draggable({
                listeners: {
                    start: event =>
                        this.canRange && config.focus(getCell(event.currentTarget))
                },
                cursorChecker: () => 'default'
            })
            .dropzone({
                ondrop: e => this.canRange && config.range(getCell(e.currentTarget), getCell(e.relatedTarget)),
                ondragenter: e => this.canRange && config.tempRange(getCell(e.relatedTarget), getCell(e.currentTarget))
            })
            .on('tap', e => config.focus(getCell(e.currentTarget), this.canRange && e.shiftKey));
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
}
