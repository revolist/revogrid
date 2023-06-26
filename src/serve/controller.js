import { generateFakeDataObject } from './data.js';

window.eventsPrevented = {};
window.showRowHeaders = function (isShow) {
  const grid = document.querySelector('revo-grid');
  grid.rowHeaders = isShow;
};
window.showColGrouping = function (isShow) {
  setData({
    groupedHeader: isShow,
  });
};
window.setRowSize = function (s) {
  const grid = document.querySelector('revo-grid');
  grid.rowSize = s;
};
window.setEdit = function (rgRow, prop) {
  const grid = document.querySelector('revo-grid');
  grid.setCellEdit(rgRow, prop);
};
window.scrollToCol = function (x = 30) {
  const grid = document.querySelector('revo-grid');
  grid.scrollToColumnProp(x);
};
window.clearGrouping = function () {
  const grid = document.querySelector('revo-grid');
  grid.grouping = {};
};
window.setGrouping = function (props = [], expandedAll = false, groupLabelTemplate) {
  const grid = document.querySelector('revo-grid');
  groupLabelTemplate = (createElement, { name, depth }) => {
    return createElement('span', null, `${props[depth]}: ${name}`);
  };
  grid.grouping = { props, expandedAll, groupLabelTemplate };
};
window.setTrimmed = function (rows = []) {
  const grid = document.querySelector('revo-grid');
  grid.trimmedRows = rows.reduce((r, v) => {
    r[v] = true;
    return r;
  }, {});
};

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
  topPinned: [],
  bottomPinned: [],
  colPinEnd: [],
  colPinStart: [],
  // groupedHeader: true,
  // order: 5
};
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
window.preventEvent = function (name, checked) {
  eventsPrevented[name] = checked;
};
let keys = 2;
window.toggleVisibility = function (checked) {
  if (!checked) {
    const grid = document.querySelector('revo-grid');
    grid.remove();
  } else {
    const holder = document.querySelector('.grid-holder');
    const grid = document.createElement('revo-grid', { is: 'revo-grid' });
    grid.setAttribute('key', keys++);
    holder.appendChild(grid);
    setData();
  }
};


window.onload = onLoad;

function onLoad() {
  const grid = document.querySelector('revo-grid');

  grid.readonly = false;
  grid.range = true;
  grid.resize = true;

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
    include: ['newEqual'],
    customFilters: {
      newEqual: {
        columnFilterType: 'myFilterType', // column filter type id
        name: 'myEqual',
        func: filterFunc,
      },
    },
    disableDynamicFiltering: true,
  };

  grid.filter = filterConfig;
  // grid.stretch = true;
  grid.exporting = true;
  grid.rowDefinitions = [
    {
      type: 'rgRow',
      index: 1,
      size: 100,
    },
  ];
  /* 
  grid.autoSizeColumn = {
    mode: 'autoSizeAll',
  };*/
  // default
  setData({ rows: 1000, cols: 1000 });

  // events testing
  // 'beforerange', 'setRange', 'beforefocuslost', 'beforecellfocus', 'afterfocus', 'beforeedit', 'aftercolumnresize'
  const events = [];
  events.forEach(e => {
    grid.addEventListener(e, $e => {
      if (window.eventsPrevented[e]) {
        $e.preventDefault();
      }
      console.log(`%c${e}`, 'background: #50d260; color: #fff; border-radius: 3px; padding: 2px 5px;', $e);
    });
  });
}
