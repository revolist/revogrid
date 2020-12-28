import eq, { notEq } from "./conditions/equal";
import set, { notSet } from "./conditions/set";
import beginsWith from "./conditions/string/beginswith";
import contains, { notContains } from "./conditions/string/contains";
import { LogicFunction } from "./filter.types";

export const filterNames = {
    none: 'None',
    empty: 'Not set',
    notEmpty: 'Set',
    eq: 'Equal',
    notEq: 'Not equal',
    begins: 'Begins with',
    contains: 'Contains',
    notContains: 'Does not contain'
};

export type FilterType = keyof typeof filterNames;

export const filterEntities: Record<FilterType, LogicFunction> = {
    none: () => true,
    empty: notSet,
    notEmpty: set,
    eq: eq,
    notEq: notEq,
    begins: beginsWith,
    contains: contains,
    notContains: notContains,
};

export const filterTypes: Record<string, FilterType[]> = {
    string: [
        'notEmpty',
        'empty',
        'eq',
        'notEq',
        'begins',
        'contains',
        'notContains',
    ],
};
