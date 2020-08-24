import interact from 'interactjs';
import {DATA_COL, MIN_COL_SIZE} from '../../utils/consts';
import {ColumnDataSchemaRegular, ViewSettingSizeProp} from '../../interfaces';

interface Config {
    canResize?: boolean;
    resize(sizes: ViewSettingSizeProp): void;
}

export default class HeaderService {
    private source: ColumnDataSchemaRegular[] = [];
    get columns(): ColumnDataSchemaRegular[] {
        return this.source;
    }
    set columns(source: ColumnDataSchemaRegular[]) {
        this.source = source;
    }
    constructor(private target: string, columns: ColumnDataSchemaRegular[], config: Config) {
        this.columns = columns;
        if (config.canResize) {
            interact(target).resizable({
                edges: { bottom: false, right: true },
                onend: event => {
                    const index: number = parseInt(event.target.getAttribute(DATA_COL), 10);
                    const col: ColumnDataSchemaRegular = this.columns[index];
                    let width: number = event.rect.width;
                    const minSize: number = col.minSize || MIN_COL_SIZE;
                    if (width < minSize) {
                        width = minSize;
                    }
                    config.resize({ [index]: width });
                }
            });
        }
    }

    destroy(): void {
        interact(this.target).unset();
    }
}
