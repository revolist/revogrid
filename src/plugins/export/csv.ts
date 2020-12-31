import { DataInput, Formatter, FormatterOptions } from "./types";

export interface CSVFormat extends FormatterOptions {
    fileKind: 'csv';
    bom: boolean;
    columnDelimiter: string;
    rowDelimiter: string;
    filename?: string;
}

export const DEFAULT_FORMAT: CSVFormat = {
    mime: 'text/csv',
    fileKind: 'csv',
    // BOM signature
    bom: true,
    columnDelimiter: ',',
    rowDelimiter: '\r\n',
    encoding: ''
};

export type CSVFormatter = (options: Partial<CSVFormat>, data: DataInput) => string;

// The ASCII character code 13 is called a Carriage Return or CR. 
const CARRIAGE_RETURN = String.fromCharCode(13);
// Chr(13) followed by a Chr(10) that compose a proper CRLF.
const LINE_FEED = String.fromCharCode(10);
const DOUBLE_QT = String.fromCharCode(34);
const NO_BREAK_SPACE = String.fromCharCode(0xFEFF);
const escapeRegex = new RegExp('"', 'g');

export default class ExportCsv implements Formatter {
  readonly options: Readonly<CSVFormat>;
  constructor(options: Partial<CSVFormat> = {}) {
    this.options = {...DEFAULT_FORMAT, ...options};
  }

  doExport({data, headers, props }: DataInput) {
    const anyHeaders = headers?.length > 0;

    let result = this.options.bom ? NO_BREAK_SPACE : '';

    if (anyHeaders) {
      headers.forEach((header) => {
        if (!header.length) {
          return;
        }
        result += this.prepareHeader(header, this.options.columnDelimiter);
        result += this.options.rowDelimiter;
      });
    }

    data.forEach((row, index) => {
      if (index > 0) {
        result += this.options.rowDelimiter;
      }
      result += props.map(p =>
        this.parseCell(row[p], this.options.columnDelimiter))
        .join(this.options.columnDelimiter);
    });

    return result;
  }


  private prepareHeader(columnHeaders: string[], columnDelimiter: string) {
    let result = '';
    const newColumnHeaders = columnHeaders.map(v => this.parseCell(v, columnDelimiter, true));
    result += newColumnHeaders.join(columnDelimiter);
    return result;
  }

  private parseCell(value: any, columnDelimiter: string, force = false) {
    let escapedValue = value;
    if (typeof value !== 'string') {
      escapedValue = JSON.stringify(value);
    }

    if (escapedValue !== '' && (force ||
      escapedValue.indexOf(CARRIAGE_RETURN) >= 0 ||
      escapedValue.indexOf(DOUBLE_QT) >= 0 ||
      escapedValue.indexOf(LINE_FEED) >= 0 ||
      escapedValue.indexOf(columnDelimiter) >= 0)) {
      return `"${escapedValue.replace(escapeRegex, '""')}"`;
    }

    return escapedValue;
  }
}
