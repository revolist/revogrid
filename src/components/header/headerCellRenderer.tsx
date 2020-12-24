import { h, VNode } from "@stencil/core";
import { RevoGrid } from "../../interfaces";
import { ResizableElement } from "../../services/resizable.directive";
import ColumnService from "../data/columnService";

type Props = {
    data?: RevoGrid.ColumnRegular;
    props: RevoGrid.CellProps;
};

export const HeaderCellRenderer = ({data, props}: Props, children: VNode[]): VNode => {
    let colTemplate: VNode|VNode[]|string = data?.name || '';
    let cellProps = props;
    if (data?.columnTemplate) {
        colTemplate = data.columnTemplate(h as unknown as RevoGrid.HyperFunc<VNode>, data);
    }
    if (data?.columnProperties) {
        const extra = data.columnProperties(data);
        if (extra && typeof extra === 'object') {
            cellProps = ColumnService.doMerge(props, extra);
        }
    }
    return <ResizableElement {...cellProps}>{colTemplate}{children}</ResizableElement>;
};
