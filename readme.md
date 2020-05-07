# Revo Grid

A repository for the virtual grid implementation based on Web Component using Stencil.
Works in any major framework or with no framework at all.

* [Overview](#overview)
* [Installation](#installation)
* [Basic Usage](#basic-usage)
* [Development and support](docs/stenciljs.md)

## Overview

The Revo Grid component helps represent huge amount of data in a form of data table.

Grid supports:

- Column and Row custom sizes.
- Column resizing.
- Virtual scroll in-build by default.
- Custom cell template.


##Installation

The library is published as a [scoped NPM package](https://docs.npmjs.com/misc/scope) in the [NPMJS Revolist account](https://www.npmjs.com/org/revolist).


```bash
npm install --save @revolist/revogrid;
```

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
grid.dimensions = {
    row: {
        0: 70,
        1: 50
    },
    col: {
        0: 120,
        1: 200
    }
};
```


