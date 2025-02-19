// filter.indexed.ts

import eq, { notEq } from './conditions/equal';
import gtThan from './conditions/number/greaterThan';
import gtThanEq from './conditions/number/greaterThanOrEqual';
import lt from './conditions/number/lessThan';
import lsEq from './conditions/number/lessThanOrEqual';
import set, { notSet } from './conditions/set';
import beginsWith from './conditions/string/beginswith';
import contains, { notContains } from './conditions/string/contains';
import { LogicFunction } from './filter.types';


export const filterCoreFunctionsIndexedByType: Record<FilterType, LogicFunction> = {
  none: () => true,
  empty: notSet,
  notEmpty: set,
  eq: eq,
  notEq: notEq,
  begins: beginsWith,
  contains: contains,
  notContains: notContains,

  eqN: eq,
  neqN: notEq,
  gt: gtThan,
  gte: gtThanEq,
  lt: lt,
  lte: lsEq,
};

export const filterTypes: Record<string, FilterType[]> = {
  string: ['notEmpty', 'empty', 'eq', 'notEq', 'begins', 'contains', 'notContains'],
  number: ['notEmpty', 'empty', 'eqN', 'neqN', 'gt', 'gte', 'lt', 'lte'],
};

export const filterNames = {
  none: 'Нет',
  empty: 'Пусто',
  notEmpty: 'Не пусто',

  eq: 'Равно',
  notEq: 'Не равно',
  begins: 'Начинается с',
  contains: 'Содержит',
  notContains: 'Не содержит',

  eqN: '=',
  neqN: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

export type FilterType = keyof typeof filterNames;
