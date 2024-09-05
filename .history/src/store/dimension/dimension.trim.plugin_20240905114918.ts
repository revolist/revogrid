import { DimensionSettingsState } from '@type';
import { Observable, PluginSubscribe } from '../../utils';
/**
 * Plugin for trimming
 * 
 * 1.a. Retrieves the previous sizes value. Saves the resulting trimmed data as a new sizes value.
 * 1.b. Stores a reference to the trimmed data to prevent further changes.
 * 2. Removes multiple and shifts the data based on the trimmed value.
 */
export const trimmedPlugin = (storeService: {
  store: Observable<DimensionSettingsState>;
  setSizes: (k: DimensionSettingsState['sizes']) => void;
}): PluginSubscribe<DimensionSettingsState> => {
  let trimmingObject: DimensionSettingsState['sizes']|null = null;
  let trimmedPreviousSizes:  DimensionSettingsState['sizes'] | null = null;

  return {
    set(key, val) {
      switch (key) {
        case 'sizes':
            // prevent changes after trimming
            if (trimmingObject && trimmingObject === val) {
                trimmingObject = null;
              return;
            }
            trimmedPreviousSizes = null;
          break;
        case 'trimmed':
          const trim = val as DimensionSettingsState['trimmed'];
          if (!trimmedPreviousSizes) {
            trimmedPreviousSizes = storeService.store.get('sizes');
          }

          trimmingObject = removeMultipleAndShift(trimmedPreviousSizes, trim || {});
          // save a reference to the trimmed object to prevent changes after trimming
          storeService.setSizes(trimmingObject);
          break;
      }
    },
  };
};


function removeMultipleAndShift<T1, T2>(items: {[virtialIndex: number]: T1}, toRemove: {[virtialIndex: number]: T2}): {[virtialIndex: number]: T1} {
    const newItems: {[virtialIndex: number]: T1} = {};
    const sortedIndexes = Object.keys(items || {}).map(Number).sort((a, b) => a - b);
    const lastIndex = sortedIndexes[sortedIndexes.length - 1];
    let shift = 0;
    for (let i = 0; i <= lastIndex; i++) {
        if (toRemove[i] !== undefined) {
            shift++;

            // skip already removed
            if (items[i] !== undefined) {
                continue;
            }
        }
        if (items[i] !== undefined) {
            newItems[i - shift] = items[i];
        }
    }
    return newItems;
}

