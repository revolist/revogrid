import {h, VNode} from '@stencil/core';
import { Group } from '../../store/dataSource/data.store';
import { HEADER_CLASS } from '../../utils/consts';
import { HeaderCellRenderer } from './headerCellRenderer';

type Props = {
    start: number;
    end: number;
    group: Group;
}

const GroupHeaderRenderer = ({start, end, group}: Props): VNode[] => {
    const groupProps = {
        class: {
          [HEADER_CLASS]: true
        },
        style: {
          transform: `translateX(${start}px)`,
          width: `${end - start}px`
        }
      };
    return <HeaderCellRenderer data={group} props={groupProps}/>;
};

export default GroupHeaderRenderer;
