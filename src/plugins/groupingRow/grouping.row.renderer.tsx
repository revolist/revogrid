import { h } from "@stencil/core";
import RowRenderer, { RowProps } from "../../components/data/rowRenderer";
import { RevoGrid } from "../../interfaces";

interface GroupRowPros extends RowProps {
    model: RevoGrid.DataType;
}

export const PSEUDO_GROUP_ITEM = '__rvgr';
const GroupingRowRenderer = (props: GroupRowPros) => {
    return <RowRenderer {...props}>{props.model[PSEUDO_GROUP_ITEM]}</RowRenderer>;
};
export default GroupingRowRenderer;
