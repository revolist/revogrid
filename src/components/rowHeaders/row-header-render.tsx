import { VNode } from '@stencil/core';
import { HyperFunc } from '@type';

type HeaderRender = {
  (start: number): (h: HyperFunc<VNode>, e: { rowIndex: number }) => number;
};
export const RowHeaderRender: HeaderRender = s => (__, { rowIndex: i }) => s + i;
