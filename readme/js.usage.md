### JavaScript Data Grid Simple Usage

```javascript
// Select the RevoGrid element from the DOM
const grid = document.querySelector('revo-grid');

// Define the columns for the grid
grid.columns = [{ prop: 'name', name: 'First Column' }, { prop: 'details' }];
// Define the data source for the grid
grid.source = [{ name: 'New Item', details: 'Item Description' }];
```

### Custom cell template

```javascript
// Select the RevoGrid element from the DOM
const grid = document.querySelector('revo-grid');

// Define the columns for the grid
grid.columns = [
  {
    prop: 'name',
    name: 'Custom cell template',
    // Custom cell template
    cellTemplate(h, { value }) {
      return h(
        'div',
        {
          style: { backgroundColor: 'red' }, // Styling the cell background
          class: { 'inner-cell': true }, // Adding a CSS class
        },
        value || '' // Display the cell content or an empty string if undefined
      );
    },
  },
];
// Define the data source for the grid
grid.source = [{ name: 'New Item' }];
```

[Example and guide](https://rv-grid.com/guide/)
