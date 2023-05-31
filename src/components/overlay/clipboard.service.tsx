import { h } from '@stencil/core';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { Observable, RevoGrid, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';
import ColumnService from '../data/columnService';
import { DataSourceState } from '../../store/dataSource/data.store';

type Config = {
  selectionStoreService: SelectionStoreService;
  columnService: ColumnService;
  dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;
  rangeApply(data: RevoGrid.DataLookup, range: Selection.RangeArea): void;
  rangeCopy(range: Selection.RangeArea): any;
  rangeClear(): void;
  beforeCopy(range: Selection.RangeArea): CustomEvent;
  beforePaste(data: RevoGrid.DataLookup, range: Selection.RangeArea): CustomEvent;
};

export class ClipboardService {
  private clipboard: HTMLRevogrClipboardElement;
  constructor(private sv: Config) {}

  renderClipboard(readonly = false) {
    return <revogr-clipboard
      readonly={readonly}
      onCopyRegion={e => this.onCopy(e.detail)}
      onClearRegion={() => this.sv.rangeClear()}
      ref={e => (this.clipboard = e)}
      onPasteRegion={e => this.onPaste(e.detail)} />;
  }
  private getRegion() {
    const focus = this.sv.selectionStoreService.focused;
    let range = this.sv.selectionStoreService.ranged;
    if (!range) {
      range = getRange(focus, focus);
    }
    return range;
  }
  private onCopy(e: DataTransfer) {
    const range = this.getRegion();
    const canCopyEvent = this.sv.beforeCopy(range);
    if (canCopyEvent.defaultPrevented) {
      return false;
    }
    const data = this.sv.rangeCopy(range);
    this.clipboard.doCopy(e, data);
    return true;
  }

  private onPaste(data: string[][]) {
    const focus = this.sv.selectionStoreService.focused;
    const isEditing = this.sv.selectionStoreService.edited !== null;
    if (!focus || isEditing) {
      return;
    }
    let { changed, range } = this.sv.columnService.getTransformedDataToApply(focus, data);
    const { defaultPrevented: canPaste } = this.sv.beforePaste(changed, range);
    if (canPaste) {
      return;
    }
    this.sv.rangeApply(changed, range);
  }
}
