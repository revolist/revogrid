import interact from "interactjs";
import {DATA_COL} from "../components/data/cellConsts";
import {setDimensionSize} from "../store/dimension.store";
import {Module} from "./module.interfaces";

export default class HeaderResize implements Module {
    constructor(private target: string) {
        interact(target).resizable({
            edges: { bottom: false, right: true },
            onend: event => {
                const index: number = parseInt(event.target.getAttribute(DATA_COL), 10);
                setDimensionSize({ [index]: event.rect.width }, 'col');
                event.target.style.width = `${event.rect.width}px`;
            }
        });
    }

    public destroy(): void {
        interact(this.target).unset();
    }
}
