import slice from 'lodash/slice';
import { EventEmitter, h } from '@stencil/core';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';
import ColumnService from '../data/columnService';
import { DataSourceState } from '../../store/dataSource/data.store';

export abstract class ClipboardService {
  protected abstract selectionStoreService: SelectionStoreService;
  protected abstract columnService: ColumnService;
  abstract onRangeApply(data: RevoGrid.DataLookup, range: Selection.RangeArea): void;
  abstract dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;
  abstract internalCopy: EventEmitter;

  private clipboard: HTMLRevogrClipboardElement;
  private onCopy(e: DataTransfer) {
    const canCopy = this.internalCopy.emit();
    if (canCopy.defaultPrevented) {
      return false;
    }
    let focus = this.selectionStoreService.focused;
    let range = this.selectionStoreService.ranged;
    let data: RevoGrid.DataFormat[][];
    if (!range) {
      range = getRange(focus, focus);
    }
    if (range) {
      const columns = [...this.columnService.columns];
      const props = slice(columns, range.x, range.x1 + 1).map(v => v.prop);
      data = this.columnService.copyRangeArray(range, props, this.dataStore);
    }
    this.clipboard.doCopy(e, data);
    return true;
  }

  renderClipboard() {
    return <revogr-clipboard onCopyRegion={e => this.onCopy(e.detail)} ref={e => (this.clipboard = e)} onPasteRegion={e => this.onPaste(e.detail)} />;
  }

  private onPaste(data: string[][]) {
    const focus = this.selectionStoreService.focused;
    const isEditing = this.selectionStoreService.edited !== null;
    if (!focus || isEditing) {
      return;
    }
    const { changed, range } = this.columnService.getTransformedDataToApply(focus, data);
    this.onRangeApply(changed, range);
  }
}
