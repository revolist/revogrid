import { RowHeaders } from '..';

const LETTER_BLOCK_SIZE = 10;
export const calculateRowHeaderSize = (
  itemsLength: number,
  rowHeaderColumn?: RowHeaders,
  minWidth = 50,
) => {
  return (
    rowHeaderColumn?.size ||
    Math.max((itemsLength.toString().length + 1) * LETTER_BLOCK_SIZE, minWidth)
  );
};
