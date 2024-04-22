# revogr-clipboard



<!-- Auto Generated Below -->


## Properties

| Property   | Attribute  | Description                             | Type      | Default     |
| ---------- | ---------- | --------------------------------------- | --------- | ----------- |
| `readonly` | `readonly` | If readonly mode - disabled Paste event | `boolean` | `undefined` |


## Events

| Event              | Description                                                             | Type                        |
| ------------------ | ----------------------------------------------------------------------- | --------------------------- |
| `afterpasteapply`  | Paste 4. Fired after paste applied to the grid                          | `CustomEvent<any>`          |
| `beforecopy`       | Copy 1. Fired before copy triggered                                     | `CustomEvent<any>`          |
| `beforecopyapply`  | Copy Method 1. Fired before copy applied to the clipboard from outside. | `CustomEvent<any>`          |
| `beforecut`        | Cut 1. Fired before cut triggered                                       | `CustomEvent<any>`          |
| `beforepaste`      | Paste 1. Fired before paste applied to the grid                         | `CustomEvent<any>`          |
| `beforepasteapply` | Paste 2. Fired before paste applied to the grid and after data parsed   | `CustomEvent<any>`          |
| `clearregion`      | Cut 2. Clears region when cut is done                                   | `CustomEvent<DataTransfer>` |
| `copyregion`       | Copy 2. Fired when region copied                                        | `CustomEvent<DataTransfer>` |
| `pasteregion`      | Paste 3. Internal method. When data region is ready pass it to the top. | `CustomEvent<string[][]>`   |


## Methods

### `doCopy(e: DataTransfer, data?: DataFormat[][]) => Promise<void>`



#### Parameters

| Name   | Type           | Description |
| ------ | -------------- | ----------- |
| `e`    | `DataTransfer` |             |
| `data` | `any[][]`      |             |

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with love by Revolist OU*
