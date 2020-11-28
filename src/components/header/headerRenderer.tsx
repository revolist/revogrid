import {h, VNode} from '@stencil/core';
import { RevoGrid, Selection } from '../../interfaces';
import { ResizeEvent } from '../../services/resizable.directive';
import { DATA_COL, FOCUS_CLASS, HEADER_CLASS, HEADER_SORTABLE_CLASS, MIN_COL_SIZE } from '../../utils/consts';
import { HeaderCellRenderer } from './headerCellRenderer';

type ClickEventData = {column: RevoGrid.ColumnRegular, index: number};
type Props = {
    column: RevoGrid.VirtualPositionItem;
    data?: RevoGrid.ColumnRegular;
    range?: Selection.RangeArea;
    canResize?: boolean;
    onResize?(e: ResizeEvent): void;
    onClick?(data: ClickEventData): void;
    onDoubleClick?(data: ClickEventData): void;
};

const HeaderRenderer = (p: Props, _children: VNode[]): VNode => {
    const cellClass: {[key: string]: boolean} = {
        [HEADER_CLASS]: true,
        [HEADER_SORTABLE_CLASS]: !!p.data?.sortable,
    };
    if (p.data?.order) {
        cellClass[p.data.order] = true;
    }
    const dataProps = {
        [DATA_COL]: p.column.itemIndex,
        canResize: p.canResize,
        minWidth: p.data?.minSize || MIN_COL_SIZE,
        maxWidth: p.data?.maxSize,
        active: ['r'],
        class: cellClass,
        style: { width: `${p.column.size}px`, transform: `translateX(${p.column.start}px)` },
        onResize: p.onResize,
        onDoubleClick: () => p.onDoubleClick({ column: p.data, index: p.column.itemIndex }),
        onClick: (e: MouseEvent) => {
            if (!e.defaultPrevented && p.onClick) {
                p.onClick({ column: p.data, index: p.column.itemIndex });
            }
        }
    };
    if (p.range) {
        if (p.column.itemIndex >= p.range.x && p.column.itemIndex <= p.range.x1) {
            if (typeof dataProps.class === 'object') {
                dataProps.class[FOCUS_CLASS] = true;
            }
        }
    }
    return <HeaderCellRenderer data={p.data} props={dataProps}/>;
};

export default HeaderRenderer;
