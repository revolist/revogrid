export function generateHeader(index: number): string {
  const asciiFirstLetter: number = 65;
  const lettersCount: number = 26;
  let div: number = index + 1;
  let label: string = '';
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
  for (let j: number = 0; j < colsNumber; j++) {
    rowData.push(generateHeader(j));
  }
  return rowData;
}
