import interact from 'interactjs';
import {Module} from '../../../services/module.interfaces';
import {getCell} from '../../../services/cell.helpers';
import {codesLetter} from '../../../utils/keyCodes';
import {Selection} from '../../../interfaces';
import selectionStoreConnector, {selectionGlobalChange} from '../../../store/selection/selection.store.connector';
import Cell = Selection.Cell;
import {isLetterKey} from "../../../utils/keyCodes.utils";
import dataProvider from "../../../services/data.provider";

interface Config {
    focus(cell: Cell, isMulti?: boolean): void;
    range(start: Cell, end: Cell): void;
    tempRange(start: Cell, end: Cell): void;
}

export default class CellSelectionService implements Module {
    private static keyDownFunc: ((e: KeyboardEvent) => void);
    static canRange: boolean = false;

    constructor(
        private target: string,
        config: Config
    ) {
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

    private static handleKeyDown(e: KeyboardEvent, isMulti: boolean): void {
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
                selectionGlobalChange({ y: -1 }, isMulti);
                break;
            case codesLetter.ARROW_DOWN:
                selectionGlobalChange({ y: 1 }, isMulti);
                break;
            case codesLetter.ARROW_LEFT:
                selectionGlobalChange({ x: -1 }, isMulti);
                break;
            case codesLetter.ARROW_RIGHT:
                selectionGlobalChange({ x: 1 }, isMulti);
                break;
        }

        if (selectionStoreConnector.edit) {
            switch (e.code) {
                case codesLetter.ESCAPE:
                    selectionStoreConnector.edit = undefined;
                    break;
            }
            return;
        }
        const isEnter: boolean = codesLetter.ENTER === e.code;
        if (isLetterKey(e.keyCode) || isEnter) {
            const focus: Cell|null = selectionStoreConnector.focused;
            if (focus && !dataProvider.isReadOnly(focus.y, focus.x)) {
                selectionStoreConnector.edit = {
                    x: focus.x,
                    y: focus.y,
                    val: !isEnter ? e.key : ''
                };
            }
        }
    }

    static connect(): void {
        if (!CellSelectionService.keyDownFunc) {
            CellSelectionService.keyDownFunc = (e: KeyboardEvent) =>
                CellSelectionService.canRange && CellSelectionService.handleKeyDown(e, e.shiftKey);
            document.addEventListener('keydown', CellSelectionService.keyDownFunc);
        }
    }

    static disconnect(): void {
        document.removeEventListener('keydown', CellSelectionService.keyDownFunc);
    }

    destroy(): void {
        interact(this.target).unset();
    }
}
