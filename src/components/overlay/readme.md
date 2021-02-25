# revogr-overlay-selection

<!-- Auto Generated Below -->

## Properties

| Property         | Attribute       | Description                                                     | Type                                                           | Default     |
| ---------------- | --------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| `canDrag`        | `can-drag`      |                                                                 | `boolean`                                                      | `undefined` |
| `colData`        | --              |                                                                 | `ObservableMap<DataSourceState<ColumnRegular, DimensionCols>>` | `undefined` |
| `dataStore`      | --              | Static stores, not expected to change during component lifetime | `ObservableMap<DataSourceState<DataType, DimensionRows>>`      | `undefined` |
| `dimensionCol`   | --              |                                                                 | `ObservableMap<DimensionSettingsState>`                        | `undefined` |
| `dimensionRow`   | --              |                                                                 | `ObservableMap<DimensionSettingsState>`                        | `undefined` |
| `editors`        | --              | Custom editors register                                         | `{ [name: string]: EditorCtr; }`                               | `undefined` |
| `lastCell`       | --              | Last cell position                                              | `Cell`                                                         | `undefined` |
| `range`          | `range`         |                                                                 | `boolean`                                                      | `undefined` |
| `readonly`       | `readonly`      |                                                                 | `boolean`                                                      | `undefined` |
| `selectionStore` | --              | Dynamic stores                                                  | `ObservableMap<SelectionStoreState>`                           | `undefined` |
| `useClipboard`   | `use-clipboard` |                                                                 | `boolean`                                                      | `undefined` |

## Events

| Event                      | Description             | Type                                                                                                                                                                     |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `focusCell`                |                         | `CustomEvent<{ focus: Cell; end: Cell; }>`                                                                                                                               |
| `internalCellEdit`         |                         | `CustomEvent<{ prop: ColumnProp; model: DataType; val?: string; rowIndex: number; type: DimensionRows; }>`                                                               |
| `internalCopy`             |                         | `CustomEvent<any>`                                                                                                                                                       |
| `internalFocusCell`        |                         | `CustomEvent<{ prop: ColumnProp; model: DataType; val?: string; rowIndex: number; type: DimensionRows; }>`                                                               |
| `internalPaste`            |                         | `CustomEvent<any>`                                                                                                                                                       |
| `internalRangeDataApply`   | Range data apply        | `CustomEvent<{ data: DataLookup; models: { [rowIndex: number]: DataType; }; type: DimensionRows; }>`                                                                     |
| `internalSelectionChanged` | Selection range changed | `CustomEvent<{ type: DimensionRows; newRange: RangeArea; oldRange: RangeArea; newProps: ColumnProp[]; oldProps: ColumnProp[]; newData: { [key: number]: DataType; }; }>` |
| `setEdit`                  |                         | `CustomEvent<{ isCancel: boolean; } & BeforeSaveDataDetails>`                                                                                                            |
| `setRange`                 |                         | `CustomEvent<{ x: number; y: number; x1: number; y1: number; }>`                                                                                                         |
| `setTempRange`             |                         | `CustomEvent<{ type: string; area: RangeArea; }>`                                                                                                                        |
| `unregister`               |                         | `CustomEvent<any>`                                                                                                                                                       |

## Dependencies

### Used by

- [revogr-viewport](../viewport)

### Depends on

- [revogr-edit](.)
- [revogr-order-editor](../order)

### Graph

```mermaid
graph TD;
  revogr-overlay-selection --> revogr-edit
  revogr-overlay-selection --> revogr-order-editor
  revogr-viewport --> revogr-overlay-selection
  style revogr-overlay-selection fill:#f9f,stroke:#333,stroke-width:4px
```

---

_Built with [StencilJS](https://stenciljs.com/)_
