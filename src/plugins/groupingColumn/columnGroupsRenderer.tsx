import { h, VNode } from '@stencil/core';
import findIndex from 'lodash/findIndex';
import { RevoGrid } from '../../interfaces';
import { Group } from '../../store/dataSource/data.store';
import { getItemByIndex } from '../../store/dimension/dimension.helpers';
import { HEADER_ROW_CLASS } from '../../utils/consts';
import GroupHeaderRenderer from './headerGroupRenderer';
import { ResizeProps } from '../..';

type Props<T> = {
  visibleProps: { [prop: string]: number };
  groups: Record<number, Group[]>;
  dimensionCol: Pick<RevoGrid.DimensionSettingsState, 'indexes' | 'originItemSize' | 'indexToItem'>;
  depth: number;
  canResize: boolean;
  providers: RevoGrid.Providers<T>;
  additionalData: any;
  onResize(changedX: number, startIndex: number, endIndex: number): void;
} & Partial<Pick<ResizeProps, 'active'>>;

const ColumnGroupsRenderer = ({
  additionalData, providers, depth, groups, visibleProps, dimensionCol, canResize, active, onResize
}: Props<RevoGrid.DimensionCols | 'rowHeaders'>): VNode[] => {
  // render group columns
  const groupRow: VNode[] = [];
  for (let i = 0; i < depth; i++) {
    if (groups[i]) {
      for (let group of groups[i]) {
        // if group in visible range
        // find first visible group prop in visible columns range
        const indexFirstVisibleCol: number | undefined = findIndex(group.ids, id => typeof visibleProps[id] === 'number');
        if (indexFirstVisibleCol > -1) {
          const colVisibleIndex = visibleProps[group.ids[indexFirstVisibleCol]]; // get column index
          const groupStartIndex = colVisibleIndex - indexFirstVisibleCol; // first column index in group
          const groupEndIndex = groupStartIndex + group.ids.length - 1; // last column index in group

          // coordinates
          const groupStart = getItemByIndex(dimensionCol, groupStartIndex).start;
          const groupEnd = getItemByIndex(dimensionCol, groupEndIndex).end;
          groupRow.push(
            <GroupHeaderRenderer
              providers={providers}
              start={groupStart}
              end={groupEnd}
              group={group}
              active={active}
              canResize={canResize}
              onResize={e => onResize(e.changedX, groupStartIndex, groupEndIndex)}
              additionalData={additionalData}
            />,
          );
        }
      }
    }
    groupRow.push(<div class={`${HEADER_ROW_CLASS} group`} />);
  }
  return groupRow;
};

export default ColumnGroupsRenderer;
