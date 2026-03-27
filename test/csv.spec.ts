import { ExportCsv } from '../src/plugins/export/csv';

// BOM character prepended by default
const BOM = '\ufeff';

// ---------------------------------------------------------------------------
// ExportCsv.doExport
// ---------------------------------------------------------------------------
describe('ExportCsv', () => {
  describe('doExport — basic output', () => {
    it('default options: output starts with BOM (\\ufeff), header cells are force-quoted → "\\ufeff\"Name\",\"Age\"\\r\\nAlice,25"', () => {
      const csv = new ExportCsv();
      const result = csv.doExport({
        data: [{ name: 'Alice', age: 25 }],
        headers: [['Name', 'Age']],
        props: ['name', 'age'],
      });
      expect(result).toBe(`${BOM}"Name","Age"\r\nAlice,25`);
    });

    it('bom:false → output does not start with BOM, data rows only → "Alice,25"', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ name: 'Alice', age: 25 }],
        headers: [],
        props: ['name', 'age'],
      });
      expect(result.startsWith(BOM)).toBe(false);
      expect(result).toBe('Alice,25');
    });

    it('3 data rows → joined with "\\r\\n" row delimiter → "A\\r\\nB\\r\\nC"', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ n: 'A' }, { n: 'B' }, { n: 'C' }],
        headers: [],
        props: ['n'],
      });
      expect(result).toBe('A\r\nB\r\nC');
    });
  });

  describe('doExport — cell escaping', () => {
    it('value "Hello, World" → "\"Hello, World\"" (comma triggers double-quote wrapping)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ v: 'Hello, World' }],
        headers: [],
        props: ['v'],
      });
      expect(result).toBe('"Hello, World"');
    });

    it('value `say "hi"` → `"say ""hi"""` (embedded quotes are doubled per RFC 4180)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ v: 'say "hi"' }],
        headers: [],
        props: ['v'],
      });
      expect(result).toBe('"say ""hi"""');
    });

    it('value "line1\\nline2" → wrapped in double quotes (newline character triggers quoting)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ v: 'line1\nline2' }],
        headers: [],
        props: ['v'],
      });
      expect(result).toContain('"');
    });

    it('value undefined → "" (missing cell values output as empty string)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ v: undefined }],
        headers: [],
        props: ['v'],
      });
      expect(result).toBe('');
    });
  });

  describe('doExport — headers', () => {
    it('headers=[["Group A"],["Col 1"]] → "\"Group A\"\\r\\n\"Col 1\"\\r\\n1" (two header rows above data)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ a: '1' }],
        headers: [['Group A'], ['Col 1']],
        props: ['a'],
      });
      expect(result).toBe('"Group A"\r\n"Col 1"\r\n1');
    });

    it('headers=[[],["Col 1"]] → "\"Col 1\"\\r\\n1" (empty header row [] is skipped)', () => {
      const csv = new ExportCsv({ bom: false });
      const result = csv.doExport({
        data: [{ a: '1' }],
        headers: [[], ['Col 1']],
        props: ['a'],
      });
      expect(result).toBe('"Col 1"\r\n1');
    });
  });

  describe('doExport — custom delimiters', () => {
    it('columnDelimiter=";": {a:"1",b:"2"} → "1;2" (semicolon used instead of comma)', () => {
      const csv = new ExportCsv({ bom: false, columnDelimiter: ';' });
      const result = csv.doExport({
        data: [{ a: '1', b: '2' }],
        headers: [],
        props: ['a', 'b'],
      });
      expect(result).toBe('1;2');
    });
  });
});
