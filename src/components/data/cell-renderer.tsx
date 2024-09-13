import { h, VNode, Build, EventEmitter } from '@stencil/core';
import {
  DragStartEvent,
  CellTemplateProp,
} from '@type';

import {
  DRAGGABLE_CLASS,
  DRAG_ICON_CLASS,
  getCellDataParsed,
} from '../../utils';

import { isRowDragService } from './column.service';

interface RenderProps {
  schemaModel: CellTemplateProp;
  additionalData?: any;
  dragStartCell?: EventEmitter<DragStartEvent>;
}


function renderCell(v: RenderProps) {
  const els: (VNode | string)[] = [];

  // #region Custom cell
  const template = v.schemaModel.column?.cellTemplate;
  if (template) {
    els.push(template(h, v.schemaModel, v.additionalData));
  }
  // #endregion

  // #region Regular cell
  else {
    if (!v.schemaModel.column) {
      // something is wrong with data
      if (Build.isDev) {
        console.error('Investigate column problem.', v.schemaModel);
      }
      return '';
    }

    // Row drag
    if (
      v.schemaModel.column.rowDrag &&
      isRowDragService(v.schemaModel.column.rowDrag, v.schemaModel)
    ) {
      els.push(
        <span
          class={DRAGGABLE_CLASS}
          onMouseDown={originalEvent =>
            v.dragStartCell?.emit({
              originalEvent,
              model: v.schemaModel,
            })
          }
        >
          <span class={DRAG_ICON_CLASS} />
        </span>,
      );
    }
    
    els.push(`${
      getCellDataParsed(v.schemaModel.model, v.schemaModel.column)
    }`);
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
