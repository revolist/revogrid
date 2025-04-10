import { h } from '@stencil/core';
import { ColumnRegular } from '@type';

type Props = {
  column: ColumnRegular;
};
export const SortingSign = ({ column }: Props) => {
  return <i class={column?.order ?? 'sort-off'} />;
};
