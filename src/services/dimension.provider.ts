import {setViewport, setViewPortCoordinate, setViewPortDimension} from '../store/viewPort/viewport.store';
import {getCurrentState, setDimensionSize, setRealSize} from '../store/dimension/dimension.store';
import {
    ColumnDataSchemaRegular, DataType, DimensionSettingsState,
    MultiDimensionType,
    ViewSettingSizeProp
} from '../interfaces';

class DimensionProvider {
    setDimensionSize(dimensionType: MultiDimensionType, sizes: ViewSettingSizeProp): void {
        setDimensionSize(sizes, dimensionType);
        setViewPortDimension(sizes, dimensionType);
    }

    setRealSize(items: ColumnDataSchemaRegular[]|DataType[], type: MultiDimensionType): void {
        const realCount: number = items.length;
        setViewport({ realCount }, type);
        setRealSize(realCount, type );
    }

    setPins(items: ColumnDataSchemaRegular[]|DataType[], type: MultiDimensionType, pinSizes?: ViewSettingSizeProp): void {
        const realCount = items.length;
        setRealSize(realCount, type);
        setDimensionSize(pinSizes, type);

        const dimension: DimensionSettingsState = getCurrentState(type);
        setViewport({ realCount, virtualSize: dimension.realSize }, type);
        setViewPortCoordinate(0, type, dimension);
    }
}

const dimensionProvider: DimensionProvider = new DimensionProvider();
export default dimensionProvider;