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

function naturalSort(prop,a,b) {

  return a[prop].localeCompare(b[prop],"en",{numeric:true})
}

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

export function generateFakeDataObject(config = {}) {
  const {
    topPinned,
    bottomPinned,
    colPinStart,
    colPinEnd,
    groupedHeader,

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
    let rgCol = j % cols;
    let rgRow = (j / cols) | 0;
    if (!result[rgRow]) {
      result[rgRow] = {};

      if (rgRow % 2) {
        result[rgRow].key = 'a';
      } else {
        result[rgRow].key = 'b';
      }
    }
    if (!columns[rgCol]) {
      columns[rgCol] = {
        name: generateHeader(rgCol),
        prop: rgCol,
        filter:"myFilterType",
        sortable: true,
        size: 200,
        cellCompare: (rgCol % 2) == 0 ? naturalSort : undefined
      };

      // apply config
      if (colPinStart.indexOf(j) > -1) {
        columns[rgCol].pin = 'colPinStart';
      }
      // apply config
      if (colPinEnd.indexOf(j) > -1) {
        columns[rgCol].pin = 'colPinEnd';
      }
    }
    result[rgRow][rgCol] = `${rgRow}:${rgCol}`; // rgRow % 5 ? rgCol : rgRow % 3 ? (rgCol % 3 ? 2 : 3) : rgRow; // rgRow + ':' + rgCol;

    if (rgCol === 1) {
      result[rgRow][rgCol] = 'A';
    }
   // apply config
    if (rgCol === rowDrag) {
      columns[rgCol].rowDrag = true;
    }
    // apply config
    if (rgCol === order) {
      columns[rgCol].order = 'desc';
    }
  }
  // apply config
  const pinnedTopRows = topPinned.map(i => ({ ...result[i] }));
  // apply config
  const pinnedBottomRows = bottomPinned.map(i => ({ ...result[i] }));
  let headers = Object.keys(columns).map(k => columns[k]);

  if (groupedHeader) {
    const grouped = headers.splice(1, 4);
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
      }]);
  }
  return {
    rows: result,
    pinnedTopRows,
    pinnedBottomRows,
    headers,
  };
}

