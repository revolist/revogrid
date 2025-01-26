  - [Cell template](https://rv-grid.com/guide/vue3/renderer) (create your own cell views).
  - [Cell editor](https://rv-grid.com/guide/vue3/editor) (use predefined or apply your own custom editors and cell types).


- **Rich API & Additional Improvements**: Explore hundreds of other small customizations and improvements in [RevoGrid](https://rv-grid.com/).

### Usage Vue 3

With NPM:

```bash
npm i @revolist/vue3-datagrid --save;
```

With Yarn:

```bash
yarn add @revolist/vue3-datagrid;
```


```vue
// App.vue
<template>
    <Grid
      :editors="gridEditors"
      :source="source"
      :columns="columns"
      @cell-custom-action="testCustomCellAction"
      @cell-click="testAction"
    />
</template>

<script lang="ts" setup>
/**
 * This is an example of a Vue3 component using Revogrid
 */
import { provide, readonly, ref } from 'vue';
/**
 * Import Revogrid, Renderer and Editor for Vue
 */
import Grid, { VGridVueEditor, VGridVueTemplate, Editors } from '@revolist/vue3-datagrid';

import Editor from './Editor.vue';
import Cell from './Cell.vue';

const count = ref(0)
provide('read-only-count', readonly(count));

const MY_EDITOR = 'custom-editor';

// Vue column editor register
const gridEditors: Editors = { [MY_EDITOR]: VGridVueEditor(Editor) };

// Define columns
const columns = [
  {
    prop: 'name',
    name: 'First',
    // editor type
    editor: MY_EDITOR,
    // vue cell component register
    cellTemplate: VGridVueTemplate(Cell),
  },
  {
    prop: 'details',
    name: 'Second',
  },
];
// Define source
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

// For testing events
function testCustomCellAction(e: CustomEvent) {
  console.log('Custom cell action', e);
}
function testAction(e: CustomEvent) {
  console.log('Editor action', e);
}
</script>
```


```vue
// Cell.vue
<template>
  <div ref="cell" @click="customCellClickEvent">{{ rowIndex }}</div>
</template>

<script lang="ts" setup>
import { defineProps, ref, inject } from 'vue';
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid';

const props = defineProps<ColumnDataSchemaModel>();
const cell = ref<HTMLElement>();

const message = inject('sample');
function customCellClickEvent() {
  console.log('Custom cell click > Injected message:', message);
  const event = new CustomEvent('cell-custom-action', {
      bubbles: true,
      detail: { row: props.model },
  });
  cell.value?.dispatchEvent(event);
}
</script>
```

```vue
// Editor.vue
<template>
  <button @click="onBtn">Finish edit</button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  props: ['rowIndex', 'model', 'save', 'close'],
  methods: {
    onBtn(e: MouseEvent) {
      // create and dispatch event
      const event = new CustomEvent('cell', {
        bubbles: true,
        detail: { row: this.model },
      });
      this.$el.dispatchEvent(event);

      e.stopPropagation();
      if (typeof this.close === 'function') {
        (this.close as () => void)();
      }
    },
  },
});
</script>

```


[Example and guide](https://rv-grid.com/guide/vue3/)