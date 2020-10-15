<p align="center">
  <a href="https://revolist.github.io/revogrid.demo.js">
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
Handles millions of cells and thousands columns easy and efficiently.
<br>Any major framework or with no framework at all.
  
</p>


<br>


## Features

- Millions of cells virtual viewport scroll with a powerful core is in-build by default. Intelligent Virtual Dom; 
- Column and Row custom sizes;
- Column resizing;
- Pinned columns (columns are always on the left or on the right of the screen);
- Pinned row (rows are always at the top or at the bottom);
- Column grouping;
- Custom header renderer;
- Custom cell renderer templates (build your own cell view);
- Cell editing;
- Custom cell editor (apply your own editors and cell types);
- Custom cell properties;
- Drag and drop rows;
- Column sorting;
- Range selection;
- Theme packages;
- Range edit;
- Copy/Paste, also copy/paste from Excel, Google Sheets or any other sheet format;
- Easy extenation and support with modern VNode features and tsx support;
- Multiple others useful features [RevoGrid](https://revolist.github.io/revogrid.demo.js).



## Content

* [Overview](#overview)
* [Installation](#installation)
* [Framework integration](#framework)
* [Basic Usage](#basic-usage)
* [Demo, Usage samples and Api](https://revolist.github.io/revogrid.demo.js)
* [Grid doc](https://github.com/revolist/revogrid/blob/master/src/components/revo-grid/readme.md)


## Overview

The RevoGrid component helps represent a huge amount of data in a form of data table.
Check for more details [RevoGrid page](https://revolist.github.io/revogrid.demo.js).


![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png) | ![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png) | ![Safari](https://raw.github.com/alrra/browser-logos/master/src/safari/safari_48x48.png) | ![Opera](https://raw.github.com/alrra/browser-logos/master/src/opera/opera_48x48.png) | ![Edge](https://raw.github.com/alrra/browser-logos/master/src/edge/edge_48x48.png) |
--- | --- | --- | --- | --- |
Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ | Latest ✔ |


## Installation

The library published as a [scoped NPM package](https://docs.npmjs.com/misc/scope) in the [NPMJS Revolist account](https://www.npmjs.com/org/revolist).
[Check for more info on our demo side](https://revolist.github.io/revogrid.demo.js/?path=/docs/docs-installing--page).


```bash

// npm
npm i @revolist/revogrid --save;

// yarn
yarn add @revolist/revogrid;
```

## Framework

- [JavaScript](docs/vanilajs.md) or [Storybook Demo and Api](https://revolist.github.io/revogrid.demo.js);
- [VueJs](docs/vue.md) or [Storybook Demo and Api](https://revolist.github.io/revogrid.demo.js);
- [React](docs/react.md) or [Storybook Demo and Api](https://revolist.github.io/revogrid.demo.js);
- [Angular](docs/angular.md).
- [Ember](docs/ember.md).


## Basic Usage

Grid works as web component. 
All you have to do just to place component on the page and access it properties as an element.

```html
<!DOCTYPE html>
<html>
<head>
    // node_modules path
    <script src="node_modules/@revolist/revogrid/dist/revo-grid/revo-grid.js"></script>
    // or with unpkg
    <script src="https://cdn.jsdelivr.net/npm/@revolist/revogrid@latest/dist/revo-grid/revo-grid.js"></script>
    

    // Alternatively, if you wanted to take advantage of ES Modules, you could include the components using an import statement. Note that in this scenario applyPolyfills is needed if you are targeting Edge or IE11.
    <script type="module">
      import { defineCustomElements } from 'https://unpkg.com/@revolist/revogrid@latest/loader/index.es2017.js';
      defineCustomElements();
    </script>
</head>
<body>
    <revo-grid class="grid-component"/>
</body>
</html>
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
        cellTemplate: (h, props) => {
          return h('div', {
            style: {
              backgroundColor: 'red'
            },
            class: 'inner-cell'
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


## Contributing

If you have any idea, feel free to open an issue to discuss a new feature, or fork RevoGrid and submit your changes back to me.

