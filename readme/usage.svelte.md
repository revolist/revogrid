### Usage Svelte [Example](https://codesandbox.io/s/data-vue-test-3wkzi?file=/src/App.vue)

With NPM:

```bash
npm i @revolist/svelte-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/svelte-datagrid;
```

```svelte
// App.svelte
<script lang="ts">
  import { RevoGrid } from '@revolist/svelte-datagrid';
  import type { ColumnRegular } from '@revolist/revogrid';

  // This part to makesure revogrid component is loaded and ready
  import { defineCustomElements } from '@revolist/revogrid/loader';
  defineCustomElements();

  const columns = [
      {
        prop: 'name',
        name: 'First',
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
</script>

<RevoGrid {source} {columns}></RevoGrid>

```
