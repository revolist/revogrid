# revogr-filter-panel

<!-- Auto Generated Below -->


## Properties

| Property         | Attribute | Description | Type                              | Default     |
| ---------------- | --------- | ----------- | --------------------------------- | ----------- |
| `filterEntities` | --        |             | `{ [x: string]: LogicFunction; }` | `{}`        |
| `filterNames`    | --        |             | `{ [x: string]: string; }`        | `{}`        |
| `filterTypes`    | --        |             | `{ [x: string]: string[]; }`      | `{}`        |
| `uuid`           | `uuid`    |             | `string`                          | `undefined` |


## Events

| Event          | Description | Type                                                                                                                                                                                                          |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filterChange` |             | `CustomEvent<{ prop?: ColumnProp; type?: "none" \| "empty" \| "notEmpty" \| "eq" \| "notEq" \| "begins" \| "contains" \| "notContains" \| "eqN" \| "neqN" \| "gt" \| "gte" \| "lt" \| "lte"; value?: any; }>` |


## Methods

### `getChanges() => Promise<ShowData>`



#### Returns

Type: `Promise<ShowData>`



### `show(newEntity?: ShowData) => Promise<void>`



#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
