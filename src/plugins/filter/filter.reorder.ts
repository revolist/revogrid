import type { FilterData } from './filter.types';

const FILTER_REORDER_MIME = 'text/revogrid-filter-id';

export function setFilterReorderData(dataTransfer: DataTransfer | null, id: number) {
  if (!dataTransfer) {
    return;
  }
  dataTransfer.effectAllowed = 'move';
  dataTransfer.setData(FILTER_REORDER_MIME, String(id));
  dataTransfer.setData('text/plain', String(id));
}

export function getFilterReorderId(dataTransfer: DataTransfer | null): number | undefined {
  if (!dataTransfer) {
    return;
  }
  const rawId = dataTransfer.getData(FILTER_REORDER_MIME) || dataTransfer.getData('text/plain');
  const normalizedId = rawId.trim();
  if (!normalizedId) {
    return;
  }
  const id = Number(normalizedId);
  return Number.isFinite(id) ? id : undefined;
}

export function moveFilterItem(items: FilterData[], sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) {
    return false;
  }

  const sourceIndex = items.findIndex(item => item.id === sourceId);
  const targetIndex = items.findIndex(item => item.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return false;
  }

  const relationsByPosition = items.map(item => item.relation ?? 'and');
  const [movedItem] = items.splice(sourceIndex, 1);
  items.splice(targetIndex, 0, movedItem);
  items.forEach((item, index) => {
    item.relation = index === items.length - 1
      ? 'and'
      : relationsByPosition[index] ?? 'and';
  });
  return true;
}
