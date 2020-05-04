export function generateFakeData(rowsNumber: number, colsNumber: number): string[][] {
  const result = [];
  const rowData: string[] = [];
  for (let j: number = 0; j < colsNumber; j++) {
    rowData.push(j.toString());
  }
  for (let i = 0; i < rowsNumber; i++) {
    result.push(rowData);
  }
  return result;
}
