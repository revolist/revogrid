# grid-component



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute    | Description | Type                 | Default                             |
| -------------------- | ------------ | ----------- | -------------------- | ----------------------------------- |
| `colSize`            | `col-size`   |             | `number`             | `initialSettings.defaultColumnSize` |
| `columns`            | --           |             | `ColumnDataSchema[]` | `[]`                                |
| `frameSize`          | `frame-size` |             | `number`             | `initialSettings.frameSize`         |
| `pinnedBottomSource` | --           |             | `DataType[]`         | `[]`                                |
| `pinnedTopSource`    | --           |             | `DataType[]`         | `[]`                                |
| `range`              | `range`      |             | `boolean`            | `initialSettings.range`             |
| `readonly`           | `readonly`   |             | `boolean`            | `initialSettings.readonly`          |
| `resize`             | `resize`     |             | `boolean`            | `initialSettings.resize`            |
| `rowSize`            | `row-size`   |             | `number`             | `initialSettings.defaultRowSize`    |
| `source`             | --           |             | `DataType[]`         | `[]`                                |


## Dependencies

### Depends on

- [revogr-viewport](../viewport)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-viewport
  revogr-viewport --> revogr-data
  revogr-viewport --> revogr-viewport-scroll
  revogr-viewport --> revogr-header
  revogr-viewport --> revogr-scroll-virtual
  revogr-data --> revogr-overlay-selection
  revogr-overlay-selection --> revogr-edit
  revogr-edit --> revogr-text-editor
  style revo-grid fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
