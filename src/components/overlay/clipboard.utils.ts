import type { ClipboardConfig } from '@type';

export function getRangeFillClipboardData(
  data: string[][],
  useClipboard: boolean | ClipboardConfig,
): string[][] | null {
  if (!isClipboardRangeFillEnabled(useClipboard)) {
    return null;
  }

  const normalized = trimTrailingEmptyClipboardCells(data);
  return normalized.length === 1 && normalized[0]?.length === 1
    ? normalized
    : null;
}

export function isClipboardRangeFillEnabled(
  useClipboard: boolean | ClipboardConfig,
): boolean {
  return (
    typeof useClipboard === 'object' && useClipboard.rangeFill === true
  );
}

function trimTrailingEmptyClipboardCells(data: string[][]): string[][] {
  const rows = [...data];
  while (rows.length > 1 && isEmptyClipboardRow(rows[rows.length - 1])) {
    rows.pop();
  }

  return rows.map(row => {
    const cells = [...row];
    while (cells.length > 1 && cells[cells.length - 1] === '') {
      cells.pop();
    }
    return cells;
  });
}

function isEmptyClipboardRow(row: string[] | undefined): boolean {
  return !row || row.every(cell => cell === '');
}
