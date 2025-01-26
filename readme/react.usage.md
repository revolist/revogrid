## Basic Usage

### Simplest Usage

```tsx
import { useState } from 'react'
import { RevoGrid } from '@revolist/react-datagrid'

/**
 * note: columns & source need a "stable" reference in order to prevent infinite re-renders
 */
const columns = [
  { prop: 'name', name: 'First' },
  { prop: 'details', name: 'Second' },
]

function App() {
  const [source] = useState([
    { name: '1', details: 'Item 1' },
    { name: '2', details: 'Item 2' },
  ]);
  return (<RevoGrid columns={columns} source={source} />)
}
export default App

```

### Cell Template Usage

```tsx
import { useState } from 'react';
import { RevoGrid, Template, type ColumnDataSchemaModel } from '@revolist/react-datagrid';

/**
 * Custom cell component
 */
const Cell = ({ model, prop, value }: ColumnDataSchemaModel) => {
  return <div><strong>{value}</strong></div>;
};
/**
 * note: columns & source need a "stable" reference in order to prevent infinite re-renders
 */
const columns = [
  { prop: 'name', name: 'First', cellTemplate: Template(Cell) },
];

function App() {
  const [source] = useState([{ name: '1' }, { name: '2' }]);
  return (<RevoGrid columns={columns} source={source} />)
}
export default App

```

### Editor Usage

```tsx
// App.tsx
import { useState } from 'react';
import { RevoGrid, Editor, type EditorType, type Editors } from '@revolist/react-datagrid';

/**
 * Custom editor component
 */
const Button = ({ close } : EditorType) => {
  return <button onClick={close}>Close</button>
};

const gridEditors: Editors = { ['custom-editor']: Editor(Button) };

/**
 * note: columns & source need a "stable" reference in order to prevent infinite re-renders
 */
const columns = [
  {
    prop: 'name',
    name: 'Custom editor',
    editor: 'custom-editor',
  },
];

function App() {
  const [source] = useState([
    { name: '1', details: 'Item 1' },
    { name: '2', details: 'Item 2' },
  ]);
  return (<RevoGrid columns={columns} source={source} editors={gridEditors} />)
}

export default App

```


[Example and guide](https://rv-grid.com/guide/react/)

