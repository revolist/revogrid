export type Action =
  | { kind: 'mount' }
  | { kind: 'sort'; order: 'asc' | 'desc' }
  | { kind: 'trim'; index: number | null }
  | { kind: 'edit'; row: number; value: string; cancel?: true }
  | { kind: 'replaceDuringEdit'; generation: number }
  | { kind: 'select'; end: number }
  | { kind: 'paste'; values: [string, string] }
  | { kind: 'churn'; generation: number; order: 'asc' | 'desc' }
  | { kind: 'beginResize'; delta: number }
  | { kind: 'group' }
  | { kind: 'toggleNorth' }
  | { kind: 'resize'; width: number; height: number }
  | { kind: 'scroll'; row: number; column: number }
  | { kind: 'focus'; row: number }
  | { kind: 'pin'; side: 'colPinStart' | 'colPinEnd' }
  | { kind: 'key'; key: 'ArrowDown' };

export const sequenceVersion = 1;
export const corpus = [19, 41, 73, 101, 137, 211, 307, 401, 503, 601];

export function generateActions(seed: number): Action[] {
  let state = seed >>> 0;
  const choose = (count: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 2 ** 32 * count);
  };
  const order = () => choose(2) ? 'asc' as const : 'desc' as const;
  const value = () => `edit-${choose(100000)}`;
  const blocks: Action[][] = [
    [
      { kind: 'mount' },
      { kind: 'sort', order: order() },
      { kind: 'edit', row: choose(3), value: value() },
      { kind: 'replaceDuringEdit', generation: 1 + choose(10) },
      { kind: 'edit', row: choose(3), value: value(), cancel: true },
      { kind: 'edit', row: choose(3), value: value() },
    ],
    [
      { kind: 'mount' },
      { kind: 'select', end: 1 },
      { kind: 'trim', index: 1 },
      { kind: 'paste', values: [value(), value()] },
      { kind: 'trim', index: null },
    ],
    [
      { kind: 'mount' },
      { kind: 'churn', generation: 20 + choose(20), order: order() },
      { kind: 'mount' },
    ],
    [
      { kind: 'mount' },
      { kind: 'trim', index: choose(5) },
      { kind: 'beginResize', delta: 15 + choose(20) },
      { kind: 'group' },
      { kind: 'toggleNorth' },
      { kind: 'resize', width: 470, height: 310 + choose(40) },
      { kind: 'toggleNorth' },
      { kind: 'trim', index: null },
    ],
    [
      { kind: 'mount' },
      { kind: 'scroll', column: 3, row: 15 + choose(8) },
      { kind: 'focus', row: 15 + choose(8) },
      { kind: 'pin', side: choose(2) ? 'colPinStart' : 'colPinEnd' },
      { kind: 'resize', width: 430 + choose(60), height: 310 + choose(45) },
      { kind: 'key', key: 'ArrowDown' },
    ],
  ];
  for (let index = blocks.length - 1; index > 0; index--) {
    const other = choose(index + 1);
    [blocks[index], blocks[other]] = [blocks[other], blocks[index]];
  }
  return blocks.flat();
}
