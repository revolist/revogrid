import { Component, Prop, h, Host, Element } from "@stencil/core";
import { ObservableMap } from "@stencil/store";
import {RevoGrid, Selection} from '../../interfaces';
import { FOCUS_CLASS } from "../../utils/consts";
import { getElStyle } from "../overlay/cellSelectionService";

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

  private changed(e: HTMLElement): void {
    e?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
      });
	}

	componentDidRender(): void {
		this.el && this.changed(this.el);
	}
	
	render() {
		const data = this.selectionStore.get('focus');
		if (data) {
				const style = getElStyle({
						...data,
						x1: data.x,
						y1: data.y
					}, this.dimensionRow.state, this.dimensionCol.state
				);
				return <Host class={FOCUS_CLASS} style={style}/>;
		}
	}
}