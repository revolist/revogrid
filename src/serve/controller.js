import { generateFakeDataObjectAsync } from './data.js';
import { modernThemeDefinitions } from './build/index.esm.js';
import { createFrameworkMount, uiComponents } from './revo-ui/revo-ui.js';

const dataPresets = {
  '1 × 1': { rows: 1, cols: 1 },
  '20 × 2': { rows: 20, cols: 2 },
  '100 × 100': { rows: 100, cols: 100 },
  '1K × 1K': { rows: 1000, cols: 1000 },
  '10K × 5K': { rows: 10000, cols: 5000 },
  '1M × 2': { rows: 1000000, cols: 2 },
};
const initialDataPreset = '100 × 100';

const themes = {
  default: 'Excel',
  material: 'Material',
  darkMaterial: 'Material dark',
  compact: 'Compact',
  darkCompact: 'Compact dark',
  ocean: 'Ocean',
  midnight: 'Midnight',
  aurora: 'Aurora',
  highContrast: 'High contrast',
  highContrastDark: 'High contrast dark',
};

const pinPositions = [
  { value: 'topPinned', label: 'Top', index: 0 },
  { value: 'bottomPinned', label: 'Bottom', index: 1 },
  { value: 'colPinStart', label: 'Left', index: 0 },
  { value: 'colPinEnd', label: 'Right', index: 1 },
];

function mountPicker(id, component, source, { value, onChange, placeholder, actionOnly = false }) {
  const mount = createFrameworkMount(document.getElementById(`${id}-picker`), () => {}, { styles: false });
  const render = () => mount.render(component, {
    source,
    value,
    placeholder,
    className: component === uiComponents.Dropdown ? 'rv-select' : undefined,
    config: { ariaLabelledBy: `${id}-label`, topLayer: true },
    onChange(nextValue) {
      if (!actionOnly) {
        value = nextValue;
        render();
      }
      onChange(nextValue);
    },
  });
  render();
}

function mountActionPicker(id, placeholder, actions) {
  mountPicker(id, uiComponents.Dropdown,
    Object.keys(actions).map(value => ({ value, label: value })), {
      onChange: value => actions[value](),
      placeholder,
      actionOnly: true,
    });
}

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
  void globalThis.setData({
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
 * Apply several custom row sizes.
 */
globalThis.setCustomRowSizes = function () {
  const grid = document.querySelector('revo-grid');
  grid.rowDefinitions = [
    { type: 'rgRow', index: 1, size: 64 },
    { type: 'rgRow', index: 3, size: 96 },
    { type: 'rgRow', index: 6, size: 48 },
    { type: 'rgRow', index: 10, size: 120 },
  ];
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
    groupCellTemplate(createElement, { column, group, value }) {
      if (group.isLabelColumn) {
        const { name } = group;
        const label = `${group.prop}: ${name == null || name === '' ? '(empty)' : name}`;
        if (!group.canExpand) {
          return label;
        }
        const button = createElement('button', {
          type: 'button',
          class: 'group-expand',
          'aria-expanded': String(group.expanded),
          'aria-label': `${group.expanded ? 'Collapse' : 'Expand'} ${label}`,
          onClick: group.onExpand,
        }, group.expanded ? '−' : '+');
        return createElement('span', null, button, label);
      }
      if (column.prop === 1 && value === undefined) {
        return createElement('span', { class: 'text-muted' }, 'Paste a note');
      }
      return value ?? null;
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

    const grid = document.querySelector('revo-grid');
    if (!grid) {
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

function setPinned(positions) {
  void globalThis.setData(Object.fromEntries(pinPositions.map(({ value, index }) => [
    value, positions.includes(value) ? [index] : [],
  ])));
}

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
    void globalThis.setData();
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
  const selectedTheme = theme || 'default';
  const definition = modernThemeDefinitions.find(
    item => item.name === selectedTheme,
  );
  const dark = definition?.colorScheme === 'dark' || selectedTheme.toLowerCase().includes('dark');
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  grid.theme = selectedTheme;
};

globalThis.onload = onLoad;

globalThis.clearFilter = () => {
  const grid = document.querySelector('revo-grid');
  grid.filter = {};
};

globalThis.sortColumn = (columnProp= 0, additive = false) => {
  const grid = document.querySelector('revo-grid');
  void grid.updateColumnSorting({
    prop: columnProp,
  }, 'asc', additive);
};

globalThis.clearSorting = () => {
  const grid = document.querySelector('revo-grid');
  void grid.clearSorting();
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

  grid.themeDefinitions = modernThemeDefinitions;
  grid.readonly = false;
  grid.range = true;
  grid.useClipboard = { rangeFill: true };
  grid.resize = true;
  grid.resizeRow = { fullRow: true };
  grid.filter = { disableDynamicFiltering: true };

  grid.exporting = true;
  grid.rowHeaders = true;
  const initialTheme = new URLSearchParams(location.search).get('theme') || 'default';
  globalThis.theme(initialTheme);
  mountPicker('data', uiComponents.Dropdown,
    Object.keys(dataPresets).map(value => ({ value, label: value })), {
      value: initialDataPreset,
      onChange: value => void globalThis.setData(dataPresets[value]),
    });
  mountPicker('theme', uiComponents.Dropdown,
    Object.entries(themes).map(([value, label]) => ({ value, label })), {
      value: Object.hasOwn(themes, initialTheme) ? initialTheme : 'default',
      onChange: globalThis.theme,
    });
  mountPicker('pin', uiComponents.MultiSelect, pinPositions, {
    value: [],
    onChange: setPinned,
    placeholder: 'Select positions',
  });
  mountActionPicker('filter', 'Filter actions', {
    'Set filter': globalThis.setFilter,
    'Clear filter': globalThis.clearFilter,
    'Trim 3rd row': () => globalThis.setTrimmed([2]),
    'Clear trimmed': () => globalThis.setTrimmed([]),
  });
  mountActionPicker('sorting', 'Sorting actions', {
    'Sort 2nd': () => globalThis.sortColumn(1),
    'Clear sorting': globalThis.clearSorting,
  });
  mountActionPicker('row-grouping', 'Row grouping actions', {
    'Group rows': () => globalThis.setGrouping(['key', 'key2']),
    'Clear row grouping': globalThis.clearGrouping,
  });
  mountActionPicker('column-grouping', 'Column grouping actions', {
    'Group columns': () => globalThis.showColGrouping(true),
    'Clear column grouping': () => globalThis.showColGrouping(false),
    'Column grouping demo': globalThis.setColumnGroupOffsetBugDemo,
  });
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
  void globalThis.setData(dataPresets[initialDataPreset]);

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
