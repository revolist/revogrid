export type Target = HTMLElement | Element | null;

export type DispatchDetail = any;
type Event = {
  target: HTMLElement | null;
  preventDefault(): void;
};


/**
 * Dispatch custom event to element
 */
export function dispatch(
  target: Target,
  eventName: string,
  detail?: DispatchDetail,
): CustomEvent {
  const event = new CustomEvent(eventName, {
    detail,
    cancelable: true,
    bubbles: true,
  });
  target?.dispatchEvent(event);
  return event;
}
export function dispatchByEvent(
  e: Event,
  eventName: string,
  detail: DispatchDetail,
): CustomEvent {
  e.preventDefault();
  return dispatch(e.target as Target, eventName, detail);
}
/**
 * Dispatch event by other event target
 */
export function dispatchOnEvent(
    e: MouseEvent | CustomEvent,
    eventName: string,
    detail?: any
  ): CustomEvent {
    e.preventDefault();
    return dispatch(e.target as Target, eventName, detail);
}
