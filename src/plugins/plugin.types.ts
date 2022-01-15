import ColumnDataProvider from '../services/column.data.provider';
import { DataProvider } from '../services/data.provider';
import DimensionProvider from '../services/dimension.provider';
import SelectionStoreConnector from '../services/selection.store.connector';
import ViewportProvider from '../services/viewport.provider';
export type PluginProviders = {
    data: DataProvider;
    dimension: DimensionProvider;
    selection: SelectionStoreConnector;
    column: ColumnDataProvider;
    viewport: ViewportProvider;
};
