import type { PluginProviders } from '../types/plugin.types';
import { BasePlugin } from './base.plugin';

/**
 * Automatically adds new rows when pasted data is larger than current rows
 * @event newRows - is triggered when new rows are added. Data of new rows can be filled with default values. If the event is prevented, no rows will be added
 */
export class AutoAddRowsPlugin extends BasePlugin {
  constructor(revogrid: HTMLRevoGridElement, providers: PluginProviders) {
    super(revogrid, providers);
    this.addEventListener('beforepasteapply', evt =>
      this.handleBeforePasteApply(evt),
    );
  }

  handleBeforePasteApply(
    event: CustomEvent<{
      raw: string;
      parsed: string[][];
      event: ClipboardEvent;
    }>,
  ) {
    const start = this.providers.selection.focused;
    const isEditing = this.providers.selection.edit != null;

    if (!start || isEditing) {
      return;
    }

    const rowLength =
      this.providers.data.stores.rgRow.store.get('items').length;

    const endRow = start.y + event.detail.parsed.length;

    if (rowLength < endRow) {
      const count = endRow - rowLength;
      const newRows = Array.from({ length: count }, (_, i) => ({
        index: rowLength + i,
        data: {},
      }));

      const event = this.emit('newRows', { newRows: newRows });

      if (event.defaultPrevented) {
        return;
      }

      const items = [
        ...this.providers.data.stores.rgRow.store.get('source'),
        ...event.detail.newRows.map(j => j.data),
      ];

      this.providers.data.setData(items);
    }
  }
}
