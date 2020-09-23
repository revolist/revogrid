# revogr-overlay-selection



<!-- Auto Generated Below -->


## Properties

| Property         | Attribute  | Description                                                     | Type                                                      | Default     |
| ---------------- | ---------- | --------------------------------------------------------------- | --------------------------------------------------------- | ----------- |
| `canDrag`        | `can-drag` |                                                                 | `boolean`                                                 | `undefined` |
| `colData`        | --         |                                                                 | `ColumnRegular[]`                                         | `undefined` |
| `dataStore`      | --         | Static stores, not expected to change during component lifetime | `ObservableMap<DataSourceState<DataType, DimensionRows>>` | `undefined` |
| `dimensionCol`   | --         |                                                                 | `ObservableMap<DimensionSettingsState>`                   | `undefined` |
| `dimensionRow`   | --         |                                                                 | `ObservableMap<DimensionSettingsState>`                   | `undefined` |
| `editors`        | --         | Custom editors register                                         | `{ [name: string]: EditorCtr; }`                          | `undefined` |
| `lastCell`       | --         | Last cell position                                              | `Cell`                                                    | `undefined` |
| `range`          | `range`    |                                                                 | `boolean`                                                 | `undefined` |
| `readonly`       | `readonly` |                                                                 | `boolean`                                                 | `undefined` |
| `selectionStore` | --         | Dynamic stores                                                  | `ObservableMap<SelectionStoreState>`                      | `undefined` |


## Events

| Event                      | Description             | Type                                                                                                                              |
| -------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `changeSelection`          |                         | `CustomEvent<{ changes: Partial<Cell>; isMulti?: boolean; }>`                                                                     |
| `focusCell`                |                         | `CustomEvent<{ focus: Cell; end: Cell; }>`                                                                                        |
| `internalCellEdit`         |                         | `CustomEvent<{ prop: ColumnProp; val: string; rowIndex: number; type: DimensionRows; }>`                                          |
| `internalFocusCell`        |                         | `CustomEvent<{ focus: Cell; end: Cell; }>`                                                                                        |
| `internalSelectionChanged` | Selection range changed | `CustomEvent<{ type: DimensionRows; newRange: RangeArea; oldRange: RangeArea; newProps: ColumnProp[]; oldProps: ColumnProp[]; }>` |
| `setEdit`                  |                         | `CustomEvent<boolean \| string>`                                                                                                  |
| `unregister`               |                         | `CustomEvent<any>`                                                                                                                |


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

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
