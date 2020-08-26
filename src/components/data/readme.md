# viewport-data-component



<!-- Auto Generated Below -->


## Properties

| Property       | Attribute  | Description | Type                                    | Default     |
| -------------- | ---------- | ----------- | --------------------------------------- | ----------- |
| `colData`      | --         |             | `ColumnDataSchemaRegular[]`             | `undefined` |
| `cols`         | --         |             | `VirtualPositionItem[]`                 | `undefined` |
| `dimensionCol` | --         |             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `dimensionRow` | --         |             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `lastCell`     | --         |             | `Cell`                                  | `undefined` |
| `position`     | --         |             | `Cell`                                  | `undefined` |
| `range`        | `range`    |             | `boolean`                               | `undefined` |
| `readonly`     | `readonly` |             | `boolean`                               | `undefined` |
| `rowType`      | `row-type` |             | `"row" \| "rowPinEnd" \| "rowPinStart"` | `undefined` |
| `rows`         | --         |             | `VirtualPositionItem[]`                 | `undefined` |
| `uuid`         | `uuid`     |             | `string`                                | `''`        |


## Dependencies

### Used by

 - [revogr-viewport](../viewport)

### Depends on

- [revogr-overlay-selection](../overlay/selection)

### Graph
```mermaid
graph TD;
  revogr-data --> revogr-overlay-selection
  revogr-overlay-selection --> revogr-edit
  revogr-edit --> revogr-text-editor
  revogr-viewport --> revogr-data
  style revogr-data fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
