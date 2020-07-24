import {Component, Prop, h, Watch, Element} from '@stencil/core';


import {setData, setColumn} from '../../store/data.store';
import {setSettings} from '../../store/dimension.store';
import {setViewport} from '../../store/viewport.store';
import {ColumnData, DataType, InitialSettings, MultiDimensionAction} from '../../interfaces';
import GridResize from '../../services/gridResize';
import moduleRegister from '../../services/moduleRegister';
import {UUID, VIEWPORT_CLASS} from '../data/cellConsts';
import dimensionProvider from '../../services/dimension.provider';


const initialSettings: InitialSettings = {
  defaultColumnSize: 80,
  defaultRowSize: 30,
  frameSize: 0,
  dimensions: undefined,
  readonly: true,
  range: false
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
  @Prop() settings: InitialSettings = {...initialSettings};
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

  connectedCallback(): void {
    this.uuid = (new Date()).getTime();
    moduleRegister.baseClass = `.${VIEWPORT_CLASS}[${UUID}='${this.uuid}']`;
    this.onSettingsChange(this.settings);
    dimensionProvider.setSize(this.dimensions.row, 'row');
    dimensionProvider.setSize(this.dimensions.col, 'col');
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
  }

  async componentDidLoad(): Promise<void> {
    moduleRegister.register('resize', new GridResize(this.element, this.viewport));
  }

  disconnectedCallback(): void {
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
      {
        !this.settings.readonly || this.settings.range ?
            <revogr-overlay-selection slot='content' range={this.settings.range}/> : ''
      }
      {
        !this.settings.readonly ? <revogr-edit slot='content'/> : ''
      }
    </revogr-viewport-scrollable>;
  }
}
