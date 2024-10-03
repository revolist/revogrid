import { type VNode } from '@stencil/core';
import { ROW_FOCUSED_CLASS } from '../../utils/consts';
import { RangeArea } from '@type';

/**
 * Class is responsible for highlighting rows in a table.
 */
export class RowHighlightPlugin {
  private currentRange: RangeArea | null = null;
  selectionChange(e: RangeArea, renderedRows: Map<number, VNode>) {
    // clear previous range
    if (this.currentRange) {
      renderedRows.forEach((row, y) => {
        // skip current range
        if (e && y >= e.y && y <= e.y1) {
          return;
        }

        // clear previous range
        if (
          row &&
          row.$elm$ instanceof HTMLElement &&
          row.$elm$.classList.contains(ROW_FOCUSED_CLASS)
        ) {
          row.$elm$.classList.remove(ROW_FOCUSED_CLASS);
          if (row.$attrs$?.class.includes(ROW_FOCUSED_CLASS)) {
            row.$attrs$.class = row.$attrs$.class.replace(
              ROW_FOCUSED_CLASS,
              '',
            );
          }
        }
      });
    }

    // apply new range
    if (e) {
      for (let y = e.y; y <= e.y1; y++) {
        const row = renderedRows.get(y);
        if (
          row &&
          row.$elm$ instanceof HTMLElement &&
          !row.$elm$.classList.contains(ROW_FOCUSED_CLASS)
        ) {
          const attrs = (row.$attrs$ = row.$attrs$ || {});
          attrs.class = (attrs.class || '') + ' ' + ROW_FOCUSED_CLASS;
          row.$elm$.classList.add(ROW_FOCUSED_CLASS);
        }
      }
    }
    this.currentRange = e;
  }

  isRowFocused(y: number) {
    return (
      this.currentRange && y >= this.currentRange.y && y <= this.currentRange.y1
    );
  }
}
