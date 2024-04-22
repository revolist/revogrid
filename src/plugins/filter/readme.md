# revogr-filter-panel

<!-- Auto Generated Below -->


## Properties

| Property                  | Attribute                   | Description | Type                                                              | Default     |
| ------------------------- | --------------------------- | ----------- | ----------------------------------------------------------------- | ----------- |
| `disableDynamicFiltering` | `disable-dynamic-filtering` |             | `boolean`                                                         | `false`     |
| `filterCaptions`          | --                          |             | `{ title: string; save: string; reset: string; cancel: string; }` | `undefined` |
| `filterEntities`          | --                          |             | `{ [x: string]: LogicFunction; }`                                 | `{}`        |
| `filterItems`             | --                          |             | `{ [prop: string]: FilterData[]; }`                               | `{}`        |
| `filterNames`             | --                          |             | `{ [x: string]: string; }`                                        | `{}`        |
| `filterTypes`             | --                          |             | `{ [x: string]: string[]; }`                                      | `{}`        |
| `uuid`                    | `uuid`                      |             | `string`                                                          | `undefined` |


## Events

| Event          | Description | Type                                             |
| -------------- | ----------- | ------------------------------------------------ |
| `filterChange` |             | `CustomEvent<{ [prop: string]: FilterData[]; }>` |


## Methods

### `getChanges() => Promise<ShowData>`



#### Returns

Type: `Promise<ShowData>`



### `show(newEntity?: ShowData) => Promise<void>`



#### Parameters

| Name        | Type                                     | Description |
| ----------- | ---------------------------------------- | ----------- |
| `newEntity` | `{ x: number; y: number; } & FilterItem` |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with love by Revolist OU*
