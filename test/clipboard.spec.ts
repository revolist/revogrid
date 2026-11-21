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

  it('round-trips an explicitly blank last row', () => {
    const data = [['a'], ['']];
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

  it('round-trips an explicitly blank last row', () => {
    const data = [['a'], ['']];
    expect(parse(clipboard.parserCopy(data))).toEqual(data);
  });

  it.each(['\n', '\r', '\r\n'])(
    'ignores one final row terminator %j without losing explicit empty fields',
    separator => {
      expect(parse(`pasted${separator}`)).toEqual([['pasted']]);
      expect(parse(`a\tb${separator}c\td${separator}`)).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ]);
      expect(parse(`a\t${separator}`)).toEqual([['a', '']]);
      expect(parse(`a${separator}${separator}`)).toEqual([['a'], ['']]);
      expect(parse(`a${separator}""`)).toEqual([['a'], ['']]);
    },
  );

  it('preserves ordinary text, literal unmatched quotes, and explicit empty rows', () => {
    expect(parse('')).toEqual([['']]);
    expect(parse('a\t\tb\r\n\t\n')).toEqual([['a', '', 'b'], ['', '']]);
    expect(parse('say "hi"\t"unclosed\n"closed" suffix')).toEqual([
      ['say "hi"', '"unclosed'],
      ['"closed" suffix'],
    ]);
  });
});

describe('clipboard paste events', () => {
  it('emits afterpasteapply with the data replaced in beforepasteapply', () => {
    const clipboard = new Clipboard();
    const replaced = [['replaced']];
    const pasteRegion = jest.fn();
    const afterPasteApply = jest.fn(payload => ({
      detail: payload,
      defaultPrevented: false,
    }));
    (clipboard as any).beforePaste = {
      emit: jest.fn(p => ({ detail: p, defaultPrevented: false })),
    };
    (clipboard as any).beforePasteApply = {
      emit: jest.fn(p => ({
        detail: { ...p, parsed: replaced },
        defaultPrevented: false,
      })),
    };
    (clipboard as any).pasteRegion = { emit: pasteRegion };
    (clipboard as any).afterPasteApply = { emit: afterPasteApply };

    clipboard.onPaste({
      clipboardData: {
        types: ['text/plain'],
        getData: () => 'original',
      },
      preventDefault: jest.fn(),
    } as unknown as ClipboardEvent);

    expect(pasteRegion).toHaveBeenCalledWith(replaced);
    expect(afterPasteApply.mock.calls[0][0].parsed).toBe(replaced);
  });

  it.each([
    [['text/html', 'text/plain']],
    [['text/plain', 'text/html']],
  ])('reads text/html when types are %j', types => {
    const clipboard = new Clipboard();
    const beforePaste = jest.fn(p => ({ detail: p, defaultPrevented: true }));
    (clipboard as any).beforePaste = { emit: beforePaste };

    clipboard.onPaste({
      clipboardData: {
        types,
        getData: (type: string) =>
          type === 'text/html' ? '<table></table>' : 'plain',
      },
      preventDefault: jest.fn(),
    } as unknown as ClipboardEvent);

    expect(beforePaste.mock.calls[0][0].isHTML).toBe(true);
    expect(beforePaste.mock.calls[0][0].raw).toBe('<table></table>');
  });
});
