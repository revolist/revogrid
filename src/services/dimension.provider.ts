import {setViewPortDimension} from '../store/viewport.store';
import {DimensionType, ViewSettingSizeProp} from '../interfaces';
import {setDimensionSize} from '../store/dimension.store';

class DimensionProvider {
    setSize(sizes: ViewSettingSizeProp, dimensionType: DimensionType): void {
        setDimensionSize(sizes, dimensionType);
        setViewPortDimension(sizes, dimensionType);
    }
}

const dimensionProvider: DimensionProvider = new DimensionProvider();
export default dimensionProvider;