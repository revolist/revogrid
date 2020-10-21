import { h, VNode } from "@stencil/core";
import { RevoGrid } from "../../interfaces";
import { ResizableElement } from "../../services/resizable.directive";
import ColumnService from "../data/columnService";

type Props = {
    data?: GlobalColumn;
    props: RevoGrid.CellProps;
};

interface GlobalColumn extends RevoGrid.ColumnProperties {
    name?: string;
}

export const HeaderCellRenderer = ({data, props}: Props): VNode => {
    let headerChildren: VNode|string = data?.name || '';
    let cellProps = props;
    if (data?.columnTemplate) {
        headerChildren = data.columnTemplate(h as unknown as RevoGrid.HyperFunc<VNode>, data);
    }
    if (data?.columnProperties) {
        const extra = data.columnProperties(data);
        if (extra && typeof extra === 'object') {
            cellProps = ColumnService.doMerge(props, extra);
        }
    }
    return <ResizableElement {...cellProps}>{headerChildren}</ResizableElement>;
};
