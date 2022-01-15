import { h, VNode } from '@stencil/core';
import { DragStartEvent, RevoGrid } from '../../interfaces';
import ColumnService from './columnService';
import { DRAG_ICON_CLASS, DRAGGABLE_CLASS } from '../../utils/consts';


type Props = {
  model: RevoGrid.ColumnDataSchemaModel;
  onDragStart?(e: DragStartEvent): void;
};

const CellRenderer = ({ model, onDragStart }: Props) => {
  const els: (VNode | string)[] = [];
  if (model.column.rowDrag && isRowDragService(model.column.rowDrag, model)) {
    els.push(
      <span class={DRAGGABLE_CLASS} onMouseDown={e => onDragStart({
        ...e,
        model
      })}>
        <span class={DRAG_ICON_CLASS} />
      </span>,
    );
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
