### Usage Vue 2 [Example](https://codesandbox.io/s/data-vue-test-3wkzi?file=/src/App.vue)

With NPM:

```bash
npm i @revolist/vue-datagrid --save;
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

// Cell.vue
<template>Custom cell</template>
<script>
import Vue, { PropType } from 'vue';
export default {
  props: ['prop', 'model', 'column', 'rowIndex', 'colIndex', 'colType', 'type', 'data'],
};
</script>
```
