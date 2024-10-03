import { h, type VNode } from '@stencil/core';
import { JSXBase } from '@stencil/core/internal';
import { DATA_ROW } from '../../utils/consts';

export interface RowProps extends JSXBase.HTMLAttributes {
  size: number;
  start: number;
  index: number;
  rowClass?: string;
  depth?: number;
}

export const PADDING_DEPTH = 10;

const RowRenderer = ({ rowClass, index, size, start, depth }: RowProps, cells: VNode[]) => {
  const props = {
    ...{ [DATA_ROW]: index },
  };
  return (
    <div
      {...props}
      class={`rgRow ${rowClass || ''}`}
      style={{
        height: `${size}px`,
        transform: `translateY(${start}px)`,
        paddingLeft: depth ? `${PADDING_DEPTH * depth}px` : undefined,
      }}
    >
      {cells}
    </div>
  );
};

export default RowRenderer;
