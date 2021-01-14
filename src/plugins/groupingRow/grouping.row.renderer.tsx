import { h } from "@stencil/core";
import RowRenderer, { RowProps } from "../../components/data/rowRenderer";
import { RevoGrid } from "../../interfaces";
import { GROUP_DEPTH, GROUP_EXPANDED, GROUP_EXPAND_BTN, GROUP_EXPAND_EVENT, PSEUDO_GROUP_ITEM } from "./grouping.const";
interface GroupRowPros extends RowProps {
    model: RevoGrid.DataType;
}
type Props = GroupRowPros&RevoGrid.PositionItem;

function expandEvent(e: MouseEvent, model: RevoGrid.DataType, virtualIndex: number) {
    const event = new CustomEvent(GROUP_EXPAND_EVENT, { detail: {
        model, virtualIndex
    }, cancelable: true, bubbles: true });
    e.target.dispatchEvent(event);
}

const GroupingRowRenderer = (props: Props) => {
    const {model, itemIndex} =  props;
    const name = model[PSEUDO_GROUP_ITEM];
    const expanded = model[GROUP_EXPANDED];
    const depth = parseInt(model[GROUP_DEPTH], 10) || 0;
    return <RowRenderer {...props} rowClass='groupingRow' depth={depth}>
        <button
            class={{ [GROUP_EXPAND_BTN]: true }}
            onClick={(e) => expandEvent(e, model, itemIndex)}>
                <svg
                    aria-hidden="true"
                    style={{transform: `rotate(${!expanded ? -90 : 0}deg)`}}
                    focusable="false"
                    viewBox="0 0 448 512">
                        <path fill="currentColor" d="M207.029 381.476L12.686 187.132c-9.373-9.373-9.373-24.569 0-33.941l22.667-22.667c9.357-9.357 24.522-9.375 33.901-.04L224 284.505l154.745-154.021c9.379-9.335 24.544-9.317 33.901.04l22.667 22.667c9.373 9.373 9.373 24.569 0 33.941L240.971 381.476c-9.373 9.372-24.569 9.372-33.942 0z">
                        </path>
                </svg>
        </button>
        {name}
    </RowRenderer>;
};
export default GroupingRowRenderer;
