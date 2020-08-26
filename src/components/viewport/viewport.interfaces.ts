import {ObservableMap} from '@stencil/store';

import {
    ColumnDataSchemaRegular, DataType,
    DimensionSettingsState,
    Selection,
    VirtualPositionItem
} from '../../interfaces';
import {DataSourceState} from "../../store/dataSource/data.store";

declare namespace ViewportSpace {
    type Properties = {[key: string]: any};
    type SlotType = 'content'|'header'|'footer';


    type ViewportData = {
        /** Last cell in data viewport. Indicates borders of viewport */
        lastCell: Selection.Cell;

        /** Viewport data position. Position provides connection between independent data stores and Selection store. */
        position: Selection.Cell;
        colData: ColumnDataSchemaRegular[];
        dataStore: ObservableMap<DataSourceState<DataType>>;

        /** Stores to pass dimension data for render */
        dimensionRow: ObservableMap<DimensionSettingsState>;
        dimensionCol: ObservableMap<DimensionSettingsState>;
        /** Cols dataset */
        cols: VirtualPositionItem[];
        /** Rows dataset */
        rows: VirtualPositionItem[];

        /** Slot to put data */
        slot: SlotType;

        /** Current grid uniq Id */
        uuid: string;
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