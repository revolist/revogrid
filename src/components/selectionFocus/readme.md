# revogr-focus

<!-- Auto Generated Below -->


## Properties

| Property                      | Attribute  | Description    | Type                                                                 | Default     |
| ----------------------------- | ---------- | -------------- | -------------------------------------------------------------------- | ----------- |
| `colData` _(required)_        | --         |                | `ObservableMap<DataSourceState<ColumnRegular, DimensionCols>>`       | `undefined` |
| `colType` _(required)_        | `col-type` |                | `"colPinEnd" \| "colPinStart" \| "rgCol"`                            | `undefined` |
| `dataStore` _(required)_      | --         |                | `ObservableMap<DataSourceState<DataType, DimensionRows>>`            | `undefined` |
| `dimensionCol` _(required)_   | --         |                | `ObservableMap<DimensionSettingsState>`                              | `undefined` |
| `dimensionRow` _(required)_   | --         |                | `ObservableMap<DimensionSettingsState>`                              | `undefined` |
| `focusTemplate`               | --         |                | `(createElement: HyperFunc<VNode>, detail: FocusRenderEvent) => any` | `null`      |
| `rowType` _(required)_        | `row-type` |                | `"rgRow" \| "rowPinEnd" \| "rowPinStart"`                            | `undefined` |
| `selectionStore` _(required)_ | --         | Dynamic stores | `ObservableMap<SelectionStoreState>`                                 | `undefined` |


## Events

| Event                  | Description                                                                                                               | Type                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `afterfocus`           | Used to setup properties after focus was rendered                                                                         | `CustomEvent<{ model: any; column: ColumnRegular; }>` |
| `before-focus-render`  |                                                                                                                           | `CustomEvent<FocusRenderEvent>`                       |
| `beforescrollintoview` | Before focus changed verify if it's in view and scroll viewport into this view Can be prevented by event.preventDefault() | `CustomEvent<{ el: HTMLElement; }>`                   |


## Dependencies

### Used by

 - [revo-grid](../revoGrid)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-focus
  style revogr-focus fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
