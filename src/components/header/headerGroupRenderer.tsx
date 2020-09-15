import {h, VNode} from '@stencil/core';
import { Group } from '../../store/dataSource/data.store';
import { HEADER_CLASS } from '../../utils/consts';

type Props = {
    start: number;
    end: number;
    group: Group;
}

const GroupHeaderRenderer = ({start, end, group}: Props, _children: VNode[]): VNode[] => {
    const groupProps = {
        class: HEADER_CLASS,
        style: {
          transform: `translateX(${start}px)`,
          width: `${end - start}px`
        }
      };
    return <div {...groupProps}>{group.name}</div>;
};

export default GroupHeaderRenderer;
