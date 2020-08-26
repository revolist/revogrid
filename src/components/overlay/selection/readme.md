# revogr-overlay-selection



<!-- Auto Generated Below -->


## Properties

| Property        | Attribute  | Description | Type                                    | Default     |
| --------------- | ---------- | ----------- | --------------------------------------- | ----------- |
| `columnService` | --         |             | `ColumnServiceI`                        | `undefined` |
| `dimensionCol`  | --         |             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `dimensionRow`  | --         |             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `lastCell`      | --         |             | `Cell`                                  | `undefined` |
| `parent`        | `parent`   |             | `string`                                | `''`        |
| `position`      | --         |             | `Cell`                                  | `undefined` |
| `readonly`      | `readonly` |             | `boolean`                               | `undefined` |


## Dependencies

### Used by

 - [revogr-data](../../data)

### Depends on

- [revogr-edit](../editors)

### Graph
```mermaid
graph TD;
  revogr-overlay-selection --> revogr-edit
  revogr-edit --> revogr-text-editor
  revogr-data --> revogr-overlay-selection
  style revogr-overlay-selection fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
