import { gatherTrimmedItems, Trimmed, TrimmedEntity } from "../trimmed/trimmed.plugin";

export const TRIMMED_GROUPING = 'grouping';

/**
 * Prepare trimming updated indexes for grouping
 * @param initiallyTrimed 
 * @param firstLevelMap 
 * @param secondLevelMap 
 */
export function processDoubleConversionTrimmed(
	initiallyTrimed: Trimmed,
	firstLevelMap: Record<number, number>,
	secondLevelMap?: Record<number, number>
) {
	const trimemedOptionsToUpgrade: Trimmed = {};
	/**
	 * go through all groups except grouping
	 */
	for (let type in initiallyTrimed) {
		if (type === TRIMMED_GROUPING) {
		  continue;
		}
		const items = initiallyTrimed[type];
		const newItems: TrimmedEntity = {};
		
		for (let initialIndex in items) {
		  /**
			 * if item exists we find it in collection
			 * we support 2 level of conversions
			 */
			let newConversionIndex = firstLevelMap[initialIndex];
			if (secondLevelMap) {
				newConversionIndex = secondLevelMap[newConversionIndex];
			}
  
		  /**
			 * if item was trimmed previously
			 * trimming makes sense to apply
			 */
		  if (items[initialIndex]) {
				newItems[newConversionIndex] = true;
				/**
				 * If changes present apply changes to new source
				 */
				if (newConversionIndex !== parseInt(initialIndex, 10)) {
					trimemedOptionsToUpgrade[type] = newItems;
				}
		  }
		}
	}
	return trimemedOptionsToUpgrade;
}

export function filterOutEmptyGroups(allTrimmedGroups: Trimmed, childrenByGroup: Record<number, number[]> = {}) {
	const trimmedGroup: TrimmedEntity = {};
	const allTrimmed = gatherTrimmedItems(allTrimmedGroups);
	// find is groups are filled
	for (let groupIndex in childrenByGroup) {	
		const hasChidlren = childrenByGroup[groupIndex].filter(childIndex => !allTrimmed[childIndex]).length > 0;
		if (!hasChidlren) {
			trimmedGroup[groupIndex] = true;
		}
	}
	return trimmedGroup;
} 