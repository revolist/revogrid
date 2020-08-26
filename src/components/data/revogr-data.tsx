import {Component, Element, Event, EventEmitter, h, Host, Listen, Prop, State, Watch} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService from './columnService';
import {CELL_CLASS, DATA_COL, DATA_ROW, DISABLED_CLASS, UUID} from '../../utils/consts';
import {
  ColumnDataSchemaRegular,
  DataType,
  DimensionSettingsState,
  Edition,
  Selection,
  VirtualPositionItem
} from '../../interfaces';
import {DataSourceState} from '../../store/dataSource/data.store';

@Component({
  tag: 'revogr-data'
})
export class RevogrData {
  @Element() element!: HTMLStencilElement;

  @State() columnService: ColumnService;
  @Prop() dataStore: ObservableMap<DataSourceState<DataType>>;
  @Prop() selectionStoreConnector: Selection.SelectionStoreConnectorI;

  @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
  @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;

  @Prop() readonly: boolean;
  @Prop() range: boolean;

  @Prop() rows: VirtualPositionItem[];
  @Prop() cols: VirtualPositionItem[];
  @Prop() lastCell: Selection.Cell;
  @Prop() position: Selection.Cell;
  @Prop() uuid: string = '';

  @Prop() colData: ColumnDataSchemaRegular[];
  @Watch('colData') colChanged(newData: ColumnDataSchemaRegular[]): void {
    this.columnService.columns = newData;
  }

  @Event() afterEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Event() beforeEdit: EventEmitter<Edition.BeforeSaveDataDetails>;
  @Listen('cellEdit')
  onSave(e: CustomEvent<Edition.SaveDataDetails>): void {
    e.cancelBubble = true;
    const dataToSave = this.columnService.getSaveData(e.detail.row, e.detail.col, e.detail.val);
    const beforeEdit: CustomEvent<Edition.BeforeSaveDataDetails> = this.beforeEdit.emit(dataToSave);
    // apply data
    setTimeout(() => {
      if (!beforeEdit.defaultPrevented) {
        this.columnService.setCellData(e.detail.row, e.detail.col, e.detail.val);
        this.afterEdit.emit(dataToSave);
      }
    });
  }

  connectedCallback(): void {
    this.columnService = new ColumnService(this.dataStore, this.colData);
  }

  render() {
    if (!this.colData || !this.rows.length || !this.cols.length) {
      return '';
    }
    const rowsEls: HTMLElement[] = [];
    for (let row of this.rows) {
      const cells: HTMLElement[] = [];
      for (let col of this.cols) {
        const dataProps = {
          [DATA_COL]: col.itemIndex,
          [DATA_ROW]: row.itemIndex,
          class: `${CELL_CLASS} ${this.columnService.isReadOnly(row.itemIndex, col.itemIndex) ? DISABLED_CLASS : ''}`,
          style: {width: `${col.size}px`, transform: `translateX(${col.start}px)`}
        };
        cells.push(<div {...dataProps}>{this.columnService.cellRenderer(row.itemIndex, col.itemIndex)}</div>);
      }
      rowsEls.push(<div class='row' style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}>{cells}</div>);
    }
    const uuid = `${this.uuid}-${this.position.x}-${this.position.y}`;
    const parent: string = `[${UUID}="${uuid}"]`;
    const hostProp = { [`${UUID}`]: uuid };
    if (!this.readonly || this.range) {
        rowsEls.push(
            <revogr-overlay-selection
              slot='content'
              selectionStoreConnector={this.selectionStoreConnector}
              readonly={this.readonly}
              columnService={this.columnService}
              dimensionCol={this.dimensionCol}
              dimensionRow={this.dimensionRow}
              lastCell={this.lastCell}
              position={this.position}
              parent={parent}/>
        );
    }
    return <Host {...hostProp}>{rowsEls}</Host>;
  }
}
