export function generateHeader(index) {
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

export function generateFakeDataObject(rowsNumber, colsNumber) {
  const result = [];
  const columns = {};
  const all = colsNumber * rowsNumber;
  for (let j = 0; j < all; j++) {
    let col = j % colsNumber;
    let row = (j / colsNumber) | 0;
    if (!result[row]) {
      result[row] = {};
      result[row]['key'] = 'a';
    }
    if (!columns[col]) {
      columns[col] = {
        name: generateHeader(col),
        prop: col,
        pin: j === 0 ? 'colPinStart' : j === 20 ? 'colPinEnd' : undefined,
        sortable: true,
      };
    }
    if (col === 1) {
      result[row][col] = 'A';
    } else {
      result[row][col] = row % 5 ? col : row % 3 ? (col % 3 ? 2 : 3) : row; // row + ':' + col;
    }  
    if (col === 0) {
      columns[col].rowDrag = true;
      // columns[col].order = 'asc';
    }
    if (col === 5) {
      columns[col].autoSize = true;
    }
  }
  const pinnedTopRows = (result[3] && [{ ...result[3] }]) || [];
  const pinnedBottomRows = (result[1] && [result[1]]) || [];
  let headers = Object.keys(columns).map(k => columns[k]);

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
  /* 
    const grouped4 = headers.splice(1, 3);
    */
  /*  */
  /*
    headers.splice(1, 0, ...[{
        name: 'Grouped3',
        children: grouped4
    }]); */
  return {
    rows: result,
    // pinnedTopRows,
    // pinnedBottomRows,
    headers,
  };
}
