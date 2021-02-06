import {DataSourceState, Groups} from '../../store/dataSource/data.store';
import {Observable, RevoGrid, Selection} from '../../interfaces';

declare namespace ViewportSpace {
    type Properties = {[key: string]: any};
    type SlotType = 'content'|'header'|'footer';

    type HeaderProperties = {
        parent: string;
        colData: RevoGrid.ColumnRegular[];
        dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
        groups: Groups;
        groupingDepth: number;
        onHeaderResize?(e: CustomEvent<RevoGrid.ViewSettingSizeProp>): void;
    };


    type ViewportData = {
        /** Last cell in data viewport. Indicates borders of viewport */
        lastCell: Selection.Cell;

        /** Viewport data position. Position provides connection between independent data stores and Selection store. */
        position: Selection.Cell;
        colData: Observable<DataSourceState<RevoGrid.ColumnRegular, RevoGrid.DimensionCols>>;

        dataStore: Observable<DataSourceState<RevoGrid.DataType, RevoGrid.DimensionRows>>;

        /** Stores to pass dimension data for render */
        dimensionRow: Observable<RevoGrid.DimensionSettingsState>;
        dimensionCol: Observable<RevoGrid.DimensionSettingsState>;
        /** Cols dataset */
        viewportCol:  Observable<RevoGrid.ViewportState>;
        /** Rows dataset */
        viewportRow: Observable<RevoGrid.ViewportState>;

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
        viewportCol:  Observable<RevoGrid.ViewportState>;

        /** header container props */
        headerProp: Properties;

        /** parent selector link */
        parent: string;

        /** viewport rows */
        dataPorts: ViewportData[];
    };
}

export {ViewportSpace};
