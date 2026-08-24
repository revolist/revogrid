/** Fewer rows keep the existing synchronous filtering behavior. */
export const ASYNC_FILTER_ROW_THRESHOLD = 15_000;
/** Maximum rows evaluated in one filtering chunk. */
export const FILTER_CHUNK_SIZE = 1_000;
/** Yield after approximately this much accumulated filtering work. */
export const FILTER_TIME_BUDGET_MS = 5;
