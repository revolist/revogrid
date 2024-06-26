import { MultiDimensionType } from '@type';
import { ViewportStore } from './viewport.store';

export * from './viewport.store';
export * from './viewport.helpers';

export type ViewportStoreCollection = {
    [T in MultiDimensionType]: ViewportStore;
};
