import interact from 'interactjs';
import {DATA_COL, DATA_ROW} from '../components/data/cellConsts';
import {Module} from './module.interfaces';
import {setRange, setTempRange} from '../store/selection.strore';

type ActiveCell = {x: number; y: number};
export default class CellSelection implements Module {
    constructor(private target: string) {
        interact(target)
            .draggable({
                listeners: {
                    start: (event): void => {
                        const cell = this.getCell(event.target);
                        setRange([cell.x, cell.y], [cell.x, cell.y]);
                    }
                },
                cursorChecker: (): string => 'default'
            })
            .dropzone({
                ondrop: (event): void => {
                    const finalCell = this.getCell(event.target);
                    const first = this.getCell(event.relatedTarget);
                    setRange([first.x, first.y], [finalCell.x, finalCell.y]);
                    setTempRange();
                },
                ondragenter: (event): void => {
                    const finalCell = this.getCell(event.target);
                    const first = this.getCell(event.relatedTarget);
                    setTempRange([first.x, first.y], [finalCell.x, finalCell.y]);
                }
            })
            .on('tap', (event): void => {
                const cell: ActiveCell = this.getCell(event.target);
                setRange([cell.x, cell.y], [cell.x, cell.y]);
            });
    }

    private getCell(cell: HTMLElement): ActiveCell {
        return {
            x: parseInt(cell.getAttribute(DATA_COL), 10),
            y: parseInt(cell.getAttribute(DATA_ROW), 10)
        };
    }

    public destroy(): void {
        interact(this.target).unset();
    }
}
