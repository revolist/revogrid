import { h, VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';
import ColumnService from './columnService';
import { DRAG_ICON_CLASS, DRAGGABLE_CLASS } from '../../utils/consts';

type Props = {
  model: RevoGrid.ColumnDataSchemaModel;
  canDrag?: boolean;
  onDragStart?(e: MouseEvent): void;
};

const CellRenderer = ({ model, canDrag, onDragStart }: Props) => {
  const els: (VNode | string)[] = [];
  if (model.column.rowDrag && isRowDragService(model.column.rowDrag, model)) {
    if (canDrag) {
      els.push(
        <span class={DRAGGABLE_CLASS} onMouseDown={e => onDragStart(e)}>
          <span class={DRAG_ICON_CLASS} />
        </span>,
      );
    } else {
      els.push(<span class={DRAGGABLE_CLASS} />);
    }
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
