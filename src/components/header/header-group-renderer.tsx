import { h } from '@stencil/core';
import { Group } from '@store';
import type { CellProps, ProvidersColumns } from '@type';
import { ResizeEvent, ResizeProps } from './resizable.directive';
import { HEADER_CLASS, MIN_COL_SIZE } from '../../utils/consts';
import { HeaderCellRenderer } from './header-cell-renderer';

export type HeaderGroupRendererProps = {
  level: number;
  start: number;
  end: number;
  group: Group;
  providers: ProvidersColumns;
  additionalData: any;
  canResize?: boolean;
  renderOffset?: number;
  onResize?(e: ResizeEvent): void;
} & Partial<Pick<ResizeProps, 'active'>>;

type KeyedGroupCellProps = CellProps & Partial<ResizeProps> & {
  key: string;
};

const HeaderGroupRenderer = (p: HeaderGroupRendererProps): ReturnType<typeof h> => {
  const groupProps: KeyedGroupCellProps = {
    key: `${p.group.name}-${p.group.indexes.join('-')}`,
    canResize: p.canResize,
    minWidth: p.group.indexes.length * MIN_COL_SIZE,
    maxWidth: 0,

    active: p.active || ['r'],
    class: {
      [HEADER_CLASS]: true,
    },
    style: {
      transform: `translateX(${p.start - (p.renderOffset || 0)}px)`,
      width: `${p.end - p.start}px`,
    },
    onResize: p.onResize,
  };
  return (
    <HeaderCellRenderer
      data={{
        ...p.group,
        prop: '',
        providers: p.providers,
        index: p.start,
      }}
      props={groupProps}
      additionalData={p.additionalData}
    />
  );
};

export default HeaderGroupRenderer;
