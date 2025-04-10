import { generateFakeDataObject } from './data.js';

/**
 * Map of prevented events
 */
window.eventsPrevented = {};

/**
 * Toggle row headers visibility
 * @param {boolean} isShow - Show row headers if true, hide otherwise
 */
window.showRowHeaders = function (isShow) {
  const grid = document.querySelector('revo-grid');
  grid.rowHeaders = isShow;
};

/**
 * Toggle column grouping visibility
 * @param {boolean} isShow - Show column grouping if true, hide otherwise
 */
window.showColGrouping = function (isShow) {
  setData({
    groupedHeader: isShow,
  });
};

/**
 * Set row size
 * @param {number} s - Row size
 */
window.setRowSize = function (s) {
  const grid = document.querySelector('revo-grid');
  grid.rowSize = s;
};

/**
 * Start editing cell
 * @param {number} rgRow - Row index
 * @param {string} prop - Column property
 */
window.setEdit = function (rgRow, prop) {
  const grid = document.querySelector('revo-grid');
  grid.setCellEdit(rgRow, prop);
};

/**
 * Scroll to column
 * @param {number} [x=30] - Column index
 */
window.scrollToCol = function (x = 30) {
  const grid = document.querySelector('revo-grid');
  grid.scrollToColumnProp(x);
};

/**
 * Clear grouping
 */
window.clearGrouping = function () {
  const grid = document.querySelector('revo-grid');
  grid.grouping = {};
};

/**
 * Set row grouping
 * @param {Array} props - Array of properties to group by
 * @param {boolean} expandedAll - Expand all groups if true, collapse otherwise
 */
window.setGrouping = function (props = [], expandedAll = false) {
  const grid = document.querySelector('revo-grid');
  grid.grouping = {
    props,
    expandedAll,
    prevExpanded: { a: true },
    groupLabelTemplate: (createElement, { name, depth }) =>
      createElement('span', null, ` ${props[depth]}: ${name}`),
  };
};

/**
 * Set trimmed rows
 * @param {Array} rows - Array of row indexes to trim
 */
window.setTrimmed = function (rows = []) {
  const grid = document.querySelector('revo-grid');
  grid.trimmedRows = rows.reduce((r, v) => {
    r[v] = true;
    return r;
  }, {});
};

/**
 * Export grid
 * @param {string} [filename='new file'] - File name
 */
window.exportGrid = function (filename = 'new file') {
  const grid = document.querySelector('revo-grid');
  grid.getPlugins().then(plugins => {
    plugins.forEach(p => {
      if (p.exportFile) {
        const exportPlugin = p;
        exportPlugin.exportFile({ filename });
      }
    });
  });
};

let defaultData = {
  rows: 0,
  cols: 0,
  rowDrag: 0,
  topPinned: [],
  bottomPinned: [],
  colPinEnd: [],
  colPinStart: [],
};

/**
 * Set data
 * @param {Object} [config={}] - Data configuration
 */
window.setData = function (config = {}) {
  defaultData = { ...defaultData, ...config };
  const $loader = document.querySelector('.loader');
  $loader.style.display = 'block';
  setTimeout(() => {
    const grid = document.querySelector('revo-grid');
    const data = generateFakeDataObject(defaultData);

    grid.columns = data.headers;
    grid.source = data.rows;

    grid.pinnedTopSource = data.pinnedTopRows;
    grid.pinnedBottomSource = data.pinnedBottomRows;
    $loader.style.display = 'none';
  }, 0);
};

/**
 * Set pinned rows/columns
 * @param {string} type - Type of pinned rows/columns
 * @param {boolean} checked - True if rows/columns are pinned, false otherwise
 */
window.setPinned = function (type, checked) {
  const val = [];
  if (checked) {
    switch (type) {
      case 'colPinStart':
        val.push(0);
        break;
      case 'colPinEnd':
        val.push(1);
        break;
      case 'topPinned':
        val.push(0);
        break;
      case 'bottomPinned':
        val.push(1);
        break;
    }
  }
  setData({
    [type]: val,
  });
};

