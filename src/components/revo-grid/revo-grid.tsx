import {Component, Prop, h, Watch, Element} from '@stencil/core';

import {setData, setColumn} from '../../store/data.store';
import {setDimensionSize, setSettings} from '../../store/dimension.store';
import {setViewport} from '../../store/viewport.store';


const initialSettings: InputSettings = {
  defaultColumnSize: 80,
  defaultRowSize: 30,
  frameSize: 10,
  dimensions: undefined
};

@Component({
  tag: 'revo-grid',
  styleUrl: 'revo-grid.scss'
})
export class RevoGrid {
  private resizeObserver: ResizeObserver;
  private viewport: HTMLRevogrViewportScrollableElement;

  @Element() element: HTMLElement;

  @Prop() dimensions: Partial<MultiDimensionAction> = {};
  @Prop() settings: InputSettings = initialSettings;
  @Watch('settings')
  onSettingsChange(newVal: InputSettings, oldVal?: Partial<InputSettings>): void {
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
    this.onSettingsChange(this.settings);
    setDimensionSize(this.dimensions.row, 'row');
    setDimensionSize(this.dimensions.col, 'col');
    this.columnChanged(this.columns);
    this.dataChanged(this.source);
	}

  async componentDidLoad(): Promise<void> {
    if (!('ResizeObserver' in window)) {
      // Loads polyfill asynchronously, only if required.
      const module = await import('@juggle/resize-observer');
      window.ResizeObserver = (module.ResizeObserver as unknown as typeof ResizeObserver);
    }
    this.resizeObserver = new ResizeObserver(async() => {
      setViewport({ virtualSize: this.element.clientHeight }, 'row');
      setViewport({ virtualSize: this.element.clientWidth }, 'col');
      await this.viewport.scrollX();
      await this.viewport.scrollY();
    });

    this.resizeObserver.observe(this.element);
  }

  componentDidUnload(): void {
    this.resizeObserver?.disconnect();
  }

  render() {
    return <revogr-viewport-scrollable class='viewport' ref={(el: HTMLRevogrViewportScrollableElement) => { this.viewport = el; }}>
      <revogr-header slot='header' class='header'/>
      <revogr-data slot='content' class={'viewport-layer'}/>
    </revogr-viewport-scrollable>;
  }
}
