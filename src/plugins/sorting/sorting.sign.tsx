import { h } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

export const FILTER_BUTTON_CLASS = 'rv-filter';
export const FILTER_BUTTON_ACTIVE = 'active';

type Props = {
  column: RevoGrid.ColumnRegular;
};
export const SortingSign = ({ column }: Props) => {
  return <i class={column?.order ?? 'sort-off'} />;
};
