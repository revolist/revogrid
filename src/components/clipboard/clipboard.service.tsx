import { h } from '@stencil/core';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { getRange } from '../../store/selection/selection.helpers';
import ColumnService from '../data/column.service';
import { DSourceState } from '../../store/dataSource/data.store';
import { DimensionRows } from '../../types/dimension';
import { Observable, DataType, DataLookup } from '../../types/interfaces';
import { RangeArea } from '../../types/selection';

type Config = {
  selectionStoreService: SelectionStoreService;
  columnService: ColumnService;
  dataStore: Observable<DSourceState<DataType, DimensionRows>>;
  rangeApply(data: DataLookup, range: RangeArea): void;
  rangeCopy(range: RangeArea): any;
  rangeClear(): void;
  beforeCopy(range: RangeArea): CustomEvent;
  beforePaste(data: DataLookup, range: RangeArea): CustomEvent;
};

export class ClipboardService {
  private clipboard: HTMLRevogrClipboardElement;
  constructor(private sv: Config) {}

  renderClipboard(readonly = false) {
    return <revogr-clipboard
      readonly={readonly}
      onCopyregion={e => this.onCopy(e.detail)}
      onClearregion={() => this.sv.rangeClear()}
      ref={e => (this.clipboard = e)}
      onPasteregion={e => this.onPaste(e.detail)} />;
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
