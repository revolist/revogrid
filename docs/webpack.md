# Import with webpack:

```javascript
import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements(); // let browser know new component registered

const grid = document.querySelector('revo-grid');
grid.columns = [];
grid.source = [];
```
