import debounce from 'lodash/debounce';
import { DebouncedFunc } from 'lodash';
import each from 'lodash/each';

import { h } from '@stencil/core';
import { CELL_HANDLER_CLASS } from '../../utils/consts';
import { Observable, Selection, RevoGrid, Edition } from '../../interfaces';
import { EventData, getCell, getCurrentCell, getDirectionCoordinate, getLargestAxis, isAfterLast } from './selection.utils';
import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import ColumnService from '../data/columnService';
import { DataSourceState, getSourceItem } from '../../store/dataSource/data.store';

type Config = {
  selectionStoreService: SelectionStoreService;
  dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
  dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
  columnService: ColumnService;
  dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

  setTempRange(e: Selection.TempRange | null): Event;
  internalSelectionChanged(e: Selection.ChangedRange): Event;
  internalRangeDataApply(e: Edition.BeforeRangeSaveDataDetails): Event;
  setRange(e: Selection.RangeArea): Event;

  getData(): any;
};

enum AutoFillType {
  selection = 'Selection',
  autoFill = 'AutoFill',
}

export class AutoFillService {
  private autoFillType: AutoFillType | null = null;
  private autoFillInitial: Selection.Cell | null = null;
  private autoFillStart: Selection.Cell | null = null;
  private autoFillLast: Selection.Cell | null = null;

  private onMouseMoveAutofill: DebouncedFunc<(e: MouseEvent, data: EventData) => void>;

  constructor(private sv: Config) {}

  /**
   * Render autofill box
   * @param range
   * @param selectionFocus
   */
  renderAutofill(range: Selection.RangeArea, selectionFocus: Selection.Cell) {
    let handlerStyle;
    if (range) {
      handlerStyle = getCell(range, this.sv.dimensionRow.state, this.sv.dimensionCol.state);
    } else {
      handlerStyle = getCell(
        {
          ...selectionFocus,
          x1: selectionFocus.x,
          y1: selectionFocus.y,
        },
        this.sv.dimensionRow.state,
        this.sv.dimensionCol.state,
      );
    }
    return (
      <div
        class={CELL_HANDLER_CLASS}
        style={{ left: `${handlerStyle.right}px`, top: `${handlerStyle.bottom}px` }}
        onMouseDown={(e: MouseEvent) => this.selectionStart(e, this.sv.getData(), AutoFillType.autoFill)}
      />
    );
  }

  get isAutoFill() {
    return !!this.autoFillType;
  }

  /** Process mouse move events */
  selectionMouseMove(e: MouseEvent) {
    // initiate mouse move debounce if not present
    if (!this.onMouseMoveAutofill) {
      this.onMouseMoveAutofill = debounce((e: MouseEvent, data: EventData) => this.doAutofillMouseMove(e, data), 5);
    }
    if (this.isAutoFill) {
      this.onMouseMoveAutofill(e, this.sv.getData());
    }
  }

  private getFocus() {
    let focus = this.sv.selectionStoreService.focused;
    const range = this.sv.selectionStoreService.ranged;
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
    this.sv.setTempRange({
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
  selectionStart(e: MouseEvent, data: EventData, type = AutoFillType.selection) {
    /** Get cell by autofill element */
    const { top, left } = (e.target as HTMLElement).getBoundingClientRect();
    this.autoFillInitial = this.getFocus();
    this.autoFillType = type;
    this.autoFillStart = getCurrentCell({ x: left, y: top }, data);
    e.preventDefault();
  }

  /** Clear current range selection */
  clearAutoFillSelection() {
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
      models[rowIndex] = getSourceItem(this.sv.dataStore, parseInt(rowIndex, 10));
    }
    const dataEvent = this.sv.internalRangeDataApply({
      data,
      models,
      type: this.sv.dataStore.get('type'),
    });
    if (!dataEvent.defaultPrevented) {
      this.sv.columnService.applyRangeData(data);
    }
    this.sv.setRange(range);
  }

  /** Apply range and copy data during range application */
  private applyRangeWithData(start?: Selection.Cell, end?: Selection.Cell) {
    // no changes to apply
    if (!start || !end) {
      return;
    }

    const oldRange = this.sv.selectionStoreService.ranged;
    const newRange = getRange(start, end);
    const rangeData: Selection.ChangedRange = {
      type: this.sv.dataStore.get('type'),
      newData: {},
      mapping: {},
      newRange,
      oldRange,
    };
    const { mapping, changed } = this.sv.columnService.getRangeData(rangeData, this.sv.columnService.columns);
    rangeData.newData = changed;
    rangeData.mapping = mapping;
    const selectionEndEvent = this.sv.internalSelectionChanged(rangeData);
    if (selectionEndEvent.defaultPrevented) {
      this.sv.setTempRange(null);
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
    this.sv.setRange(newRange);
  }
}
