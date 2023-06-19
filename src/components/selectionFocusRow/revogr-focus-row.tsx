import { Component, Host, Prop, h } from '@stencil/core';
import { Observable, Selection, RevoGrid } from '../../interfaces';
import { getElStyle } from '../overlay/selection.utils';

/**
 * Separate component for focus selection on row
 * It's required to prevent extra renders on main component
 */
@Component({
  tag: 'revogr-focus-row',
  styleUrl: 'revogr-focus-row.scss',
})
export class RevogrFocusRow {
  @Prop() selectionStore!: Observable<Selection.SelectionStoreState>;

  /**
   * Dimension row store
   */
  @Prop() dimensionRow!: Observable<RevoGrid.DimensionSettingsState>;
  /**
   * Dimension column store
   */
  @Prop() dimensionCol!: Observable<RevoGrid.DimensionSettingsState>;

  render() {
    const range = this.selectionStore?.get('range');

    if (!range) {
      return;
    }
    const style = getElStyle(range, this.dimensionRow.state, this.dimensionCol.state);
    delete style.width;
    delete style.left;
    return (
      <Host style={style} />
    );
  }
}
