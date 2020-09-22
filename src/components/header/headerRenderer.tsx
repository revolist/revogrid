import {h, VNode} from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import { DATA_COL, HEADER_CLASS, HEADER_SORTABLE_CLASS } from '../../utils/consts';

type Props = {
    data: RevoGrid.ColumnRegular;
    column: RevoGrid.VirtualPositionItem;
    onClick(data: {column: RevoGrid.ColumnRegular, index: number}): void;
}

const HeaderRenderer = ({column, data, onClick}: Props, _children: VNode[]): VNode[] => {
    const dataProps = {
        [DATA_COL]: column.itemIndex,
        class: `${HEADER_CLASS} ${data.order || ''} ${data.sortable ? HEADER_SORTABLE_CLASS : ''}`,
        style: { width: `${column.size}px`, transform: `translateX(${column.start}px)` },
        onClick: () => onClick({ column: data, index: column.itemIndex })
    };
    const headerChildren: VNode|string = data.columnTemplate ?
        data.columnTemplate(h as unknown as RevoGrid.HyperFunc<VNode>, data) : data.name;
    return <div {...dataProps}>{headerChildren}</div>;
};

export default HeaderRenderer;
