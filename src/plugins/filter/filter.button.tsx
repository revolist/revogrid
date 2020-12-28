import { h } from "@stencil/core";
import { RevoGrid } from "../../interfaces";

export const FILTER_BUTTON_CLASS = 'rv-filter';
export const FILTER_BUTTON_ACTIVE = 'active';
export const FILTER_PROP = 'hasFilter';

type Props = {
    column: RevoGrid.ColumnRegular;
};
export const FilterButton = ({column}: Props) => {
    return <span><button class={{
        [FILTER_BUTTON_CLASS]: true,
        [FILTER_BUTTON_ACTIVE]: !!column[FILTER_PROP]
    }}>
        <svg class="filter-img" viewBox="0 0 64 64">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <path d="M43,48 L43,56 L21,56 L21,48 L43,48 Z M53,28 L53,36 L12,36 L12,28 L53,28 Z M64,8 L64,16 L0,16 L0,8 L64,8 Z" fill="currentColor"></path>
            </g>
        </svg>
    </button></span>;
};


export function isFilterBtn(e: HTMLElement) {
    if (e.classList.contains(FILTER_BUTTON_CLASS)) {
        return true;
    }
    return e?.closest(`.${FILTER_BUTTON_CLASS}`);
}