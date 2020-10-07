import { Component, Prop, h, Host, Element } from "@stencil/core";
import { ObservableMap } from "@stencil/store";
import {RevoGrid, Selection} from '../../interfaces';
import { FOCUS_CLASS } from "../../utils/consts";
import CellSelectionService from "../overlay/cellSelectionService";

@Component({
		tag: 'revogr-focus',
		styleUrl: 'revogr-focus-style.scss'
})
export class RevogrFocus {
	@Element() el: HTMLElement;

  /** Dynamic stores */
  @Prop() selectionStore: ObservableMap<Selection.SelectionStoreState>;
  @Prop() dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
	@Prop() dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;

  private focusChanged(e: HTMLElement): void {
    e?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
	}

	componentDidRender(): void {
		this.el && this.focusChanged(this.el);
	}
	
	render() {
		const selectionFocus = this.selectionStore.get('focus');
		let focusStyle: Partial<Selection.RangeAreaCss> = {};
		if (selectionFocus) {
				focusStyle = CellSelectionService.getElStyle({
						...selectionFocus,
						x1: selectionFocus.x,
						y1: selectionFocus.y
					}, this.dimensionRow.state, this.dimensionCol.state
				);
				return <Host class={FOCUS_CLASS} style={focusStyle} ref={(e: HTMLElement) => this.focusChanged(e)}/>;
		}
	}
}