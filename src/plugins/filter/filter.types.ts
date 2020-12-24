export type DateEnum =
    'today' | 'yesterday' | 'tomorrow' | 'thisweek' | 'lastweek' | 'nextweek' | 'thismonth' |
    'lastmonth' | 'nextmonth' | 'thisyear' | 'lastyear' | 'nextyear';

export type ExtraField = 'input' | 'select' | 'multi' | 'datepicker';

export type LogicFunctionParam = any;
export type LogicFunctionExtraParam = 'select' | 'input' | 'multi' | 'datepicker' | undefined | string
 | number | Date | DateEnum | null | undefined | string[] | number[];
export type LogicFunction = {
    (value: LogicFunctionParam, extra?: LogicFunctionExtraParam): boolean;
    extra?: ExtraField;
};
