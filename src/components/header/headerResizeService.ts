import interact from 'interactjs';
import {DATA_COL} from '../../utils/consts';
import {Module} from '../../services/module.interfaces';
import dimensionProvider from "../../services/dimension.provider";

export default class HeaderResizeService implements Module {
    constructor(private target: string) {
        interact(target).resizable({
            edges: { bottom: false, right: true },
            onend: event => {
                const index: number = parseInt(event.target.getAttribute(DATA_COL), 10);
                dimensionProvider.setSize({ [index]: event.rect.width }, 'col');
            }
        });
    }

    destroy(): void {
        interact(this.target).unset();
    }
}
