function generateHeader(index) {
  const asciiFirstLetter = 65;
  const lettersCount = 26;
  let div = index + 1;
  let label = '';
  let pos;
  while (div > 0) {
    pos = (div - 1) % lettersCount;
    label = String.fromCharCode(asciiFirstLetter + pos) + label;
    div = parseInt(((div - pos) / lettersCount).toString(), 10);
  }
  return label.toLowerCase();
}

/**
 * Custom sorting apply
 */
function naturalSort(prop, a, b) {
  // check if it's grouping
  const aValue = a['__rvgr-value'] || a[prop];
  const bValue = b['__rvgr-value'] || b[prop];
  return aValue.localeCompare(bValue, 'en', { numeric: true });
}

const DEFAULT_MAX_CELLS_PER_CHUNK = 50_000;

const DEFAULT_CONFIG = {
  topPinned: [],
  groupedHeader: false,
  bottomPinned: [],
  colPinStart: [],
  colPinEnd: [],
  rowDrag: 0,
  rows: 0,
  cols: 0,
  order: undefined,
};

function getConfig(config = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

function createColumn(rgCol, {
  colPinStart,
  colPinEnd,
  rowDrag,
  order,
}) {
  const column = {
    name: generateHeader(rgCol),
    prop: rgCol,
    sortable: true,
    size: 100,
    // custom sorting except of 0 row
    cellCompare: !!rgCol && rgCol % 2 == 0 ? naturalSort : undefined,
    cellProperties: ({ colIndex }) => ({
      className: {
        'first-column': colIndex === 0,
      },
      class: {
        'first-column-class': colIndex === 0,
      },
    }),

    // custom filter
    // filter: 'myFilterType',
  };

  if (colPinStart.indexOf(rgCol) > -1) {
    column.pin = 'colPinStart';
  }
  if (colPinEnd.indexOf(rgCol) > -1) {
    column.pin = 'colPinEnd';
  }
  if (!rgCol) {
    column.order = 'desc';
    column.sortable = true;
    column.cellProperties = ({ rowIndex }) => {
      return {
        'custom-row-index': rowIndex,
      };
    };
    column.rowDrag = true;
  }
  if (rgCol === rowDrag) {
    column.rowDrag = true;
  }
  if (rgCol === order) {
    column.order = 'desc';
  }

  return column;
}

function createColumns(config) {
  const columns = [];
  for (let rgCol = 0; rgCol < config.cols; rgCol++) {
    columns.push(createColumn(rgCol, config));
  }
  return columns;
}

function createRow(rgRow, cols) {
  const row = {};

  if (rgRow === 2) {
    // highlighted
    row['row-style'] = 'highlighted-row';
  }

  // apply different key for grouping
  if (rgRow % 2) {
    row.key = 'a';
  } else {
    row.key = 'b';
  }
  if (rgRow % 4) {
    row.key2 = 'c';
  } else if (rgRow % 3) {
    row.key2 = 'd';
  }

  for (let rgCol = 0; rgCol < cols; rgCol++) {
    row[rgCol] = `${rgRow}:${rgCol}`;
  }

  return row;
}

function applyGroupedHeaders(headers, groupedHeader) {
  if (!groupedHeader || headers.length <= 2) {
    return headers;
  }

  const grouped = headers.splice(1, Math.min(headers.length - 1, 30));
  const grouped2 = grouped.splice(0, Math.min(headers.length - 1, 2));
  grouped2.length && grouped.push({
    name: 'Grouped2',
    children: grouped2,
    columnTemplate: (h, { value }) => {
      return h('div', {
        class: 'grouped-header',
      }, 'Grouped2');
    },
  });
  grouped.length && headers.splice(
    6,
    0,
    ...[
      {
        name: 'Grouped',
        children: grouped,
      },
    ],
  );
  const grouped4 = headers.splice(0, Math.min(headers.length - 1, 4));
  grouped4.length && headers.splice(
    0,
    0,
    ...[
      {
        name: 'Grouped3',
        children: grouped4,
      },
    ],
  );
  return headers;
}

function getPinnedSets(topPinned, bottomPinned) {
  return {
    topPinnedSet: new Set(topPinned),
    bottomPinnedSet: new Set(bottomPinned),
  };
}

function addRow({
  row,
  rgRow,
  result,
  pinnedTopRows,
  pinnedBottomRows,
  topPinnedSet,
  bottomPinnedSet,
}) {
  if (topPinnedSet.has(rgRow)) {
    pinnedTopRows.push({ ...row });
    return;
  }
  if (bottomPinnedSet.has(rgRow)) {
    pinnedBottomRows.push({ ...row });
    return;
  }
  result.push(row);
}

function finishData({ result, pinnedTopRows, pinnedBottomRows, headers, groupedHeader }) {
  return {
    rows: result,
    pinnedTopRows,
    pinnedBottomRows,
    headers: applyGroupedHeaders(headers, groupedHeader),
  };
}

function isCanceled(isCanceledFn) {
  return typeof isCanceledFn === 'function' && isCanceledFn();
}

function yieldToBrowser() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
      return;
    }
    setTimeout(resolve, 0);
  });
}

