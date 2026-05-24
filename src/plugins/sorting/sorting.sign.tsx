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
  const indicatorAttrs = { class: 'sort-indicator' };
  const iconAttrs = { class: column?.order ?? 'sort-off' };
  const orderIndexAttrs = { class: 'sort-order-index' };

  return (
    <span {...indicatorAttrs}>
      <i {...iconAttrs} />
      {column?.sortIndex ? (
        <sup {...orderIndexAttrs}>{column.sortIndex}</sup>
      ) : null}
    </span>
  );
};
