import fill from 'lodash/fill';
import { columnTypes, rowTypes, Group, Groups } from '@store';

import { timeout } from '../../utils';
import { BasePlugin } from '../base.plugin';
import { ExportCsv } from './csv';
import type { ColSource, CSVFormat, DataInput, Formatter } from './types';
import type { DimensionCols, ColumnProp, DataType } from '@type';

export * from './csv';
export * from './types';

enum ExportTypes {
  csv = 'csv',
}

export type ExportFormat = Partial<CSVFormat>;

export class ExportFilePlugin extends BasePlugin {
  /** Exports string */
  async exportString(options: ExportFormat = {}, t: ExportTypes = ExportTypes.csv) {
    const data = await this.beforeexport();
    if (!data) {
      return null;
    }
    return this.formatter(t, options).doExport(data);
  }

  /** Exports Blob */
  async exportBlob(options: ExportFormat = {}, t: ExportTypes = ExportTypes.csv) {
    return await this.getBlob(this.formatter(t, options));
  }

  /** Export file */
  async exportFile(options: ExportFormat = {}, t: ExportTypes = ExportTypes.csv) {
    const formatter = this.formatter(t, options);

    // url
    const URL = window.URL || window.webkitURL;

    const a = document.createElement('a');
    const { filename, fileKind } = formatter.options;
    const name = `${filename}.${fileKind}`;

    const blob = await this.getBlob(formatter);
    const url = blob ? URL.createObjectURL(blob) : '';

    a.style.display = 'none';
    a.setAttribute('href', url);
    a.setAttribute('download', name);
    this.revogrid.appendChild(a);
    a.dispatchEvent(new MouseEvent('click'));
    this.revogrid.removeChild(a);

    // delay for revoke, correct for some browsers
    await timeout(120);
    URL.revokeObjectURL(url);
  }

  /** Blob object */
  async getBlob(formatter: Formatter) {
    const type = `${formatter.options.mime};charset=${formatter.options.encoding}`;
    if (typeof Blob !== 'undefined') {
      const data = await this.beforeexport();
      if (!data) {
        return null;
      }
      return new Blob([formatter.doExport(data)], { type });
    }
    return null;
  }

  // before event
  private async beforeexport() {
    let data = await this.getData();
    const event: CustomEvent<{ data: DataInput }> = this.emit('beforeexport', { data });
    if (event.defaultPrevented) {
      return null;
    }
    return event.detail.data;
  }

  private async getData(): Promise<DataInput> {
    const data = await this.getSource();
    const colSource: ColSource[] = [];
    const colPromises: Promise<ColSource>[] = [];
    columnTypes.forEach((t, i) => {
      colPromises.push(this.getColPerSource(t).then(s => (colSource[i] = s)));
    });
    await Promise.all(colPromises);
    const columns: ColSource = {
      headers: [],
      props: [],
    };
    for (let source of colSource) {
      source.headers.forEach((h, i) => {
        if (!columns.headers[i]) {
          columns.headers[i] = [];
        }
        columns.headers[i].push(...h);
      });
      columns.props.push(...source.props);
    }
    return {
      data,
      ...columns,
    };
  }

  private async getColPerSource(t: DimensionCols) {
    const store = await this.revogrid.getColumnStore(t);
    const source = store.get('source');
    const virtualIndexes = store.get('items');
    const depth = store.get('groupingDepth');
    const groups = store.get('groups');
    const colNames: string[] = [];
    const colProps: ColumnProp[] = [];
    virtualIndexes.forEach((v: number) => {
      const prop = source[v].prop;
      colNames.push(source[v].name || '');
      colProps.push(prop);
    });
    const rows: string[][] = this.getGroupHeaders(depth, groups, virtualIndexes);
    rows.push(colNames);
    return {
      headers: rows,
      props: colProps,
    };
  }

  private getGroupHeaders(depth: number, groups: Groups, items: number[]) {
    const rows: string[][] = [];
    const template = fill(new Array(items.length), '');
    for (let d = 0; d < depth; d++) {
      const rgRow = [...template];
      rows.push(rgRow);
      if (!groups[d]) {
        continue;
      }
      const levelGroups = groups[d];

      // add names of groups
      levelGroups.forEach((group: Group) => {
        const minIndex = group.indexes[0];
        if (typeof minIndex === 'number') {
          rgRow[minIndex] = group.name;
        }
      });
    }
    return rows;
  }

  private async getSource() {
    const data: DataType[][] = [];
    const promisesData: Promise<number>[] = [];
    rowTypes.forEach(t => {
      const dataPart: DataType[] = [];
      data.push(dataPart);
      const promise = this.revogrid.getVisibleSource(t).then((d: DataType[]) => dataPart.push(...d));
      promisesData.push(promise);
    });
    await Promise.all(promisesData);
    return data.reduce((r, v) => {
      r.push(...v);
      return r;
    }, []);
  }

  // get correct class for future multiple types support
  private formatter(type: ExportTypes, options: ExportFormat = {}) {
    switch (type) {
      case ExportTypes.csv:
        return new ExportCsv(options);
      default:
        throw new Error('Unknown format');
    }
  }
}
