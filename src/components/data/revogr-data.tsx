import {Component, Element, h, Listen, Prop, State, Watch} from '@stencil/core';
import {HTMLStencilElement} from '@stencil/core/internal';
import {ObservableMap} from '@stencil/store';

import ColumnService, {ColumnServiceI} from './columnService';
import {CELL_CLASS, DATA_COL, DATA_ROW, DISABLED_CLASS} from '../../utils/consts';
import {
  ColumnDataSchemaRegular,
  DimensionSettingsState,
  Edition,
  Selection,
  VirtualPositionItem
} from '../../interfaces';

@Component({
  tag: 'revogr-data'
})
export class RevogrData {
  @Element() element!: HTMLStencilElement;

  @Prop() readonly: boolean;
  @Prop() range: boolean;

  @Prop() rows: VirtualPositionItem[];
  @Prop() cols: VirtualPositionItem[];
  @Prop() lastCell: Selection.Cell;
  @Prop() position: Selection.Cell;
  @Prop() parent: string = '';

  @Prop() dimensionRow: ObservableMap<DimensionSettingsState>;
  @Prop() dimensionCol: ObservableMap<DimensionSettingsState>;

  @Prop() colData: ColumnDataSchemaRegular[];
  @Watch('colData') colChanged(newData: ColumnDataSchemaRegular[]): void {
    this.columnService.columns = newData;
  }

  @Listen('beforeEdit')
  onSave(e: CustomEvent<Edition.SaveDataDetails>): void {
    if (!e.defaultPrevented) {
      this.columnService.setCellData(e.detail.row, e.detail.col, e.detail.val);
    }
  }

  @State() columnService: ColumnServiceI;

  connectedCallback(): void {
    this.columnService = new ColumnService(this.colData);
  }

  render() {
    if (!this.colData) {
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

    if (!this.readonly || this.range) {
        rowsEls.push(
            <revogr-overlay-selection
              slot='content'
              readonly={this.readonly}
              columnService={this.columnService}
              dimensionCol={this.dimensionCol}
              dimensionRow={this.dimensionRow}
              lastCell={this.lastCell}
              position={this.position}
              parent={this.parent}/>
        );
    }
    return rowsEls;
  }
}
