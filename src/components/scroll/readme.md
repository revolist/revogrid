# revogr-viewport-scroll

<!-- Auto Generated Below -->


## Overview

Service for tracking grid scrolling

## Properties

| Property        | Attribute        | Description             | Type     | Default |
| --------------- | ---------------- | ----------------------- | -------- | ------- |
| `contentHeight` | `content-height` | Height of inner content | `number` | `0`     |
| `contentWidth`  | `content-width`  | Width of inner content  | `number` | `0`     |


## Events

| Event            | Description                                                                         | Type                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `resizeViewport` |                                                                                     | `CustomEvent<{ dimension: DimensionType; size: number; }>`                                          |
| `scrollchange`   |                                                                                     | `CustomEvent<{ type: DimensionType; hasScroll: boolean; }>`                                         |
| `scrollViewport` |                                                                                     | `CustomEvent<{ dimension: DimensionType; coordinate: number; delta?: number; outside?: boolean; }>` |
| `silentScroll`   | Silently scroll to coordinate Made to align negative coordinates for mobile devices | `CustomEvent<{ dimension: DimensionType; coordinate: number; delta?: number; outside?: boolean; }>` |


## Methods

### `changeScroll(e: RevoGrid.ViewPortScrollEvent, silent?: boolean) => Promise<RevoGrid.ViewPortScrollEvent>`

update on delta in case we don't know existing position or external change

#### Returns

Type: `Promise<ViewPortScrollEvent>`



### `setScroll(e: RevoGrid.ViewPortScrollEvent) => Promise<void>`



#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [revo-grid](../revoGrid)
 - [revogr-row-headers](../rowHeaders)

### Graph
```mermaid
graph TD;
  revo-grid --> revogr-viewport-scroll
  revogr-row-headers --> revogr-viewport-scroll
  style revogr-viewport-scroll fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
