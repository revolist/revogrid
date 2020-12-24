import {LogicFunction, LogicFunctionExtraParam, LogicFunctionParam} from '../../filter.types';

const beginsWith: LogicFunction = (value: LogicFunctionParam, extra?: LogicFunctionExtraParam) => {
    if (!value) {
        return false;
    }
    if (extra && typeof extra === 'string') {
        return JSON.stringify(value).toLocaleLowerCase().indexOf(extra) === 1;
    }
    return true;
};

beginsWith.extra = 'input';
export default beginsWith;
