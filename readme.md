<p align="center">
  <a href="https://revolist.github.io/revogrid">
    <img src="./assets/logo.svg" alt="RevoGrid" height="150" />
  </a>
</p>

##
<p align="center">
  <a href="https://www.npmjs.com/package/@revolist/revogrid"><img src="https://img.shields.io/npm/v/@revolist/revogrid" alt="Latest Version on NPM"/></a>
  <a href="https://github.com/revolist/revogrid/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@revolist/revogrid" alt="Software License"/></a>
</p>
<h4 align="center">Powerful data grid component built on top of <a href="https://stenciljs.com" target="_blank">StencilJS</a>.</h4>
<p align="center">
Support Millions of cells and thousands columns easy and efficiently for fast data rendering. Easy to use.
  
</p>

<p align="center">
  <a href="https://revolist.github.io/revogrid">Demo and API</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#basic-usage">How To Use</a> •
  <a href="#installation">Installation</a> •
  <a href="https://github.com/revolist/revogrid/blob/master/src/components/revo-grid/readme.md">Docs</a> •
  <a href="#license">License</a>
</p>

<img src="./assets/material.jpg" alt="Material grid preview" width="100%" />
<i>RevoGrid material theme.</i>
<br>


## Key Features

- Millions of cells virtual viewport scroll with a powerful core is in-build by default. 
  Intelligent Virtual DOM and smart row recombination in order to achieve less redraws;
- Column and Row custom sizes;
- Column resizing;
- Pinned columns (columns are always on the left or on the right of the screen);
- Pinned row (rows are always at the top or at the bottom);
- Column grouping;
- Cell editing;
- Custom header renderer;
- Custom cell renderer templates (build your own cell view);
- Custom cell editor (apply your own editors and cell types);
- Custom cell properties;
- Drag and drop rows;
- Column sorting;
- Range selection;
- Range edit;
- Theme packages: Excel like, material, compact, dark or light;
- Copy/Paste: Copy/paste from Excel, Google Sheets or any other sheet format;
- Easy extenation and support with modern VNode features and tsx support;
- Hundred small customizations and improvements [RevoGrid](https://revolist.github.io/revogrid).


## Overview

The RevoGrid component helps represent a huge amount of data in a form of data table "excel like" or as list.
<br>

![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ |


## Installation

The library published as a [scoped NPM package](https://docs.npmjs.com/misc/scope) in the [NPMJS Revolist account](https://www.npmjs.com/org/revolist).
[Check for more info on our demo side](https://revolist.github.io/revogrid/guide/installing.html).

With NPM:
```bash
npm i @revolist/revogrid --save;
```

With Yarn:

```bash
yarn add @revolist/revogrid;
```

## Framework

- [JavaScript](https://revolist.github.io/revogrid/guide);
- [VueJs](https://revolist.github.io/revogrid/guide/framework.vue);
- [React](https://revolist.github.io/revogrid/guide/framework.react);
- [Angular](docs/angular.md).
- [Ember](docs/ember.md).


## Basic Usage

Grid works as web component. 
All you have to do just to place component on the page and access it properties as an element.

### Add component to your project with index.html:


```html
<!DOCTYPE html>
<html>
<head>
  
// Import from node modules
<script src="node_modules/@revolist/revogrid/dist/revo-grid/revo-grid.js"></script>

// With unpkg
<script src="https://cdn.jsdelivr.net/npm/@revolist/revogrid@latest/dist/revo-grid/revo-grid.js"></script>

</head>
<body>
    // after you imported file to your project simply define component
    <revo-grid class="grid-component"/>
</body>
</html>
```

### Or import as module:

Alternatively, if you wanted to take advantage of ES Modules, you could include the components using an import statement. 
Note that in this scenario applyPolyfills is needed if you are targeting Edge or IE11.
```html
<script type="module">
  import { defineCustomElements, applyPolyfills } from 'https://unpkg.com/@revolist/revogrid@latest/loader/index.es2017.js';
  defineCustomElements();
</script>
```

### Or import with webpack:

```javascript
import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements(); // let browser know new component registered
```

```javascript
const grid = document.querySelector('revo-grid');
const columns = [
    {
        prop: 'name',
        name: 'First column'
    },
    {
        prop: 'details',
        name: 'Second column',
        cellTemplate: (createElement, props) => {
          return createElement('div', {
            style: {
              backgroundColor: 'red'
            },
            class: {
              'inner-cell': true
            }
          }, props.model[props.prop] || '');
        }
    }
];
const items = [{
    name: 'New item',
    details: 'Item description'
}];

grid.columns = columns;
grid.source = items;
```

## Usage VueJs

```vue
<template>
  <div id="app">
    <v-grid
      v-if="grid === 1"
      key="1"
      theme="compact"
      :source="rows"
      :columns="columns"
    ></v-grid>
  </div>
</template>

<script>
import VGrid from "@revolist/vue-datagrid";
export default {
  name: "App",
  data() {
    return {
      columns: [
        {
          prop: "name",
          name: "First",
        },
        {
          prop: "details",
          name: "Second",
        },
      ],
      rows: [
        {
          name: "1",
          details: "Item 1",
        },
      ]
    };
  },
  components: {
    VGrid,
  },
};
</script>
```

## Contributing

If you have any idea, feel free to open an issue to discuss a new feature, or fork RevoGrid and submit your changes back to me.


## License

MIT

---

