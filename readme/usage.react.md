### Usage React

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
import { RevoGrid, Template, Editor, type EditorType, type ColumnDataSchemaModel, type Editors } from '@revolist/react-datagrid';

/**
 * Custom cell component
 */
const Cell = ({ model, prop, value }: ColumnDataSchemaModel) => {
  return <div><strong>{value}</strong></div>;
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

[Example and guide](https://rv-grid.com/guide/react/)

