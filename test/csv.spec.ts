import { ExportCsv } from '../src/plugins/export/csv';
import type { DataInput } from '../src/plugins/export/types';

// BOM character prepended by default
const BOM = '\ufeff';

/** Export with bom:false (used by the majority of tests). */
function doExport(input: DataInput, options: ConstructorParameters<typeof ExportCsv>[0] = {}) {
  return new ExportCsv({ bom: false, ...options }).doExport(input);
}

// ---------------------------------------------------------------------------
// ExportCsv.doExport
// ---------------------------------------------------------------------------
describe('ExportCsv', () => {
  describe('doExport — basic output', () => {
    it(String.raw`default options: output starts with BOM (﻿), header cells are force-quoted → "﻿"Name","Age"
Alice,25"`, () => {
      const result = new ExportCsv().doExport({
        data: [{ name: 'Alice', age: 25 }],
        headers: [['Name', 'Age']],
        props: ['name', 'age'],
      });
      expect(result).toBe(`${BOM}"Name","Age"\r\nAlice,25`);
    });

    it('bom:false → output does not start with BOM, data rows only → "Alice,25"', () => {
      const result = doExport({ data: [{ name: 'Alice', age: 25 }], headers: [], props: ['name', 'age'] });
      expect(result.startsWith(BOM)).toBe(false);
      expect(result).toBe('Alice,25');
    });

    it(String.raw`3 data rows → joined with "\r\n" row delimiter → "A\r\nB\r\nC"`, () => {
      const result = doExport({ data: [{ n: 'A' }, { n: 'B' }, { n: 'C' }], headers: [], props: ['n'] });
      expect(result).toBe('A\r\nB\r\nC');
    });
  });

  describe('doExport — cell escaping', () => {
    it('value "Hello, World" → ""Hello, World"" (comma triggers double-quote wrapping)', () => {
      expect(doExport({ data: [{ v: 'Hello, World' }], headers: [], props: ['v'] })).toBe('"Hello, World"');
    });

    it('value `say "hi"` → `"say ""hi"""` (embedded quotes are doubled per RFC 4180)', () => {
      expect(doExport({ data: [{ v: 'say "hi"' }], headers: [], props: ['v'] })).toBe('"say ""hi"""');
    });

    it(String.raw`value "line1
line2" → wrapped in double quotes (newline character triggers quoting)`, () => {
      expect(doExport({ data: [{ v: 'line1\nline2' }], headers: [], props: ['v'] })).toContain('"');
    });

    it('value undefined → "" (missing cell values output as empty string)', () => {
      expect(doExport({ data: [{ v: undefined }], headers: [], props: ['v'] })).toBe('');
    });
  });

  describe('doExport — headers', () => {
    it(String.raw`headers=[["Group A"],["Col 1"]] → ""Group A"
"Col 1"
1" (two header rows above data)`, () => {
      const result = doExport({ data: [{ a: '1' }], headers: [['Group A'], ['Col 1']], props: ['a'] });
      expect(result).toBe('"Group A"\r\n"Col 1"\r\n1');
    });

    it(String.raw`headers=[[],["Col 1"]] → ""Col 1"
1" (empty header row [] is skipped)`, () => {
      const result = doExport({ data: [{ a: '1' }], headers: [[], ['Col 1']], props: ['a'] });
      expect(result).toBe('"Col 1"\r\n1');
    });
  });

  describe('doExport — custom delimiters', () => {
    it('columnDelimiter=";": {a:"1",b:"2"} → "1;2" (semicolon used instead of comma)', () => {
      expect(doExport({ data: [{ a: '1', b: '2' }], headers: [], props: ['a', 'b'] }, { columnDelimiter: ';' })).toBe('1;2');
    });
  });
});
