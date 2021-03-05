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

const DEFAULT_CONFIG = {
  topPinned: [],
  bottomPinned: [],
  colPinStart: [],
  colPinEnd: [],
  rowDrag: 0,
  rows: 0,
  cols: 0,
  order: undefined,
};

export function generateFakeDataObject(config = {}) {
  const {
    topPinned,
    bottomPinned,
    colPinStart,
    colPinEnd,

    rowDrag,
    rows,
    cols,
    order,
  } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const result = [];
  const columns = {};
  const all = cols * rows;
  for (let j = 0; j < all; j++) {
    let col = j % cols;
    let row = (j / cols) | 0;
    if (!result[row]) {
      result[row] = {};

      if (row % 2) {
        result[row].key = 'a';
      } else {
        result[row].key = 'b';
      }
    }
    if (!columns[col]) {
      columns[col] = {
        name: generateHeader(col),
        prop: col,
        sortable: true,
      };

      // apply config
      if (colPinStart.indexOf(j) > -1) {
        columns[col].pin = 'colPinStart';
      }
      // apply config
      if (colPinEnd.indexOf(j) > -1) {
        columns[col].pin = 'colPinEnd';
      }
    }
    /** grouping by hidden field
    if (col === 1) {
      result[row][col] = 'A';
    }
    */
    result[row][col] = `${row}:${col}`; // row % 5 ? col : row % 3 ? (col % 3 ? 2 : 3) : row; // row + ':' + col;
    // apply config
    if (col === rowDrag) {
      columns[col].rowDrag = true;
    }
    // apply config
    if (col === order) {
      columns[col].order = 'asc';
    }
  }
  // apply config
  const pinnedTopRows = topPinned.map(i => ({ ...result[i] }));
  // apply config
  const pinnedBottomRows = bottomPinned.map(i => ({ ...result[i] }));
  let headers = Object.keys(columns).map(k => columns[k]);

  /* const grouped = headers.splice(1, 4);
    const grouped2 = grouped.splice(0, 2);
    grouped.push({
      name: 'Grouped2',
      children: grouped2,
    });
    headers.splice(
      6,
      0,
      ...[
        {
          name: 'Grouped',
          children: grouped,
        },
      ],
    );
    const grouped4 = headers.splice(1, 3);
    headers.splice(1, 0, ...[{
        name: 'Grouped3',
        children: grouped4
    }]); */
  return {
    rows: result,
    pinnedTopRows,
    pinnedBottomRows,
    headers,
  };
}

