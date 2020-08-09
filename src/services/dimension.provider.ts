import {setViewPortDimension} from '../store/viewPort/viewport.store';
import {setDimensionSize} from '../store/dimension/dimension.store';
import {
    MultiDimensionType,
    ViewSettingSizeProp
} from '../interfaces';

class DimensionProvider {
    setSize(dimensionType: MultiDimensionType, sizes: ViewSettingSizeProp): void {
        setDimensionSize(sizes, dimensionType);
        setViewPortDimension(sizes, dimensionType);
    }
}

const dimensionProvider: DimensionProvider = new DimensionProvider();
export default dimensionProvider;