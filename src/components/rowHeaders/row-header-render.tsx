import { VNode } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

export const RowHeaderRender = (start: number) => (_h: RevoGrid.HyperFunc<VNode>, e: { rowIndex: number }) => start + e.rowIndex;
