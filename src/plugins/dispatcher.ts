type Target = HTMLElement | Element | null;
/**
 * Dispatch custom event to element
 */
export function dispatch(
  target: Target,
  eventName: string,
  detail?: any
): CustomEvent {
  const event = new CustomEvent(eventName, {
    detail,
    cancelable: true,
    bubbles: true,
  });
  target?.dispatchEvent(event);
  return event;
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
