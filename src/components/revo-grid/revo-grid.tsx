import {Component, Prop, h, Watch, Element} from '@stencil/core';


import {setData, setColumn} from '../../store/data.store';
import {setDimensionSize, setSettings} from '../../store/dimension.store';
import {setViewport} from '../../store/viewport.store';
import {ColumnData, DataType, InitialSettings, MultiDimensionAction} from "../../interfaces";
import HeaderResize from "../../modules/headerResize";
import CellSelection from "../../modules/cellSelection";
import GridResize from "../../modules/gridResize";
import moduleRegister from "../../modules/moduleRegister";
import {CELL_CLASS, HEADER_CLASS, UUID, VIEWPORT_CLASS} from "../data/cellConsts";


const initialSettings: InitialSettings = {
  defaultColumnSize: 80,
  defaultRowSize: 30,
  frameSize: 2,
  dimensions: undefined
};

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGrid {
  private viewport: HTMLRevogrViewportScrollableElement;
  private uuid: number|null = null;

  @Element() element: HTMLElement;

  @Prop() dimensions: Partial<MultiDimensionAction> = {};
  @Prop() settings: InitialSettings = initialSettings;
  @Watch('settings')
  onSettingsChange(newVal: InitialSettings, oldVal?: Partial<InitialSettings>): void {
    if (!oldVal || newVal.frameSize !== oldVal.frameSize) {
      setViewport({ frameOffset: newVal.frameSize || 0 }, 'row');
      setViewport({ frameOffset: newVal.frameSize || 0 }, 'col');
    }

    if (!oldVal || newVal.defaultRowSize !== oldVal.defaultRowSize) {
      setSettings(this.settings.defaultRowSize, 'row');
    }
    if (!oldVal || newVal.defaultColumnSize !== oldVal.defaultColumnSize) {
      setSettings(this.settings.defaultColumnSize, 'col');
    }
  }

  // data is array of objects
  @Prop() source: DataType[] = [];
  @Watch('source')
  dataChanged(newVal: DataType[]): void {
    setData(newVal);
  }

  // if source provided as object header 'prop' will link to the object field
  @Prop() columns: ColumnData = [];
  @Watch('columns')
  columnChanged(newVal: ColumnData) {
    setColumn(newVal);
  }

  async componentWillLoad(): Promise<void> {
    this.uuid = (new Date()).getTime();
    this.onSettingsChange(this.settings);
    setDimensionSize(this.dimensions.row, 'row');
    setDimensionSize(this.dimensions.col, 'col');
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
  }

  async componentDidLoad(): Promise<void> {
    moduleRegister.register('resize',
        new GridResize(this.element, this.viewport));
    moduleRegister.register('headResize',
        new HeaderResize(`.${VIEWPORT_CLASS}[${UUID}='${this.uuid}'] .${HEADER_CLASS}`));
    moduleRegister.register('cellSelection',
        new CellSelection(`.${VIEWPORT_CLASS}[${UUID}='${this.uuid}'] .${CELL_CLASS}`));
  }

  componentDidUnload(): void {
    moduleRegister.destroy();
  }

  render() {
    const viewportProp = {
      class: `viewport ${VIEWPORT_CLASS}`,
      [`${UUID}`]: this.uuid,
      ref: (el: HTMLRevogrViewportScrollableElement) => { this.viewport = el; }
    };
    return <revogr-viewport-scrollable{...viewportProp}>
      <revogr-header slot='header' class='header'/>
      <revogr-data slot='content' class='viewport-layer'/>
      <revogr-overlay-selection slot='content'/>
    </revogr-viewport-scrollable>;
  }
}
