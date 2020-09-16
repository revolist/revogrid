# grid-component



<!-- Auto Generated Below -->


## Properties

| Property             | Attribute    | Description                                                                                                                                                                  | Type                                                      | Default |
| -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------- |
| `colSize`            | `col-size`   | Indicates default column size.                                                                                                                                               | `number`                                                  | `80`    |
| `columns`            | --           | Columns - defines an array of grid columns. Can be column or grouped column.                                                                                                 | `(ColumnDataSchemaRegular \| ColumnDataSchemaGrouping)[]` | `[]`    |
| `editors`            | --           | Custom editors register                                                                                                                                                      | `{ [name: string]: EditorCtr; }`                          | `{}`    |
| `frameSize`          | `frame-size` | Defines how many rows/columns should be rendered outside visible area.                                                                                                       | `number`                                                  | `0`     |
| `pinnedBottomSource` | --           | Pinned bottom Source: {[T in ColumnProp]: any} - defines pinned bottom rows data source.                                                                                     | `DataType[]`                                              | `[]`    |
| `pinnedTopSource`    | --           | Pinned top Source: {[T in ColumnProp]: any} - defines pinned top rows data source.                                                                                           | `DataType[]`                                              | `[]`    |
| `range`              | `range`      | When true, user can range selection.                                                                                                                                         | `boolean`                                                 | `false` |
| `readonly`           | `readonly`   | When true, grid in read only mode.                                                                                                                                           | `boolean`                                                 | `false` |
| `resize`             | `resize`     | When true, columns are resizable.                                                                                                                                            | `boolean`                                                 | `false` |
| `rowSize`            | `row-size`   | Indicates default row size.                                                                                                                                                  | `number`                                                  | `30`    |
| `source`             | --           | Source: {[T in ColumnProp]: any} - defines main data source. Can be an Object or 2 dimensional array([][]); ColumnProp - string\|number. It is reference for column mapping. | `DataType[]`                                              | `[]`    |


## Dependencies

### Depends on

- [revogr-viewport](../viewport)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-viewport
  revogr-viewport --> revogr-overlay-selection
  revogr-viewport --> revogr-data
  revogr-viewport --> revogr-viewport-scroll
  revogr-viewport --> revogr-header
  revogr-viewport --> revogr-scroll-virtual
  revogr-overlay-selection --> revogr-edit
  revogr-overlay-selection --> revogr-order-editor
  style revo-grid fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
