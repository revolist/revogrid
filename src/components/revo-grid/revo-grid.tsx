import {Component, Prop, h, Watch, Element, Listen} from '@stencil/core';

import {setSettings} from '../../store/dimension/dimension.store';
import {
  ColumnData,
  DataType,
  Edition
} from '../../interfaces';
import moduleRegister from '../../services/moduleRegister';
import dataProvider from '../../services/data.provider';
import initialSettings from '../../utils/initialSettings';
import columnProvider from '../../services/column.data.provider';


@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGrid {
  private uuid: string|null = null;

  @Element() element: HTMLElement;

  @Prop() frameSize: number = initialSettings.frameSize;
  @Prop() rowSize: number = initialSettings.defaultRowSize;
  @Prop() colSize: number = initialSettings.defaultColumnSize;
  @Prop() range: boolean = initialSettings.range;
  @Prop() readonly: boolean = initialSettings.readonly;
  @Prop() resize: boolean = initialSettings.resize;

  // data is array of objects
  @Prop() source: DataType[] = [];
  @Watch('source')
  dataChanged(newVal: DataType[]): void {
    dataProvider.setData(newVal);
  }

  // if source provided as object header 'prop' will link to the object field
  @Prop() columns: ColumnData = [];
  @Watch('columns')
  columnChanged(newVal: ColumnData) {
    columnProvider.setColumns(newVal);
  }

  @Listen('beforeEdit')
  beforeSave(e: CustomEvent<Edition.SaveDataDetails>): void {
    setTimeout(() => {
      if (!e.defaultPrevented) {
        dataProvider.setCellData(e.detail.row, e.detail.col, e.detail.val);
      }
    }, 0);
  }

  connectedCallback(): void {
    this.uuid = (new Date()).getTime().toString();
    setSettings({
      originItemSize: this.rowSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'row');
    setSettings({
      originItemSize: this.colSize,
      frameOffset: this.frameSize || initialSettings.frameSize
    }, 'col');

    this.columnChanged(this.columns);
    this.dataChanged(this.source);
  }

  disconnectedCallback(): void {
    moduleRegister.destroy();
  }

  render() {
    return <revogr-viewport uuid={this.uuid} resize={this.resize} readonly={this.readonly} range={this.range}/>;
  }
}
