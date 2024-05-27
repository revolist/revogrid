### Usage React [Example](https://codesandbox.io/s/data-vue-test-3wkzi?file=/src/App.vue)

With NPM:

```bash
npm i @revolist/react-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/react-datagrid;
```

```tsx
// App.tsx
import { RevoGrid, Template, Editor, type EditorType } from '@revolist/react-datagrid';
import { ColumnDataSchemaModel, Editors } from '@revolist/revogrid';
import { createContext, useContext } from 'react';

/**
 * Showcase
 */
export const LevelContext = createContext('My custom context to pass to cell');

/**
 * Custom cell component
 */
const Cell = ({ model, prop }: ColumnDataSchemaModel) => {
  const level = useContext(LevelContext);
  return <div><strong title={level}>{model[prop]}</strong></div>;
};

/**
 * Custom editor component
 */
const Button = ({ close } : EditorType) => {
  return <button onClick={close}>Close</button>
};

function App() {
  const MY_EDITOR = 'custom-editor';
  const columns = [
    {
      prop: 'name',
      name: 'First',
      editor: MY_EDITOR,
      cellTemplate: Template(Cell),
    },
    {
      prop: 'details',
      name: 'Second',
    },
  ];
  const source = [
    {
      name: '1',
      details: 'Item 1',
    },
    {
      name: '2',
      details: 'Item 2',
    },
  ];
  const gridEditors: Editors = { [MY_EDITOR]: Editor(Button) };
  return (
    <>
      <RevoGrid columns={columns} source={source} editors={gridEditors} />
    </>
  )
}

export default App

```
