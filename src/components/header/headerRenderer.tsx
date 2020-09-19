import {h, VNode} from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import { DATA_COL, HEADER_CLASS } from '../../utils/consts';

type Props = {
    data: RevoGrid.ColumnRegular;
    column: RevoGrid.VirtualPositionItem;
    onClick(data: RevoGrid.ColumnRegular): void;
}

const HeaderRenderer = ({column, data, onClick}: Props, _children: VNode[]): VNode[] => {
    const dataProps = {
        [DATA_COL]: column.itemIndex,
        class: HEADER_CLASS,
        style: { width: `${column.size}px`, transform: `translateX(${column.start}px)` },
        onClick: () => onClick(data)
    };
    const headerChildren: VNode|string = data.columnTemplate ? data.columnTemplate(h.h, data) : data.name;
    return <div {...dataProps}>{headerChildren}</div>;
};

export default HeaderRenderer;
