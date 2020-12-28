import {LogicFunction, LogicFunctionExtraParam, LogicFunctionParam} from '../../filter.types';

const beginsWith: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
    if (!value) {
        return false;
    }
    if (extra) {
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }
        return value.toLocaleLowerCase().indexOf(extra) === 0;
    }
    return true;
};

beginsWith.extra = 'input';
export default beginsWith;
