import {h, VNode} from '@stencil/core';
import { ResizeEvent } from '../../services/resizable.directive';
import { Group } from '../../store/dataSource/data.store';
import { HEADER_CLASS, MIN_COL_SIZE } from '../../utils/consts';
import { HeaderCellRenderer } from '../../components/header/headerCellRenderer';

type Props = {
  start: number;
  end: number;
  group: Group;
  canResize?: boolean;
  onResize?(e: ResizeEvent): void;
}

const GroupHeaderRenderer = (p: Props): VNode[] => {
    const groupProps = {
        canResize: p.canResize,
        minWidth: p.group.ids.length * MIN_COL_SIZE,
        maxWidth: 0,

        active: ['r'],
        class: {
          [HEADER_CLASS]: true
        },
        style: {
          transform: `translateX(${p.start}px)`,
          width: `${p.end - p.start}px`
        },
        onResize: p.onResize,
      };
    return <HeaderCellRenderer data={p.group} props={groupProps}/>;
};

export default GroupHeaderRenderer;
