# revogr-clipboard



<!-- Auto Generated Below -->


## Events

| Event         | Description | Type                        |
| ------------- | ----------- | --------------------------- |
| `copyRegion`  |             | `CustomEvent<DataTransfer>` |
| `pasteRegion` |             | `CustomEvent<string[][]>`   |


## Methods

### `doCopy(e: DataTransfer, data?: RevoGrid.DataFormat[][]) => Promise<void>`



#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [revogr-overlay-selection](../overlay)

### Graph
```mermaid
graph TD;
  revogr-overlay-selection --> revogr-clipboard
  style revogr-clipboard fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
