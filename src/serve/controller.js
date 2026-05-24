import { generateFakeDataObjectAsync } from './data.js';

/**
 * Map of prevented events
 */
globalThis.eventsPrevented = {};

/**
 * Toggle row headers visibility
 * @param {boolean} isShow - Show row headers if true, hide otherwise
 */
globalThis.showRowHeaders = function (isShow) {
  const grid = document.querySelector('revo-grid');
  grid.rowHeaders = isShow;
};

/**
 * Toggle column grouping visibility
 * @param {boolean} isShow - Show column grouping if true, hide otherwise
 */
globalThis.showColGrouping = function (isShow) {
  globalThis.setData({
    groupedHeader: isShow,
  });
};

/**
 * Set row size
 * @param {number} s - Row size
 */
globalThis.setRowSize = function (s) {
  const grid = document.querySelector('revo-grid');
  grid.rowSize = s;
};

/**
 * Start editing cell
 * @param {number} rgRow - Row index
 * @param {string} prop - Column property
 */
globalThis.setEdit = function (rgRow, prop) {
  const grid = document.querySelector('revo-grid');
  grid.setCellEdit(rgRow, prop);
};

/**
 * Scroll to column
 * @param {number} [x=30] - Column index
 */
globalThis.scrollToCol = function (x = 30) {
  const grid = document.querySelector('revo-grid');
  grid.scrollToColumnProp(x);
};

/**
 * Clear grouping
 */
globalThis.clearGrouping = function () {
  const grid = document.querySelector('revo-grid');
  grid.grouping = {};
};

/**
 * Set row grouping
 * @param {Array} props - Array of properties to group by
 * @param {boolean} expandedAll - Expand all groups if true, collapse otherwise
 */
globalThis.setGrouping = function (props = [], expandedAll = false) {
  const grid = document.querySelector('revo-grid');
  grid.grouping = {
    props,
    expandedAll,
    prevExpanded: { 'a': true, 'a,c': true },
    groupLabelTemplate(createElement, { name, depth, expanded, providers }) {
      if (providers.colType !== 'rgCol') return;
      return createElement('span', null, `${expanded ? '-' : '+'} ${props[depth]}: ${name}`);
    },
  };
};

/**
 * Set trimmed rows
 * @param {Array} rows - Array of row indexes to trim
 */
globalThis.setTrimmed = function (rows = []) {
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
globalThis.exportGrid = function (filename = 'new file') {
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

let dataGenerationId = 0;

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(value);
}

function setLoader(text, visible = true) {
  const $loader = document.querySelector('.loader');
  if (!$loader) {
    return;
  }
  $loader.textContent = text;
  $loader.style.display = visible ? 'block' : 'none';
}

function cancelDataGeneration() {
  dataGenerationId++;
  setLoader('', false);
}

/**
 * Set data
 * @param {Object} [config={}] - Data configuration
 */
globalThis.setData = async function (config = {}) {
  defaultData = { ...defaultData, ...config };
  const generationId = ++dataGenerationId;
  const totalCells = defaultData.rows * defaultData.cols;
  setLoader(`Preparing ${formatNumber(defaultData.rows)} rows x ${formatNumber(defaultData.cols)} columns...`);

  try {
    // Let the loader paint before data generation starts.
    await new Promise(resolve => setTimeout(resolve, 0));
    const grid = document.querySelector('revo-grid');
    const data = await generateFakeDataObjectAsync(defaultData, {
      isCanceled: () => generationId !== dataGenerationId,
      onProgress: ({ rows, totalRows }) => {
        if (generationId !== dataGenerationId) {
          return;
        }
        setLoader(
          `Generated ${formatNumber(rows)} / ${formatNumber(totalRows)} rows (${formatNumber(totalCells)} cells)...`,
        );
      },
    });

    if (generationId !== dataGenerationId || !data) {
      return;
    }

    grid.columns = data.headers;
    grid.source = data.rows;

    grid.pinnedTopSource = data.pinnedTopRows;
    grid.pinnedBottomSource = data.pinnedBottomRows;
    setLoader('', false);
  } catch (error) {
    if (generationId === dataGenerationId) {
      setLoader(`Data generation failed: ${error?.message || error}`);
      throw error;
    }
  }
};

globalThis.setRtl = function (checked) {
  const grid = document.querySelector('revo-grid');
  grid.rtl = checked;
  globalThis.document.dir = checked ? 'rtl' : 'ltr';
};

/**
 * Set pinned rows/columns
 * @param {string} type - Type of pinned rows/columns
 * @param {boolean} checked - True if rows/columns are pinned, false otherwise
 */
globalThis.setPinned = function (type, checked) {
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
  globalThis.setData({
    [type]: val,
  });
};

/**
 * Prevent event debug
 * @param {string} name - Event name
 * @param {boolean} checked - True if event should be prevented, false otherwise
 */
globalThis.preventEvent = function (name, checked) {
  globalThis.eventsPrevented[name] = checked;
};

let keys = 2;
let attrs = {};

/**
 * Toggle visibility of grid
 * @param {boolean} checked - True if grid is visible, false otherwise
 */
globalThis.toggleVisibility = function (checked) {
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
    globalThis.setData();
  }
};

