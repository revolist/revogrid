  - [Cell template](https://rv-grid.com/guide/cell/renderer) (create your own cell views).
  - [Cell editor](https://rv-grid.com/guide/cell/editor) (use predefined or apply your own custom editors and cell types).

- **Rich API & Additional Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).


### Usage Svelte

With NPM:

```bash
npm i @revolist/svelte-datagrid
```

With Yarn:

```bash
yarn add @revolist/svelte-datagrid;
```

```svelte
// App.svelte
<script lang="ts">
  import {
    Editor,
    RevoGrid,
    Template,
    type ColumnRegular,
    type Editors,
  } from '@revolist/svelte-datagrid';
  import OperationCell from './OperationCell.svelte';
  import OperationEditor from './OperationEditor.svelte';

  const OPERATION_EDITOR = 'operation';

  const source = [
    {
      name: '1',
      details: 'Item 1',
      operation: 'Edit',
    },
    {
      name: '2',
      details: 'Item 2',
      operation: 'Edit',
    },
  ];

  const columns: ColumnRegular[] = [
    {
      prop: 'name',
      name: 'First',
      cellTemplate(h, { value }) {
        return h('span', { style: { background: 'red' } }, value);
      }
    },
    {
      prop: 'details',
      name: 'Second',
    },
    {
      prop: 'operation',
      name: 'Operation',
      cellTemplate: Template(OperationCell),
      editor: OPERATION_EDITOR,
    },
  ];

  const editors: Editors = {
    [OPERATION_EDITOR]: Editor(OperationEditor),
  };
</script>

<main>
  <RevoGrid {source} {columns} {editors}></RevoGrid>
</main>
```

`Template(Component)` is the explicit Svelte component bridge for `cellTemplate`.
Native RevoGrid templates like `cellTemplate(h, props)` still work unchanged.
Use `Editor(Component)` to register Svelte components as custom editors.


[Example and guide](https://rv-grid.com/guide/svelte/)
