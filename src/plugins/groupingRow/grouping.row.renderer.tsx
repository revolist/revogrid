import { h } from "@stencil/core";
import RowRenderer, { RowProps } from "../../components/data/rowRenderer";
import { RevoGrid } from "../../interfaces";
import { GRID_INTERNALS } from "../../utils/consts";

interface GroupRowPros extends RowProps {
    model: RevoGrid.DataType;
}
type Props = GroupRowPros&RevoGrid.PositionItem;

export const GROUP_DEPTH = `${GRID_INTERNALS}-depth`;
export const PSEUDO_GROUP_ITEM = `${GRID_INTERNALS}-name`;
export const PSEUDO_GROUP_ITEM_ID = `${GRID_INTERNALS}-id`;
export const GROUP_EXPANDED = `${GRID_INTERNALS}-expanded`;
export const GROUP_EXPAND_BTN = `group-expand`;
export const GROUP_EXPAND_EVENT = `groupExpandClick`;

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
            onClick={(e) => expandEvent(e, model, itemIndex)}>{!expanded ? 'E' : 'C'}</button>
            {name}
    </RowRenderer>;
};
export default GroupingRowRenderer;
