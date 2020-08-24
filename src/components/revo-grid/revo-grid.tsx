import {Component, Prop, h, Watch, Element} from '@stencil/core';

import {setSettings} from '../../store/dimension/dimension.store';
import {
  ColumnData,
  DataType
} from '../../interfaces';
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
    dataProvider.setData(newVal, 'row');
  }

  @Prop() pinnedTopSource: DataType[] = [];
  @Watch('pinnedTopSource')
  dataTopChanged(newVal: DataType[]) {
    dataProvider.setData(newVal, 'rowPinStart');
  }

  @Prop() pinnedBottomSource: DataType[] = [];
  @Watch('pinnedBottomSource')
  dataBottomChanged(newVal: DataType[]) {
    dataProvider.setData(newVal, 'rowPinEnd');
  }

  @Prop() columns: ColumnData = [];
  @Watch('columns')
  columnChanged(newVal: ColumnData) {
    columnProvider.setColumns(newVal);
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
    this.dataTopChanged(this.pinnedTopSource);
    this.dataBottomChanged(this.pinnedBottomSource);
  }

  render() {
    return <revogr-viewport uuid={this.uuid} resize={this.resize} readonly={this.readonly} range={this.range}/>;
  }
}
