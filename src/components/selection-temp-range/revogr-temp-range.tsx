import { Component, Prop, h, Host } from "@stencil/core";
import { ObservableMap } from "@stencil/store";
import { throttle } from "lodash";
import {RevoGrid, Selection} from '../../interfaces';
import {  TMP_SELECTION_BG_CLASS } from "../../utils/consts";
import { getElStyle } from "../overlay/cellSelectionService";

@Component({
		tag: 'revogr-temp-range',
		styleUrl: 'revogr-temp-range-style.scss'
})
export class RevogrFocus {
	el: HTMLElement;

  /** Dynamic stores */
  @Prop() selectionStore: ObservableMap<Selection.SelectionStoreState>;
  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
	@Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;
  private readonly onChange = throttle((e: HTMLElement) => this.doChange(e), 300);

  private doChange(e: HTMLElement): void {
    e?.scrollIntoView({
			block: 'nearest',
			inline: 'nearest'
		});
	}

	componentDidRender(): void {
		if (this.el) {
			this.onChange(this.el);
		}
	}
	
	render() {
		const data = this.selectionStore.get('tempRange');
		if (!data) {
			return;
		}
		let directionY = 'bottom';
		let derectionX = 'right';
		const range = this.getRange();
		if (!range) {
			return;
		}
		if (data.y < range.y) {
			directionY = 'top';
		}
		if (data.x < range.x) {
			derectionX = 'left';
		}
		const style: Selection.RangeAreaCss = getElStyle(data, this.dimensionRow.state, this.dimensionCol.state);
		return <Host class={TMP_SELECTION_BG_CLASS} style={style}>
			<div class={`${derectionX} ${directionY}`} ref={(e: HTMLElement) => this.el = e}/>
		</Host>;
	}

	private getRange(): Selection.RangeArea|null {
		const range = this.selectionStore.get('range');
		if (range) {
			return range;
		}
		const focus = this.selectionStore.get('focus');
		if (!focus) {
			return null;
		}
		return {
			...focus,
			x1: focus.x,
			y1: focus.y
		};
	}
}