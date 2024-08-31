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

  let result = [];
  const columns = {};
  // all cells
  const all = cols * rows;
  for (let j = 0; j < all; j++) {
    let rgCol = j % cols;
    let rgRow = (j / cols) | 0;
    if (!result[rgRow]) {
      result[rgRow] = {};

      if (rgRow === 2) {
        // highlighted
        result[rgRow]['row-style'] = 'highlighted-row';
      }

      // apply different key for grouping
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
        sortable: true,
        size: 100,
        // custom sorting
        cellCompare: rgCol % 2 == 0 ? naturalSort : undefined,
        cellProperties: ({ colIndex }) => ({
          className: {
            'first-column': colIndex === 0,
          },
          class: {
            'first-column-class': colIndex === 0,
          }
        })

        // custom filter
        // filter: 'myFilterType',

        // cellTemplate: (h, v) => {
        //   // delay
        //   // for(let i = 0; i < 10000000; i++) {
        //   //   // do nothing, this is just to slow down to test performance
        //   // }
        //   return v.model[v.prop];
        // }
      };

      // apply config
      if (colPinStart.indexOf(j) > -1) {
        columns[rgCol].pin = 'colPinStart';
      }
      // apply config
      if (colPinEnd.indexOf(j) > -1) {
        columns[rgCol].pin = 'colPinEnd';
      }
      if (!rgCol) {
        columns[rgCol].order = 'desc';
        columns[rgCol].sortable = true;
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
  const pinnedTopRows = [];
  const pinnedBottomRows = [];
  if (topPinned?.length || bottomPinned?.length) {
    result = result.filter((row, i) => {
      if (topPinned.indexOf(i) > -1) {
        pinnedTopRows.push({ ...row });
        return false;
      }
      if (bottomPinned.indexOf(i) > -1) {
        pinnedBottomRows.push({ ...row });
        return false;
      }
      return true;
    });
  }
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
    headers.splice(
      1,
      0,
      ...[
        {
          name: 'Grouped3',
          children: grouped4,
        },
      ],
    );
  }
  return {
    rows: result,
    pinnedTopRows,
    pinnedBottomRows,
    headers,
  };
}
