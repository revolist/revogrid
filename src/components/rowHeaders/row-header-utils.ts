import { RevoGrid } from '../../interfaces';

const LETTER_BLOCK_SIZE = 10;
export const calculateRowHeaderSize = (itemsLength: number, rowHeaderColumn?: RevoGrid.RowHeaders) => {
    return rowHeaderColumn?.size || (itemsLength.toString().length + 1) * LETTER_BLOCK_SIZE;
};
