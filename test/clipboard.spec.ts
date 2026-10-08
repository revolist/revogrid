import { Clipboard } from '../src/components/clipboard/revogr-clipboard';

describe('clipboard tabular text', () => {
  const clipboard = new Clipboard();
  const parse = (text: string): string[][] => clipboard['textParse'](text);

  it('quotes delimiters and escapes quotes when copying', () => {
    expect(
      clipboard.parserCopy([
        ['tab\tvalue', 'line\nvalue', 'CR\rvalue', 'CRLF\r\nvalue', 'say "hi"'],
        ['', null, undefined, 0, false],
      ]),
    ).toBe(
      '"tab\tvalue"\t"line\nvalue"\t"CR\rvalue"\t"CRLF\r\nvalue"\t"say ""hi"""\n\t\t\t0\tfalse',
    );
  });

  it('round-trips embedded delimiters, quotes, and empty cells', () => {
    const data = [
      [
        'tab\tvalue',
        'line\nvalue',
        'CR\rvalue',
        'CRLF\r\nvalue',
        'say "hi"',
        '',
      ],
      ['', '"', '"quoted"', '\t\n\r', 'plain', ''],
      ['', '', '', '', '', ''],
    ];
    expect(parse(clipboard.parserCopy(data))).toEqual(data);
  });

  it.each(['\n', '\r', '\r\n'])(
    'parses spreadsheet quoted fields with %j row separators',
    separator => {
      expect(
        parse(`"a\tb"\t"say ""hi"""\t${separator}\t"line${separator}two"\t`),
      ).toEqual([
        ['a\tb', 'say "hi"', ''],
        ['', `line${separator}two`, ''],
      ]);
    },
  );

  it('preserves ordinary text, literal unmatched quotes, and trailing empty rows', () => {
    expect(parse('')).toEqual([['']]);
    expect(parse('a\t\tb\r\n\t\n')).toEqual([['a', '', 'b'], ['', ''], ['']]);
    expect(parse('say "hi"\t"unclosed\n"closed" suffix')).toEqual([
      ['say "hi"', '"unclosed'],
      ['"closed" suffix'],
    ]);
  });
});
