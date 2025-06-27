import { BasePlugin } from '../base.plugin';
import type { PluginProviders } from '@type';
import { type ColumnCollection, isColGrouping } from '../../utils/column.utils';

/**
 * RTL (Right-to-Left) Plugin for RevoGrid
 * 
 * This plugin handles RTL transformation by subscribing to the beforecolumnsset event
 * and applying column order reversal when RTL mode is enabled.
 */
export class RTLPlugin extends BasePlugin {
  private isRTLEnabled = false;

  constructor(
    revogrid: HTMLRevoGridElement,
    providers: PluginProviders,
  ) {
    super(revogrid, providers);
    this.init();
  }

  private init() {
    // Subscribe to beforecolumnsset event to apply RTL transformation
    this.addEventListener('beforecolumnsset', (event) => {
      this.handleBeforeColumnsSet(event);
    });

    // Listen for RTL property changes
    this.addEventListener('aftergridinit', () => {
      this.updateRTLState();
    });

    // Watch for RTL property changes
    this.watch('rtl', (value: boolean) => {
      this.isRTLEnabled = value;
      this.emit('rtlstatechanged', { rtl: this.isRTLEnabled });
    }, { immediate: true });
  }

  /**
   * Handle the beforecolumnsset event to apply RTL transformation
   */
  private handleBeforeColumnsSet(event: CustomEvent<ColumnCollection>) {
    if (!this.isRTLEnabled) {
      return; // No transformation needed if RTL is disabled
    }

    const columnCollection = event.detail;
    
    // Apply RTL transformation to all column types
    const transformedColumns = this.applyRTLTransformationToCollection(columnCollection);
    
    // Update the event detail with transformed columns
    event.detail.columns = transformedColumns.columns;
    event.detail.columnByProp = transformedColumns.columnByProp;
    event.detail.columnGrouping = transformedColumns.columnGrouping;
  }

  /**
   * Apply RTL transformation to the entire column collection
   */
  private applyRTLTransformationToCollection(collection: ColumnCollection): ColumnCollection {
    const transformedCollection: ColumnCollection = {
      columns: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      columnByProp: { ...collection.columnByProp },
      columnGrouping: {
        rgCol: [],
        colPinStart: [],
        colPinEnd: [],
      },
      maxLevel: collection.maxLevel,
      sort: { ...collection.sort },
    };

    // Transform each column type
    Object.keys(collection.columns).forEach((type) => {
      const columnType = type as keyof typeof collection.columns;
      const columns = collection.columns[columnType];
      
      // Apply RTL transformation to columns
      transformedCollection.columns[columnType] = this.applyRTLTransformationToColumns(columns);
      
      // Transform column grouping for this type
      transformedCollection.columnGrouping[columnType] = this.applyRTLTransformationToGroups(
        collection.columnGrouping[columnType],
        columns.length
      );
    });

    return transformedCollection;
  }

  /**
   * Apply RTL transformation to a list of columns
   */
  private applyRTLTransformationToColumns(columns: any[]): any[] {
    return columns.map(column => {
      if (isColGrouping(column)) {
        // For grouped columns, recursively transform children
        return {
          ...column,
          children: this.applyRTLTransformationToColumns(column.children)
        };
      }
      return column;
    }).reverse(); // Reverse the column order for RTL
  }

  /**
   * Apply RTL transformation to column groups
   */
  private applyRTLTransformationToGroups(groups: any[], totalColumns: number): any[] {
    return groups.map(group => {
      // Reverse the indexes for RTL
      const reversedIndexes = group.indexes.map((index: number) => 
        totalColumns - 1 - index
      ).reverse();
      
      return {
        ...group,
        indexes: reversedIndexes
      };
    }).reverse(); // Reverse the group order
  }

  /**
   * Update RTL state based on the grid's rtl property
   */
  private updateRTLState() {
    const grid = this.revogrid as any;
    if (grid && typeof grid.rtl === 'boolean') {
      this.isRTLEnabled = grid.rtl;
    }
  }

  /**
   * Enable RTL mode
   */
  public enableRTL() {
    this.isRTLEnabled = true;
    this.emit('rtlstatechanged', { rtl: this.isRTLEnabled });
  }

  /**
   * Disable RTL mode
   */
  public disableRTL() {
    this.isRTLEnabled = false;
    this.emit('rtlstatechanged', { rtl: this.isRTLEnabled });
  }

  /**
   * Toggle RTL mode
   */
  public toggleRTL() {
    this.isRTLEnabled = !this.isRTLEnabled;
    this.emit('rtlstatechanged', { rtl: this.isRTLEnabled });
  }

  /**
   * Get current RTL state
   */
  public getRTLState(): boolean {
    return this.isRTLEnabled;
  }


  /**
   * Clean up the plugin
   */
  public destroy() {
    super.destroy();
  }
} 