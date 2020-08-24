# grid-component



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute    | Description | Type                                                        | Default                             |
| ------------ | ------------ | ----------- | ----------------------------------------------------------- | ----------------------------------- |
| `colSize`    | `col-size`   |             | `number`                                                    | `initialSettings.defaultColumnSize` |
| `columns`    | --           |             | `ColumnDataSchema[]`                                        | `[]`                                |
| `dimensions` | --           |             | `{ col?: ViewSettingSizeProp; row?: ViewSettingSizeProp; }` | `{}`                                |
| `frameSize`  | `frame-size` |             | `number`                                                    | `initialSettings.frameSize`         |
| `range`      | `range`      |             | `boolean`                                                   | `initialSettings.range`             |
| `readonly`   | `readonly`   |             | `boolean`                                                   | `initialSettings.readonly`          |
| `rowSize`    | `row-size`   |             | `number`                                                    | `initialSettings.defaultRowSize`    |
| `source`     | --           |             | `DataType[]`                                                | `[]`                                |


## Dependencies

### Depends on

- [revogr-viewport-scroll-scrollable](../scrollable)
- [revogr-header](../header)
- [revogr-data](../data)
- [revogr-overlay-selection](../overlay)
- [revogr-edit](../overlay)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-viewport-scroll-scrollable
  revo-grid --> revogr-header
  revo-grid --> revogr-data
  revo-grid --> revogr-overlay-selection
  revo-grid --> revogr-edit
  revogr-edit --> revogr-text-editor
  style revo-grid fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
