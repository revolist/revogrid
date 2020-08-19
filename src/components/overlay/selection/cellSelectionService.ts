import interact from 'interactjs';
import {Module} from '../../../services/module.interfaces';
import {getCell} from '../../../services/cell.helpers';
import {codesLetter} from '../../../utils/keyCodes';
import {Selection} from '../../../interfaces';
import Cell = Selection.Cell;

interface Config {
    focus(cell: Cell, isMulti?: boolean): void;
    range(start: Cell, end: Cell): void;
    tempRange(start: Cell, end: Cell): void;
    change(area: Partial<Cell>, isMulti?: boolean): void;
}

export default class CellSelectionService implements Module {
    static canRange: boolean = false;

    constructor(private target: string, private config: Config) {
        interact(target)
            .draggable({
                listeners: {
                    start: event => CellSelectionService.canRange &&
                        config.focus(getCell(event.currentTarget))
                },
                cursorChecker: () => 'default'
            })
            .dropzone({
                ondrop: e => CellSelectionService.canRange &&
                    config.range(getCell(e.currentTarget), getCell(e.relatedTarget)),
                ondragenter: e => CellSelectionService.canRange && config.tempRange(getCell(e.relatedTarget), getCell(e.currentTarget))
            })
            .on('tap', e => config.focus(getCell(e.currentTarget), CellSelectionService.canRange && e.shiftKey));
    }

    public keyDown(e: KeyboardEvent): void {
        const isMulti: boolean = CellSelectionService.canRange && e.shiftKey;
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