let timerUpdateInterval;

/**
 * Toggle timer update
 * @param {boolean} checked - True if timer should be updated, false otherwise
 * @param {number} [inteval=3] - Update interval in seconds
 */
globalThis.timerUpdate = function (checked, inteval = 3) {
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
globalThis.theme = function (theme) {
  const grid = document.querySelector('revo-grid');
  if (theme && theme.includes('dark')) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-bs-theme');
  }
  grid.theme = theme || 'default';
};

globalThis.onload = onLoad;

globalThis.clearFilter = () => {
  const grid = document.querySelector('revo-grid');
  grid.filter = {};
};

globalThis.sortColumn = (columnProp= 0, additive = false) => {
  const grid = document.querySelector('revo-grid');
  grid.updateColumnSorting({
    prop: columnProp,
  }, 'asc', additive);
};

globalThis.clearSorting = () => {
  const grid = document.querySelector('revo-grid');
  grid.clearSorting();
};

globalThis.setFilter = () => {
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
 * Deep groups should align with a1/a2/a3/b1/b2/b3.
 * https://github.com/revolist/revogrid/issues/828
 */
globalThis.setColumnGroupOffsetBugDemo = () => {
  cancelDataGeneration();
  const grid = document.querySelector('revo-grid');

  grid.columns = [
    { prop: 'q1', name: 'Q1', size: 90 },
    { prop: 'q2', name: 'Q2', size: 90 },
    {
      name: 'Root',
      children: [
        {
          name: 'A',
          children: [
            {
              name: 'A1',
              children: [
                { prop: 'a1', name: 'A1-1', size: 90 },
                { prop: 'a2', name: 'A1-2', size: 90 },
              ],
            },
            {
              name: 'A2',
              children: [{ prop: 'a3', name: 'A2-1', size: 90 }],
            },
          ],
        },
        {
          name: 'B',
          children: [
            {
              name: 'B1',
              children: [{ prop: 'b1', name: 'B1-1', size: 90 }],
            },
            {
              name: 'B2',
              children: [
                { prop: 'b2', name: 'B2-1', size: 90 },
                { prop: 'b3', name: 'B2-2', size: 90 },
              ],
            },
          ],
        },
      ],
    },
  ];

  grid.source = [
    { q1: 'left-1', q2: 'left-2', a1: 'a1', a2: 'a2', a3: 'a3', b1: 'b1', b2: 'b2', b3: 'b3' },
    { q1: 'left-3', q2: 'left-4', a1: 'a4', a2: 'a5', a3: 'a6', b1: 'b4', b2: 'b5', b3: 'b6' },
  ];

  grid.pinnedTopSource = [];
  grid.pinnedBottomSource = [];
  grid.rowHeaders = true;
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
      if (globalThis.eventsPrevented[e]) {
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
