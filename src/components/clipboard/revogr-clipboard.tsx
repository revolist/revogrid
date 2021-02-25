import { Component, Listen, Method, Event, EventEmitter } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

@Component({ tag: 'revogr-clipboard' })
export class Clipboard {
  @Event({ bubbles: false }) copyRegion: EventEmitter<DataTransfer>;
  @Event({ bubbles: false }) pasteRegion: EventEmitter<string[][]>;
  @Listen('paste', { target: 'document' }) onPaste(e: ClipboardEvent) {
    const clipboardData = this.getData(e);
    const isHTML = clipboardData.types.indexOf('text/html') > -1;
    const data = isHTML ? clipboardData.getData('text/html') : clipboardData.getData('text');
    const parsedData = isHTML ? this.htmlParse(data) : this.textParse(data);
    this.pasteRegion.emit(parsedData);
    e.preventDefault();
  }
  @Listen('copy', { target: 'document' }) copyStarted(e: ClipboardEvent) {
    this.copyRegion.emit(this.getData(e));
    e.preventDefault();
  }
  @Method() async doCopy(e: DataTransfer, data?: RevoGrid.DataFormat[][]) {
    e.setData('text/plain', data ? this.parserCopy(data) : '');
  }

  parserCopy(data: RevoGrid.DataFormat[][]) {
    return data.map(row => row.join('\t')).join('\n');
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
    const table = document.createRange().createContextualFragment(data).querySelector('table');
    for (const row of Array.from(table.rows)) {
      result.push(Array.from(row.cells).map(cell => cell.innerText));
    }
    return result;
  }

  private getData(e: ClipboardEvent) {
    return e.clipboardData || ((window as unknown) as { clipboardData: DataTransfer | null })?.clipboardData;
  }
}
