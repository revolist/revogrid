import { Component, Listen, Method, Event, EventEmitter } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

@Component({ tag: 'revogr-clipboard' })
export class Clipboard {
  /**
   * Fired when region pasted
   * @event pasteregion
   * @property {string[][]} data - data to paste
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ bubbles: false }) pasteRegion: EventEmitter<string[][]>;

  /**
   * Fired before paste applied to the grid
   * @event beforepaste
   * @property {string} raw - raw data from clipboard
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ eventName: 'beforepaste' }) beforePaste: EventEmitter;

  /**
   * Fired before paste applied to the grid and after data parsed
   * @event beforepasteapply
   * @property {string} raw - raw data from clipboard
   * @property {string[][]} parsed - parsed data
   */
  @Event({ eventName: 'beforepasteapply' }) beforePasteApply: EventEmitter;

  /**
   * Fired after paste applied to the grid
   * @event afterpasteapply
   * @property {string} raw - raw data from clipboard
   * @property {string[][]} parsed - parsed data
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, paste will be canceled
   */
  @Event({ eventName: 'afterpasteapply' }) afterPasteApply: EventEmitter;


  /**
   * Fired before copy triggered
   * @event beforecopy
   * @property {ClipboardEvent} event - original event
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ eventName: 'beforecopy' }) beforeCopy: EventEmitter;

  /**
   * Fired before copy applied to the clipboard
   * @event beforecopyapply
   * @property {DataTransfer} event - original event
   * @property {string} data - data to copy
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ eventName: 'beforecopyapply' }) beforeCopyApply: EventEmitter;

  /**
   * Fired when region copied
   * @event copyregion
   * @property {DataTransfer} data - data to copy
   * @property {boolean} defaultPrevented - if true, copy will be canceled
   */
  @Event({ bubbles: false }) copyRegion: EventEmitter<DataTransfer>;
  @Listen('paste', { target: 'document' }) onPaste(e: ClipboardEvent) {
    const clipboardData = this.getData(e);
    const isHTML = clipboardData.types.indexOf('text/html') > -1;
    const data = isHTML ? clipboardData.getData('text/html') : clipboardData.getData('text');
    const beforePaste = this.beforePaste.emit({
      raw: data,
      event: e,
    });

    if (beforePaste.defaultPrevented) {
      return;
    }

    const parsedData = isHTML ? this.htmlParse(beforePaste.detail.raw) : this.textParse(beforePaste.detail.raw);
    const beforePasteApply = this.beforePasteApply.emit({
      raw: data,
      parsed: parsedData,
      event: e,
    });
    if (beforePasteApply.defaultPrevented) {
      return;
    }
    this.pasteRegion.emit(beforePasteApply.detail.parsed);
    const afterPasteApply = this.afterPasteApply.emit({
      raw: data,
      parsed: parsedData,
      event: e,
    });
    if (afterPasteApply.defaultPrevented) {
      return;
    }
    e.preventDefault();
  }

  @Listen('copy', { target: 'document' }) copyStarted(e: ClipboardEvent) {
    const beforeCopy = this.beforeCopy.emit({
      event: e,
    });
    if (beforeCopy.defaultPrevented) {
      return;
    }
    const data = this.getData(e);
    this.copyRegion.emit(data);
    e.preventDefault();
  }

  @Method() async doCopy(e: DataTransfer, data?: RevoGrid.DataFormat[][]) {
    const parsed = data ? this.parserCopy(data) : '';
    const beforeCopyApply = this.beforeCopyApply.emit({
      event: e,
      data: parsed,
    });
    if (beforeCopyApply.defaultPrevented) {
      return;
    }
    e.setData('text/plain', beforeCopyApply.detail.data);
  }

  parserCopy(data: RevoGrid.DataFormat[][]) {
    return data.map(rgRow => rgRow.join('\t')).join('\n');
  }

  private textParse(data: string) {
    const result: string[][] = [];
    const rows = data.split(/\r\n|\n|\r/);
    for (let y in rows) {
      result.push(rows[y].split('\t'));
    }
    return result;
  }

  private htmlParse(data: string) {
    const result: string[][] = [];
    const fragment = document.createRange().createContextualFragment(data);
    const table = fragment.querySelector('table');
    if (!table) {
      return this.textParse(data);
    }
    for (const rgRow of Array.from(table.rows)) {
      result.push(Array.from(rgRow.cells).map(cell => cell.innerText));
    }
    return result;
  }

  private getData(e: ClipboardEvent) {
    return e.clipboardData || ((window as unknown) as { clipboardData: DataTransfer | null })?.clipboardData;
  }
}
