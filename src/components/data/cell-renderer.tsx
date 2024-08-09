import { h, VNode, Build, EventEmitter } from '@stencil/core';
import {
  Providers,
  DragStartEvent,
  ColumnDataSchemaModel,
  CellTemplate,
} from '@type';

import {
  DRAGGABLE_CLASS,
  DRAG_ICON_CLASS,
} from '../../utils/consts';

import { getCellData, isRowDragService } from './column.service';

interface RenderProps {
  model: ColumnDataSchemaModel;
  providers: Providers;
  template?: CellTemplate;
  additionalData?: any;
  dragStartCell?: EventEmitter<DragStartEvent>;
}


function renderCell(v: RenderProps) {
  const els: (VNode | string)[] = [];

  // #region Custom cell
  if (v.template) {
    els.push(
      v.template(h, { ...v.model, providers: v.providers }, v.additionalData),
    );
  }
  // #endregion

  // #region Regular cell
  else {
    if (!v.model.column) {
      // something is wrong with data
      if (Build.isDev) {
        console.error('Investigate column problem.', v.model);
      }
      return '';
    }

    // Row drag
    if (
      v.model.column.rowDrag &&
      isRowDragService(v.model.column.rowDrag, v.model)
    ) {
      els.push(
        <span
          class={DRAGGABLE_CLASS}
          onMouseDown={originalEvent =>
            v.dragStartCell?.emit({
              originalEvent,
              model: v.model,
            })
          }
        >
          <span class={DRAG_ICON_CLASS} />
        </span>,
      );
    }

    els.push(`${getCellData(v.model.model[v.model.prop])}`);
  }
  return els;
}

export const CellRenderer = ({
  renderProps,
  cellProps,
}: {
  renderProps: RenderProps;
  cellProps: any;
}): VNode => {
  const render = renderCell.bind(null, renderProps);
  return (
    <div {...cellProps} redraw={render}>
      {render()}
    </div>
  );
};
