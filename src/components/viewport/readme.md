# revogr-viewport-scroll

<!-- Auto Generated Below -->

## Properties

| Property       | Attribute       | Description             | Type                                                                                                                                                                                                                                                                                    | Default     |
| -------------- | --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `columnFilter` | `column-filter` |                         | `boolean`                                                                                                                                                                                                                                                                               | `undefined` |
| `columnStores` | --              |                         | `{ colPinStart: Observable<DataSourceState<ColumnRegular, DimensionCols>>; colPinEnd: Observable<DataSourceState<ColumnRegular, DimensionCols>>; col: Observable<DataSourceState<ColumnRegular, DimensionCols>>; }`                                                                     | `undefined` |
| `dimensions`   | --              |                         | `{ row: Observable<DimensionSettingsState>; rowPinStart: Observable<DimensionSettingsState>; rowPinEnd: Observable<DimensionSettingsState>; colPinStart: Observable<DimensionSettingsState>; colPinEnd: Observable<DimensionSettingsState>; col: Observable<DimensionSettingsState>; }` | `undefined` |
| `editors`      | --              | Custom editors register | `{ [name: string]: EditorCtr; }`                                                                                                                                                                                                                                                        | `undefined` |
| `range`        | `range`         |                         | `boolean`                                                                                                                                                                                                                                                                               | `undefined` |
| `readonly`     | `readonly`      |                         | `boolean`                                                                                                                                                                                                                                                                               | `undefined` |
| `resize`       | `resize`        |                         | `boolean`                                                                                                                                                                                                                                                                               | `undefined` |
| `rowClass`     | `row-class`     |                         | `string`                                                                                                                                                                                                                                                                                | `undefined` |
| `rowHeaders`   | `row-headers`   | Show row indexes column | `RowHeaders \| boolean`                                                                                                                                                                                                                                                                 | `undefined` |
| `rowStores`    | --              |                         | `{ row: Observable<DataSourceState<DataType, DimensionRows>>; rowPinStart: Observable<DataSourceState<DataType, DimensionRows>>; rowPinEnd: Observable<DataSourceState<DataType, DimensionRows>>; }`                                                                                    | `undefined` |
| `useClipboard` | `use-clipboard` |                         | `boolean`                                                                                                                                                                                                                                                                               | `undefined` |
| `uuid`         | `uuid`          |                         | `string`                                                                                                                                                                                                                                                                                | `null`      |
| `viewports`    | --              |                         | `{ row: Observable<ViewportState>; rowPinStart: Observable<ViewportState>; rowPinEnd: Observable<ViewportState>; colPinStart: Observable<ViewportState>; colPinEnd: Observable<ViewportState>; col: Observable<ViewportState>; }`                                                       | `undefined` |

## Events

| Event                   | Description | Type                                                                                                       |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `beforeEditStart`       |             | `CustomEvent<{ prop: ColumnProp; model: DataType; val?: string; rowIndex: number; type: DimensionRows; }>` |
| `initialRowDragStart`   |             | `CustomEvent<{ pos: PositionItem; text: string; }>`                                                        |
| `setDimensionSize`      |             | `CustomEvent<{ type: MultiDimensionType; sizes: Record<string, number>; }>`                                |
| `setViewportCoordinate` |             | `CustomEvent<{ dimension: DimensionType; coordinate: number; delta?: number; }>`                           |
| `setViewportSize`       |             | `CustomEvent<{ dimension: DimensionType; size: number; }>`                                                 |

## Methods

### `clearFocus() => Promise<void>`

Clear current grid focus

#### Returns

Type: `Promise<void>`

### `scrollToCoordinate(cell: Partial<Selection.Cell>) => Promise<void>`

#### Returns

Type: `Promise<void>`

### `setEdit(rowIndex: number, colIndex: number, colType: RevoGrid.DimensionCols, rowType: RevoGrid.DimensionRows) => Promise<void>`

#### Returns

Type: `Promise<void>`

## Dependencies

### Used by

- [revo-grid](../revo-grid)

### Depends on

- [revogr-overlay-selection](../overlay)
- [revogr-data](../data)
- [revogr-temp-range](../selection-temp-range)
- [revogr-focus](../selection-focus)
- [revogr-viewport-scroll](../scroll)
- [revogr-header](../header)
- [revogr-scroll-virtual](../scrollable)

### Graph

```mermaid
graph TD;
  revogr-viewport --> revogr-overlay-selection
  revogr-viewport --> revogr-data
  revogr-viewport --> revogr-temp-range
  revogr-viewport --> revogr-focus
  revogr-viewport --> revogr-viewport-scroll
  revogr-viewport --> revogr-header
  revogr-viewport --> revogr-scroll-virtual
  revogr-overlay-selection --> revogr-edit
  revogr-overlay-selection --> revogr-order-editor
  revo-grid --> revogr-viewport
  style revogr-viewport fill:#f9f,stroke:#333,stroke-width:4px
```

---

_Built with [StencilJS](https://stenciljs.com/)_
