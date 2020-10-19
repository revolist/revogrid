import {h, VNode} from '@stencil/core';
import { RevoGrid, Selection } from '../../interfaces';
import { DATA_COL, FOCUS_CLASS, HEADER_CLASS, HEADER_SORTABLE_CLASS } from '../../utils/consts';
import { HeaderCellRenderer } from './headerCellRenderer';

type Props = {
    data?: RevoGrid.ColumnRegular;
    column: RevoGrid.VirtualPositionItem;
    range?: Selection.RangeArea;
    onClick(data: {column: RevoGrid.ColumnRegular, index: number}): void;
};

const HeaderRenderer = ({column, data, range, onClick}: Props, _children: VNode[]): VNode => {
    const cellClass: {[key: string]: boolean} = {
        [HEADER_CLASS]: true,
        [HEADER_SORTABLE_CLASS]: !!data?.sortable,
    };
    if (data?.order) {
        cellClass[data.order] = true;
    }
    const dataProps: RevoGrid.CellProps = {
        [DATA_COL]: column.itemIndex,
        class: cellClass,
        style: { width: `${column.size}px`, transform: `translateX(${column.start}px)` },
        onClick: () => onClick({ column: data, index: column.itemIndex })
    };
    if (range) {
        if (column.itemIndex >= range.x && column.itemIndex <= range.x1) {
            dataProps.class[FOCUS_CLASS] = true;
        }
    }
    return <HeaderCellRenderer data={data} props={dataProps}/>;
};

export default HeaderRenderer;
