# revogr-clipboard



<!-- Auto Generated Below -->


## Properties

| Property   | Attribute  | Description                                      | Type      | Default     |
| ---------- | ---------- | ------------------------------------------------ | --------- | ----------- |
| `readonly` | `readonly` | If readonly mode enables no need for Paste event | `boolean` | `undefined` |


## Events

| Event              | Description                                                  | Type                        |
| ------------------ | ------------------------------------------------------------ | --------------------------- |
| `afterpasteapply`  | Fired after paste applied to the grid                        | `CustomEvent<any>`          |
| `beforecopy`       | Fired before copy triggered                                  | `CustomEvent<any>`          |
| `beforecopyapply`  | Fired before copy applied to the clipboard                   | `CustomEvent<any>`          |
| `beforecut`        | Fired before cut triggered                                   | `CustomEvent<any>`          |
| `beforepaste`      | Fired before paste applied to the grid                       | `CustomEvent<any>`          |
| `beforepasteapply` | Fired before paste applied to the grid and after data parsed | `CustomEvent<any>`          |
| `clearRegion`      | Clears region when cut is done                               | `CustomEvent<DataTransfer>` |
| `copyRegion`       | Fired when region copied                                     | `CustomEvent<DataTransfer>` |
| `pasteRegion`      | Fired when region pasted                                     | `CustomEvent<string[][]>`   |


## Methods

### `doCopy(e: DataTransfer, data?: DataFormat[][]) => Promise<void>`



#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