/**
 * Prevent event debug
 * @param {string} name - Event name
 * @param {boolean} checked - True if event should be prevented, false otherwise
 */
window.preventEvent = function (name, checked) {
  eventsPrevented[name] = checked;
};

let keys = 2;
let attrs = {};

/**
 * Toggle visibility of grid
 * @param {boolean} checked - True if grid is visible, false otherwise
 */
window.toggleVisibility = function (checked) {
  if (!checked) {
    const grid = document.querySelector('revo-grid');
    attrs = {};
    // Get all attributes from the source element
    const attributes = grid.attributes;

    // Loop through the attributes and set them on the target element
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      attrs[attribute.name] = attribute.value;
    }
    grid.remove();
  } else {
    const holder = document.querySelector('.grid-holder');
    const grid = document.createElement('revo-grid', { is: 'revo-grid' });
    // Recover attributes
    Object.keys(attrs).forEach(key => {
      grid.setAttribute(key, attrs[key]);
    });
    grid.setAttribute('key', keys++);
    holder.appendChild(grid);
    setData();
  }
};

let timerUpdateInterval;

/**
 * Toggle timer update
 * @param {boolean} checked - True if timer should be updated, false otherwise
 * @param {number} [inteval=3] - Update interval in seconds
 */
window.timerUpdate = function (checked, inteval = 3) {
  clearInterval(timerUpdateInterval);
  if (checked) {
    timerUpdateInterval = setInterval(() => {
      const grid = document.querySelector('revo-grid');
      grid.source = [...grid.source];
    }, inteval * 1000);
  }
};

/**
 * Set theme
 * @param {string} theme - Theme name
 */
window.theme = function (theme) {
  const grid = document.querySelector('revo-grid');
  if (theme && theme.indexOf('dark') > -1) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-bs-theme');
  }
  grid.theme = theme || 'default';
};

window.onload = onLoad;

window.clearFilter = () => {
  const grid = document.querySelector('revo-grid');
  grid.filter = {};
};

window.setFilter = () => {
  const grid = document.querySelector('revo-grid');
  const filterFunc = (cellValue, extraValue) => {
    if (!cellValue) {
      return false;
    }
    if (typeof cellValue !== 'string') {
      cellValue = JSON.stringify(cellValue);
    }
    return cellValue === extraValue;
  };
  // if you want extra input field for @extraValue
  filterFunc.extra = 'input';

  const filterConfig = {
    // include: ['newEqual'],
    customFilters: {
      newEqual: {
        columnFilterType: 'myFilterType', // column filter type id
        name: 'myEqual',
        func: filterFunc,
      },
    },
    disableDynamicFiltering: true,
    multiFilterItems: {
      0: [
        {
          type: "contains",
          value: '9:0',
        },
      ],
    },
  };

  grid.filter = filterConfig;
};

/**
 * On load function
 */
function onLoad() {
  const grid = document.querySelector('revo-grid');

  grid.readonly = false;
  grid.range = true;
  grid.resize = true;
  grid.filter = true;

  grid.exporting = true;
  grid.rowHeaders = true;
  // grid.rowDefinitions = [{
  //   size: 200,
  //   type: 'rgRow',
  //   index: 2,
  // }];
  // grid.stretch = true;
  /* 
  grid.autoSizeColumn = {
    mode: 'autoSizeAll',
  };*/
  // default
  setData({ rows: 100, cols: 100 });

  // events testing
  // 'beforerange', 'setRange', 'beforefocuslost', 'beforecellfocus', 'afterfocus', 'beforeedit', 'aftercolumnresize'
  const events = ['aftercolumnresize'];
  events.forEach(e => {
    grid.addEventListener(e, $e => {
      if (window.eventsPrevented[e]) {
        $e.preventDefault();
      }
      console.log(
        `%c${e}`,
        'background: #50d260; color: #fff; border-radius: 3px; padding: 2px 5px;',
        $e,
      );
    });
  });
}
