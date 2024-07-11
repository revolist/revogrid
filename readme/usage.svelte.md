### Usage Svelte [Example](https://codesandbox.io/s/data-vue-test-3wkzi?file=/src/App.vue)

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
    import { RevoGrid, type ColumnRegular } from '@revolist/svelte-datagrid';
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
  ];
</script>

<main>
	<RevoGrid {source} {columns}></RevoGrid>
</main>
```


[Example and guide](https://rv-grid.com/guide/svelte/)
