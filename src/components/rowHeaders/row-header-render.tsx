import { VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

type HeaderRender = {
    (start: number): (h: RevoGrid.HyperFunc<VNode>, e: { rowIndex: number }) => number;
}
export const RowHeaderRender: HeaderRender = s => (__, { rowIndex: i }) => s + i;
