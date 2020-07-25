import {DATA_COL, DATA_ROW} from "./consts";
import {ActiveCell} from "./module.interfaces";

export function getCell(cell: HTMLElement): ActiveCell {
    return {
        x: parseInt(cell.getAttribute(DATA_COL), 10),
        y: parseInt(cell.getAttribute(DATA_ROW), 10)
    };
}