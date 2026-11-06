import { getColumns } from '../src/utils/column.utils';

describe('prototype-sensitive column properties', () => {
  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty']) (
    'collects repeated %s columns as own enumerable properties', prop => {
      const collection = getColumns([
        { prop, name: 'First', order: 'asc' },
        { prop, name: 'Second', pin: 'colPinStart' },
      ]);
      expect(collection.columnByProp[prop].map(column => column.name)).toEqual([
        'First', 'Second',
      ]);
      expect(Object.keys(collection.columnByProp)).toEqual([prop]);
      expect(Object.keys(collection.sort)).toEqual([prop]);
      expect(collection.sort[prop]).toBe(collection.columns.rgCol[0]);
      expect(Object.getPrototypeOf(collection.columnByProp)).toBe(Object.prototype);
      expect(Object.getPrototypeOf(collection.sort)).toBe(Object.prototype);
    },
  );

  it('retains special keys through nested group collection and serialization', () => {
    const collection = getColumns([
      { name: 'Outer', children: [
        { name: 'Inner', children: [{ prop: '__proto__', order: 'desc' }] },
        { prop: 'constructor', pin: 'colPinEnd', order: 'asc' },
      ] },
      { prop: 'ordinary' },
    ]);
    const serialized = JSON.parse(JSON.stringify(collection));
    expect(Object.keys(serialized.columnByProp)).toEqual([
      '__proto__', 'constructor', 'ordinary',
    ]);
    expect(serialized.columnByProp.__proto__[0].prop).toBe('__proto__');
    expect(serialized.sort.__proto__.order).toBe('desc');
    expect(collection.columns.colPinEnd[0].prop).toBe('constructor');
    expect(Object.getPrototypeOf(collection.columnByProp)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(collection.sort)).toBe(Object.prototype);
  });

  it('keeps same-prop columns when a nested group is merged', () => {
    const collection = getColumns([
      { prop: '__proto__', name: 'Root' },
      { name: 'Group', children: [{ prop: '__proto__', name: 'Nested' }] },
    ]);

    expect(collection.columnByProp.__proto__.map(column => column.name)).toEqual([
      'Root', 'Nested',
    ]);
  });
});
