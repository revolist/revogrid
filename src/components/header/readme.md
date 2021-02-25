# viewport-header-data-component

<!-- Auto Generated Below -->

## Properties

| Property         | Attribute        | Description | Type                                    | Default     |
| ---------------- | ---------------- | ----------- | --------------------------------------- | ----------- |
| `canResize`      | `can-resize`     |             | `boolean`                               | `undefined` |
| `colData`        | --               |             | `ColumnRegular[]`                       | `undefined` |
| `columnFilter`   | `column-filter`  |             | `boolean`                               | `undefined` |
| `dimensionCol`   | --               |             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `groupingDepth`  | `grouping-depth` |             | `number`                                | `0`         |
| `groups`         | --               |             | `{ [x: string]: any; }`                 | `undefined` |
| `parent`         | `parent`         |             | `string`                                | `''`        |
| `selectionStore` | --               |             | `ObservableMap<SelectionStoreState>`    | `undefined` |
| `viewportCol`    | --               |             | `ObservableMap<ViewportState>`          | `undefined` |

## Events

| Event                | Description | Type                                                                                |
| -------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `headerDblClick`     |             | `CustomEvent<{ index: number; originalEvent: MouseEvent; column: ColumnRegular; }>` |
| `headerResize`       |             | `CustomEvent<{ [x: string]: number; }>`                                             |
| `initialHeaderClick` |             | `CustomEvent<{ index: number; originalEvent: MouseEvent; column: ColumnRegular; }>` |

## Dependencies

### Used by

- [revogr-viewport](../viewport)

### Graph

```mermaid
graph TD;
  revogr-viewport --> revogr-header
  style revogr-header fill:#f9f,stroke:#333,stroke-width:4px
```

---

_Built with [StencilJS](https://stenciljs.com/)_
