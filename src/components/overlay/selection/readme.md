# revogr-overlay-selection



<!-- Auto Generated Below -->


## Properties

| Property                  | Attribute  | Description             | Type                                       | Default     |
| ------------------------- | ---------- | ----------------------- | ------------------------------------------ | ----------- |
| `colData`                 | --         |                         | `ColumnDataSchemaRegular[]`                | `undefined` |
| `dataStore`               | --         |                         | `ObservableMap<DataSourceState<DataType>>` | `undefined` |
| `dimensionCol`            | --         |                         | `ObservableMap<DimensionSettingsState>`    | `undefined` |
| `dimensionRow`            | --         |                         | `ObservableMap<DimensionSettingsState>`    | `undefined` |
| `editors`                 | --         | Custom editors register | `{ [name: string]: EditorCtr; }`           | `{}`        |
| `lastCell`                | --         |                         | `Cell`                                     | `undefined` |
| `position`                | --         |                         | `Cell`                                     | `undefined` |
| `readonly`                | `readonly` |                         | `boolean`                                  | `undefined` |
| `selectionStoreConnector` | --         |                         | `SelectionStoreConnectorI`                 | `undefined` |
| `uuid`                    | `uuid`     |                         | `string`                                   | `undefined` |


## Events

| Event        | Description | Type                                                               |
| ------------ | ----------- | ------------------------------------------------------------------ |
| `afterEdit`  |             | `CustomEvent<{ model: DataType; prop: ColumnProp; val: string; }>` |
| `beforeEdit` |             | `CustomEvent<{ model: DataType; prop: ColumnProp; val: string; }>` |


## Dependencies

### Used by

 - [revogr-viewport](../../viewport)

### Depends on

- [revogr-edit](../editors)

### Graph
```mermaid
graph TD;
  revogr-overlay-selection --> revogr-edit
  revogr-viewport --> revogr-overlay-selection
  style revogr-overlay-selection fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
