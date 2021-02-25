import { Component, Listen, Method, Event, EventEmitter } from '@stencil/core';
import { RevoGrid } from '../../interfaces';

@Component({ tag: 'revogr-clipboard' })
export class Clipboard {
  @Event({ bubbles: false }) copyRegion: EventEmitter<DataTransfer>;
  @Event({ bubbles: false }) pasteRegion: EventEmitter<string[][]>;
  @Listen('paste', { target: 'document' }) onPaste(e: ClipboardEvent) {
    const clipboardData = this.getData(e)
    const isHTML = clipboardData.types.indexOf('text/html') > -1
    const data = isHTML ? clipboardData.getData('text/html') : clipboardData.getData('text');
    this.pasteRegion.emit(this.parserPaste(data, isHTML));
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

  parserPaste(data: string, isHTML: boolean) {
    const result: string[][] = [];
    if(isHTML) {
      const table = document.createRange().createContextualFragment(data).querySelector('table')
      for (const row of Array.from(table.rows)) {
        result.push(Array.from(row.cells).map(cell => cell.innerText))
      }
      return result
    } else {
      const rows = data.split(/\r\n|\n|\r/);
      for (let y in rows) {
        result.push(rows[y].split('\t'));
      }
      return result;
    }
  }

  private getData(e: ClipboardEvent) {
    return e.clipboardData || ((window as unknown) as { clipboardData: DataTransfer | null })?.clipboardData;
  }
}
