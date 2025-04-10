const asciiFirstLetter = 65;
const lettersCount = 26;

export function generateHeader(index: number): string {
  let div = index + 1;
  let label = '';
  let pos: number;
  while (div > 0) {
    pos = (div - 1) % lettersCount;
    label = String.fromCharCode(asciiFirstLetter + pos) + label;
    div = parseInt(((div - pos) / lettersCount).toString(), 10);
  }
  return label;
}

export function generateHeaderByCount(colsNumber: number): string[] {
  const rowData: string[] = [];
  for (let j = 0; j < colsNumber; j++) {
    rowData.push(generateHeader(j));
  }
  return rowData;
}
