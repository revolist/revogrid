# revogr-focus

<!-- Auto Generated Below -->


## Overview

Temporary range selection

## Properties

| Property         | Attribute | Description                                        | Type                                    | Default     |
| ---------------- | --------- | -------------------------------------------------- | --------------------------------------- | ----------- |
| `dimensionCol`   | --        | Dimension column store                             | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `dimensionRow`   | --        | Dimension row store                                | `ObservableMap<DimensionSettingsState>` | `undefined` |
| `selectionStore` | --        | Selection store, shows current selection and focus | `ObservableMap<SelectionStoreState>`    | `undefined` |


## Dependencies

### Used by

 - [revo-grid](../revoGrid)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-temp-range
  style revogr-temp-range fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
