<p align="center">
  <a href="https://github.com/revolist/revogrid">
    <img src="./assets/logo.svg" alt="RevoGrid" width="400" />
  </a>
</p>

<p align="center">
A repository for the virtual grid implementation based on webcomponent using StencilJs.
Works in any major framework or with no framework at all.
</p>

<br>

## Content

* [Overview](#overview)
* [Installation](#installation)
* [Framework integration](#framework)
* [Basic Usage](#basic-usage)

## Overview

The RevoGrid component helps represent a huge amount of data in a form of data table.
Check Storybook for more details [RevoGrid Demo](https://revolist.github.io/revogrid.demo.js).

Grid supports:

- Column and Row custom sizes;
- Column resizing;
- Pinned columns and rows;
- Column grouping;
- The virtual scroll with a powerful core is in-build by default;
- Custom cell template;
- Cell editing;
- Multiple others useful features [RevoGrid Demo](https://revolist.github.io/revogrid.demo.js).

## Installation

The library published as a [scoped NPM package](https://docs.npmjs.com/misc/scope) in the [NPMJS Revolist account](https://www.npmjs.com/org/revolist).
[Check for more info on our demo side](https://revolist.github.io/revogrid.demo.js/?path=/docs/docs-installing--page).


```bash
npm install --save @revolist/revogrid;
```

## Framework

- [JavaScript](docs/vanilajs.md) or [Storybook Demo](https://revolist.github.io/revogrid.demo.js);
- [VueJs](docs/vue.md) or [Storybook Demo](https://revolist.github.io/revogrid.demo.js);
- [React](docs/react.md) or [Storybook Demo](https://revolist.github.io/revogrid.demo.js);
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


