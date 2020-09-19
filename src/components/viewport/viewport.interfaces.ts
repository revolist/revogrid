import {ObservableMap} from '@stencil/store';

import {DataSourceState} from '../../store/dataSource/data.store';
import {RevoGrid, Selection} from '../../interfaces';

declare namespace ViewportSpace {
    type Properties = {[key: string]: any};
    type SlotType = 'content'|'header'|'footer';


    type ViewportData = {
        /** Last cell in data viewport. Indicates borders of viewport */
        lastCell: Selection.Cell;

        /** Viewport data position. Position provides connection between independent data stores and Selection store. */
        position: Selection.Cell;
        colData: RevoGrid.ColumnRegular[];

        dataStore: ObservableMap<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

        /** Stores to pass dimension data for render */
        dimensionRow: ObservableMap<RevoGrid.DimensionSettingsState>;
        dimensionCol: ObservableMap<RevoGrid.DimensionSettingsState>;
        /** Cols dataset */
        cols: RevoGrid.VirtualPositionItem[];
        /** Rows dataset */
        rows: RevoGrid.VirtualPositionItem[];

        /** Slot to put data */
        slot: SlotType;

        /** Current grid uniq Id */
        uuid: string;

        canDrag?: boolean;
        style?: {[key: string]: string};
    };
    
    type ViewportProps = {
        prop: Properties;

        /** header container props */
        headerProp: Properties;

        /** parent selector link */
        parent: string;

        /** viewport rows */
        dataPorts: ViewportData[];
    };
}

export default ViewportSpace;
