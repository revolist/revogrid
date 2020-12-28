import {LogicFunction, LogicFunctionExtraParam, LogicFunctionParam, ExtraField} from '../filter.types';

const eq: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
    if (typeof value === 'undefined' || value === null && !extra) {
        return true;
    }
    if (typeof value !== 'string') {
        value === JSON.stringify(value);
    }
    return value === extra;
};

export const notEq: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => !eq(value, extra);
notEq.extra = 'input' as ExtraField;
eq.extra = 'input' as ExtraField;
export default eq;
