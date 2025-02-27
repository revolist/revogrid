import { h } from '@stencil/core';
import { Group, getItemByIndex } from '@store';
import { DimensionSettingsState, Providers, DimensionCols, PositionItem } from '@type';
import { HEADER_ROW_CLASS } from '../../utils/consts';
import { GroupHeaderRenderer } from './headerGroupRenderer';
import { ResizeProps } from '../../components/header/resizable.directive';

type Props<T> = {
  visibleProps: { [prop: string]: number };
  groups: Record<number, Group[]>;
  dimensionCol: Pick<DimensionSettingsState, 'indexes' | 'originItemSize' | 'indexToItem'>;
  cols: PositionItem[];
  depth: number;
  canResize: boolean;
  providers: Providers<T>;
  additionalData: any;
  onResize(changedX: number, startIndex: number, endIndex: number): void;
} & Partial<Pick<ResizeProps, 'active'>>;

export const ColumnGroupsRenderer = ({
  additionalData, providers, depth, groups, dimensionCol, cols, canResize, active, onResize
}: Props<DimensionCols | 'rowHeaders'>): ReturnType<typeof h>[] => {
  // render group columns
  const groupRow: ReturnType<typeof h>[] = [];
  const visibleIndexes = cols.map(col => col.itemIndex);

  for (let i = 0; i < depth; i++) {
    let groupStartIndex = 0;
    if (groups[i]) {
      for (let group of groups[i]) {
        // Calculate group boundaries based on array positions
        const groupEndIndex = groupStartIndex + group.ids.length - 1;
        
        // Check if any visible column is within this group's range
        const isVisible = visibleIndexes.some(index => 
          index >= groupStartIndex && index <= groupEndIndex
        );

        if (isVisible) {
          // Get actual visible boundaries
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
              onResize={e => onResize(e.changedX ?? 0, groupStartIndex, groupEndIndex)}
              additionalData={additionalData}
            />,
          );
        }
        
        // Move start index for next group
        groupStartIndex = groupEndIndex + 1;
      }
    }
    groupRow.push(<div class={`${HEADER_ROW_CLASS} group`} />);
  }
  return groupRow;
};
