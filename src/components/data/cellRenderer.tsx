import {h, VNode} from '@stencil/core';
import {RevoGrid} from '../../interfaces';
import ColumnService from './columnService';
import {DRAG_ICON_CLASS, DRAGGABLE_CLASS} from "../../utils/consts";

type Props = {model: RevoGrid.ColumnDataSchemaModel;}

const CellRenderer = ({model}: Props, _children: VNode[]): (VNode|string)[] => {
    const els: (VNode|string)[] = [];
    if (model.column.rowDrag && isRowDragService(model.column.rowDrag, model)) {
        els.push(<span draggable={true} onClick={(e) => console.log(e)}  onDragStart={(e) => console.log(e)} class={DRAGGABLE_CLASS}><span class={DRAG_ICON_CLASS}/></span>);
    }
    els.push(`${ColumnService.getData(model.model[model.prop])}`);
    return els;
};

export default CellRenderer;

function isRowDragService(rowDrag: RevoGrid.RowDrag, model: RevoGrid.ColumnDataSchemaModel): boolean {
    if (typeof rowDrag === 'function') {
        return rowDrag(model);
    }
    return !!rowDrag;
}
