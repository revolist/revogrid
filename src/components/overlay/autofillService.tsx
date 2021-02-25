import debounce from 'lodash/debounce';
import { DebouncedFunc } from 'lodash';
import each from 'lodash/each';
import slice from 'lodash/slice';

import { EventEmitter, h, VNode } from '@stencil/core';
import { CELL_HANDLER_CLASS } from '../../utils/consts';
import { Observable, Selection, RevoGrid, Edition } from '../../interfaces';
import { EventData, getCell, getCurrentCell, getDirectionCoordinate, getLargestAxis, isAfterLast } from './selection.utils';
import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import ColumnService from '../data/columnService';
import { DataSourceState, getSourceItem } from '../../store/dataSource/data.store';

enum AutoFillType {
  selection = 'Selection',
  autoFill = 'AutoFill',
}

export abstract class AutoFillService {
  abstract dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  abstract dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
  protected abstract selectionStoreService: SelectionStoreService;
  protected abstract columnService: ColumnService;
  abstract dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  abstract setTempRange: EventEmitter<Selection.TempRange | null>;
  abstract internalSelectionChanged: EventEmitter<Selection.ChangedRange>;
  abstract internalRangeDataApply: EventEmitter<Edition.BeforeRangeSaveDataDetails>;
  abstract setRange: EventEmitter<Selection.RangeArea>;

  protected abstract getData(): any;

  private autoFillType: AutoFillType | null = null;
  private autoFillInitial: Selection.Cell | null = null;
  private autoFillStart: Selection.Cell | null = null;
  private autoFillLast: Selection.Cell | null = null;

  private onMouseMoveAutofill: DebouncedFunc<(e: MouseEvent, data: EventData) => void>;

  /**
   * Render autofill box
   * @param range
   * @param selectionFocus
   */
  protected renderAutofill(range: Selection.RangeArea, selectionFocus: Selection.Cell): VNode {
    let handlerStyle;
    if (range) {
      handlerStyle = getCell(range, this.dimensionRow.state, this.dimensionCol.state);
    } else {
      handlerStyle = getCell(
        {
          ...selectionFocus,
          x1: selectionFocus.x,
          y1: selectionFocus.y,
        },
        this.dimensionRow.state,
        this.dimensionCol.state,
      );
    }
    return (
      <div
        class={CELL_HANDLER_CLASS}
        style={{ left: `${handlerStyle.right}px`, top: `${handlerStyle.bottom}px` }}
        onMouseDown={(e: MouseEvent) => this.selectionStart(e, this.getData(), AutoFillType.autoFill)}
      />
    );
  }

  get isAutoFill() {
    return !!this.autoFillType;
  }

  /** Process mouse move events */
  protected selectionMouseMove(e: MouseEvent) {
    // initiate mouse move debounce if not present
    if (!this.onMouseMoveAutofill) {
      this.onMouseMoveAutofill = debounce((e: MouseEvent, data: EventData) => this.doAutofillMouseMove(e, data), 5);
    }
    if (this.isAutoFill) {
      this.onMouseMoveAutofill(e, this.getData());
    }
  }

  private getFocus() {
    let focus = this.selectionStoreService.focused;
    const range = this.selectionStoreService.ranged;
    if (range) {
      focus = { x: range.x, y: range.y };
    }
    if (!focus && !range) {
      return null;
    }
    return focus;
  }

  /**
   * Autofill logic:
   * on mouse move apply based on previous direction (if present)
   */
  private doAutofillMouseMove({ x, y }: MouseEvent, data: EventData) {
    if (!this.autoFillInitial) {
      return;
    }
    let current = getCurrentCell({ x, y }, data);
    let direction: Partial<Selection.Cell> | null;
    if (this.autoFillLast) {
      direction = getDirectionCoordinate(this.autoFillStart, this.autoFillLast);
    }

    // first time or direction equal to start(same as first time)
    if (!this.autoFillLast || !direction) {
      direction = getLargestAxis(this.autoFillStart, current);

      if (!this.autoFillLast) {
        this.autoFillLast = this.autoFillStart;
      }
    }

    // nothing changed
    if (!direction) {
      return;
    }
    each(direction, (v: number, k: keyof Selection.Cell) => {
      if (v) {
        current = { ...this.autoFillLast, [k]: current[k] };
      }
    });

    // check if not the latest
    if (isAfterLast(current, data)) {
      return;
    }
    this.autoFillLast = current;
    this.setTempRange.emit({
      area: getRange(this.autoFillInitial, this.autoFillLast),
      type: this.autoFillType,
    });
  }

  /**
   * Range selection started
   * Mode @param type:
   * Can be triggered from MouseDown selection on element
   * Or can be triggered on corner square drag
   */
  protected selectionStart(e: MouseEvent, data: EventData, type = AutoFillType.selection) {
    /** Get cell by autofill element */
    const { top, left } = (e.target as HTMLElement).getBoundingClientRect();
    this.autoFillInitial = this.getFocus();
    this.autoFillType = type;
    this.autoFillStart = getCurrentCell({ x: left, y: top }, data);
    e.preventDefault();
  }

  /** Clear current range selection */
  protected clearAutoFillSelection() {
    // Apply autofill values on mouse up
    if (this.autoFillInitial) {
      // Get latest
      this.autoFillInitial = this.getFocus();
      if (this.autoFillType === AutoFillType.autoFill) {
        this.applyRangeWithData(this.autoFillInitial, this.autoFillLast);
      } else {
        this.applyRangeOnly(this.autoFillInitial, this.autoFillLast);
      }
    }

    this.autoFillType = null;
    this.autoFillInitial = null;
    this.autoFillLast = null;
    this.autoFillStart = null;
  }

  /** Trigger range apply events and handle responses */
  onRangeApply(data: RevoGrid.DataLookup, range: Selection.RangeArea): void {
    const models: RevoGrid.DataLookup = {};
    for (let rowIndex in data) {
      models[rowIndex] = getSourceItem(this.dataStore, parseInt(rowIndex, 10));
    }
    const dataEvent = this.internalRangeDataApply.emit({
      data,
      models,
      type: this.dataStore.get('type'),
    });
    if (!dataEvent.defaultPrevented) {
      this.columnService.applyRangeData(data);
    }
    this.setRange.emit(range);
  }

  /** Apply range and copy data during range application */
  private applyRangeWithData(start?: Selection.Cell, end?: Selection.Cell) {
    // no changes to apply
    if (!start || !end) {
      return;
    }

    const oldRange = this.selectionStoreService.ranged;
    const newRange = getRange(start, end);
    const columns = [...this.columnService.columns];
    const rangeData: Selection.ChangedRange = {
      type: this.dataStore.get('type'),
      newData: {},
      newRange,
      oldRange,
      newProps: slice(columns, newRange.x, newRange.x1 + 1).map(v => v.prop),
      oldProps: slice(columns, oldRange.x, oldRange.x1 + 1).map(v => v.prop),
    };

    rangeData.newData = this.columnService.getRangeData(rangeData);
    const selectionEndEvent = this.internalSelectionChanged.emit(rangeData);
    if (selectionEndEvent.defaultPrevented) {
      this.setTempRange.emit(null);
      return;
    }
    this.onRangeApply(rangeData.newData, newRange);
  }

  /** Update range selection ony, no data change (mouse selection) */
  private applyRangeOnly(start?: Selection.Cell, end?: Selection.Cell) {
    // no changes to apply
    if (!start || !end) {
      return;
    }

    const newRange = getRange(start, end);
    this.setRange.emit(newRange);
  }
}
