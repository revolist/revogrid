import {ObservableMap} from '@stencil/store';

import {DataSourceState, Groups} from '../../store/dataSource/data.store';
import {RevoGrid, Selection} from '../../interfaces';

declare namespace ViewportSpace {
    type Properties = {[key: string]: any};
    type SlotType = 'content'|'header'|'footer';

    type HeaderProperties = {
        parent: string;
        colData: RevoGrid.ColumnRegular[];
        dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;
        groups: Groups;
        groupingDepth: number;
        onHeaderResize?(e: CustomEvent<RevoGrid.ViewSettingSizeProp>): void;
    };


    type ViewportData = {
        /** Last cell in data viewport. Indicates borders of viewport */
        lastCell: Selection.Cell;

        /** Viewport data position. Position provides connection between independent data stores and Selection store. */
        position: Selection.Cell;
        colData: ObservableMap<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;

        dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

        /** Stores to pass dimension data for render */
        dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
        dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;
        /** Cols dataset */
        viewportCol:  ObservableMap<RevoGrid.ViewportState>;
        /** Rows dataset */
        viewportRow: ObservableMap<RevoGrid.ViewportState>;

        /** Slot to put data */
        slot: SlotType;

        /** Current grid uniq Id */
        uuid: string;

        type: RevoGrid.DimensionRows;

        canDrag?: boolean;
        style?: {[key: string]: string};
    };
    
    type ViewportProps = {
        prop: Properties;
        position: Selection.Cell;
        /** Cols dataset */
        viewportCol:  ObservableMap<RevoGrid.ViewportState>;

        /** header container props */
        headerProp: Properties;

        /** parent selector link */
        parent: string;

        /** viewport rows */
        dataPorts: ViewportData[];
    };
}

export {ViewportSpace};
