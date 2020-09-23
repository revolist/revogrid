<p>
  <a href="https://revolist.github.io/revogrid.demo.js">
    <img src="./assets/logo.svg" alt="RevoGrid" height="150" />
  </a>
  

[![Latest Version on NPM](https://img.shields.io/npm/v/@revolist/revogrid)](https://www.npmjs.com/package/@revolist/revogrid)
[![Software License](https://img.shields.io/npm/l/@revolist/revogrid)](https://github.com/revolist/revogrid/blob/master/LICENSE)
</p>

<p>
Virtual grid implementation based on webcomponent using StencilJs.
Handles millions of rows and columns fast and efficiently.
Works in any major framework (VueJs, React, Ember, Angular) or with no framework at all.
  
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
- Range edit(experimental new feature);
- Easy extenation and support with modern VNode features and tsx support;
- Multiple others useful features [RevoGrid](https://revolist.github.io/revogrid.demo.js).



## Content

* [Overview](#overview)
* [Installation](#installation)
* [Framework integration](#framework)
* [Basic Usage](#basic-usage)
* [Demo and Api](https://revolist.github.io/revogrid.demo.js)


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
npm i @revolist/revogrid --save;
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
    <script src="node_modules/@revolist/revogrid/dist/revo-grid.js"></script>
    // or with unpkg
    <script src="https://unpkg.com/browse/@revolist/revogrid@latest/dist/revo-grid.js"></script>
    

    // Alternatively, if you wanted to take advantage of ES Modules, you could include the components using an import statement. Note that in this scenario applyPolyfills is needed if you are targeting Edge or IE11.
    <script type="module">
        import { applyPolyfills, defineCustomElements } from 'https://unpkg.com/browse/@revolist/revogrid@latest/loader';
        applyPolyfills().then(() => {
          defineCustomElements();
        });
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

