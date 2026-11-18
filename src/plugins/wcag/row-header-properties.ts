import type { CellProps, PropertiesFunc } from '@type';

const rowHeaderDefaults: CellProps = { role: 'rowheader' };

export function withRowHeaderRole(
  cellProperties?: PropertiesFunc,
): PropertiesFunc {
  return props => {
    const customProps: CellProps = cellProperties?.(props) || {};
    return { ...rowHeaderDefaults, ...customProps };
  };
}
