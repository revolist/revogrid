import { h } from '@stencil/core';
import { ColumnRegular } from '@type';
import type { SortingColumnRender } from './sorting.types';

type Props = {
  column: ColumnRegular & SortingColumnRender;
};

/**
 * Renders sorting direction and optional additive sorting rank.
 */
export const SortingSign = ({ column }: Props) => {
  return (
    <span class="sort-indicator">
      <i class={column?.order ?? 'sort-off'} />
      {column?.sortIndex ? (
        <sup class="sort-order-index">{column.sortIndex}</sup>
      ) : null}
    </span>
  );
};
