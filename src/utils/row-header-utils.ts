import { RowHeaders } from '..';

const LETTER_BLOCK_SIZE = 10;
export const calculateRowHeaderSize = (
  itemsLength: number,
  rowHeaderColumn?: RowHeaders,
) => {
  return (
    rowHeaderColumn?.size ||
    (itemsLength.toString().length + 1) * LETTER_BLOCK_SIZE
  );
};
