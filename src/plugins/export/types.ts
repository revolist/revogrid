import { DataType } from '@type';

export type ColSource = {
  headers: string[][];
  props: any[];
};
export type DataInput = {
  data: DataType[];
} & ColSource;

export interface FormatterOptions {
  mime: string;
  encoding: string;
}

export interface Formatter {
  options: FormatterOptions;
  doExport(data: DataInput): string;
}

export interface CSVFormat extends FormatterOptions {
  fileKind: 'csv';
  bom: boolean;
  columnDelimiter: string;
  rowDelimiter: string;
  filename?: string;
}
