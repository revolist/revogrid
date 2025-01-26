  - [Cell template](https://rv-grid.com/guide/vue2/renderer) (create your own cell views).
  - [Cell editor](https://rv-grid.com/guide/vue2/editor) (use predefined or apply your own custom editors and cell types).

- **Rich API & Additional Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).

### Usage Vue 2

With NPM:

```bash
npm i @revolist/vue2-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/vue-datagrid;
```

```vue
// App.vue

<template>
  <!-- Use the VGrid component and bind the data source and columns -->
  <v-grid :source="rows" :columns="columns" />
</template>

<script>
import Grid, { VGridVueTemplate } from '@revolist/vue-datagrid'; // Import the VGrid component
import Cell from './Cell.vue'; // Custom cell template

export default {
  name: 'App',
  data() {
    return {
      // Define the columns for the grid
      columns: [
        { prop: 'name', name: 'First' }, // Simple column definition
        { prop: 'details', cellTemplate: VGridVueTemplate(Cell) }, // Another column definition
      ],
      // Define the data source for the grid
      rows: [{ name: '1', details: 'Item 1' }],
    };
  },
  components: {
    VGrid, // Register the VGrid component
  },
};
</script>
```
```vue
// Cell.vue
<template>Custom cell</template>
<script>
import Vue, { PropType } from 'vue';
export default {
  props: ['prop', 'model', 'column', 'rowIndex', 'colIndex', 'colType', 'type', 'data'],
};
</script>
```


[Example and guide](https://rv-grid.com/guide/vue2/)