### JavaScript Data Grid Usage

```javascript
// Select the RevoGrid element from the DOM
const grid = document.querySelector('revo-grid');

// Define the columns for the grid
const columns = [
  { prop: 'name', name: 'First Column' }, // Simple column definition
  {
    prop: 'details',
    name: 'Second Column',
    // Custom cell template for the 'details' column
    cellTemplate: (createElement, props) => {
      return createElement(
        'div',
        {
          style: { backgroundColor: 'red' }, // Styling the cell background
          class: { 'inner-cell': true }, // Adding a CSS class
        },
        props.model[props.prop] || '' // Display the cell content or an empty string if undefined
      );
    },
  },
];

// Define the data source for the grid
const items = [{ name: 'New Item', details: 'Item Description' }];

// Assign the columns and data source to the grid
grid.columns = columns;
grid.source = items;
```


[Example and guide](https://rv-grid.com/guide/)
