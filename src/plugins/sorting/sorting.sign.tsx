import { h } from '@stencil/core';
import { ColumnRegular } from '@type';

export const FILTER_BUTTON_CLASS = 'rv-filter';
export const FILTER_BUTTON_ACTIVE = 'active';

type Props = {
  column: ColumnRegular;
};
export const SortingSign = ({ column }: Props) => {
  return <i class={column.order} />;
};