function getChunkRows(cols, maxCellsPerChunk) {
  if (!cols) {
    return maxCellsPerChunk;
  }
  return Math.max(1, Math.floor(maxCellsPerChunk / cols));
}

export function generateFakeDataObject(config = {}) {
  const {
    topPinned,
    bottomPinned,
    groupedHeader,

    rows,
    cols,
  } = getConfig(config);

  const result = [];
  const headers = createColumns(getConfig(config));
  const pinnedTopRows = [];
  const pinnedBottomRows = [];
  const { topPinnedSet, bottomPinnedSet } = getPinnedSets(topPinned, bottomPinned);

  for (let rgRow = 0; rgRow < rows; rgRow++) {
    addRow({
      row: createRow(rgRow, cols),
      rgRow,
      result,
      pinnedTopRows,
      pinnedBottomRows,
      topPinnedSet,
      bottomPinnedSet,
    });
  }

  return finishData({
    result,
    pinnedTopRows,
    pinnedBottomRows,
    headers,
    groupedHeader,
  });
}

export async function generateFakeDataObjectAsync(config = {}, options = {}) {
  const dataConfig = getConfig(config);
  const {
    rows,
    cols,
    topPinned,
    bottomPinned,
    groupedHeader,
  } = dataConfig;
  const {
    maxCellsPerChunk = DEFAULT_MAX_CELLS_PER_CHUNK,
    onProgress,
    isCanceled: isCanceledFn,
  } = options;

  const result = [];
  const pinnedTopRows = [];
  const pinnedBottomRows = [];
  const headers = createColumns(dataConfig);
  const { topPinnedSet, bottomPinnedSet } = getPinnedSets(topPinned, bottomPinned);
  const chunkRows = getChunkRows(cols, maxCellsPerChunk);

  for (let rgRow = 0; rgRow < rows; rgRow++) {
    if (isCanceled(isCanceledFn)) {
      return null;
    }

    addRow({
      row: createRow(rgRow, cols),
      rgRow,
      result,
      pinnedTopRows,
      pinnedBottomRows,
      topPinnedSet,
      bottomPinnedSet,
    });

    if ((rgRow + 1) % chunkRows === 0) {
      onProgress?.({
        rows: rgRow + 1,
        totalRows: rows,
      });
      await yieldToBrowser();
    }
  }

  if (isCanceled(isCanceledFn)) {
    return null;
  }

  onProgress?.({
    rows,
    totalRows: rows,
  });

  return finishData({
    result,
    pinnedTopRows,
    pinnedBottomRows,
    headers,
    groupedHeader,
  });
}
