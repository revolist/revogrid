import slice from 'lodash/slice';
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
  onRangeApply(data: RevoGrid.DataLookup, range: Selection.RangeArea): void;
  internalCopy(): Event;
};

export class ClipboardService {
  private clipboard: HTMLRevogrClipboardElement;
  constructor(private sv: Config) {}
  private onCopy(e: DataTransfer) {
    console.log("onCopy",e)
    const canCopy = this.sv.internalCopy();
    if (canCopy.defaultPrevented) {
      return false;
    }
    let focus = this.sv.selectionStoreService.focused;
    let range = this.sv.selectionStoreService.ranged;
    let data: RevoGrid.DataFormat[][];
    if (!range) {
      range = getRange(focus, focus);
    }
    if (range) {
      const columns = [...this.sv.columnService.columns];
      const props = slice(columns, range.x, range.x1 + 1).map(v => v.prop);
      data = this.sv.columnService.copyRangeArray(range, props, this.sv.dataStore);
    }
    this.clipboard.doCopy(e, data);
    return true;
  }

  renderClipboard() {
    return <revogr-clipboard onCopyRegion={e => this.onCopy(e.detail)} ref={e => (this.clipboard = e)} onPasteRegion={e => this.onPaste(e.detail)} />;
  }

  private onPaste(data: string[][]) {
    console.log("onPaste",data)
    
    for (let index = 0; index < data.length; index++) {
      const _array = data[index];
      console.log("onPaste _array",_array);
      for (let index = 0; index < _array.length; index++) {
        let value = _array[index];
        console.log("onPaste _array value",value);
        let reg = /[ a-zA-Z0-9ｧ-ﾝﾞﾟ\-]+/g;
        
        let res = reg.exec(value);
        console.log("getSaveData-zhengze res",res);
        if (typeof res == null) {
          value = undefined
        }else{
          value = res[0]
        }
      }
    }

    const focus = this.sv.selectionStoreService.focused;
    const isEditing = this.sv.selectionStoreService.edited !== null;
    if (!focus || isEditing) {
      return;
    }
    const { changed, range } = this.sv.columnService.getTransformedDataToApply(focus, data);
    this.sv.onRangeApply(changed, range);
  }
}
