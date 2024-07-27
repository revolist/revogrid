/**
 * Dispatch custom event to element
 */
export function dispatch<DispatchDetail = any>(
  target: MouseEvent['target'],
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

/**
 * Dispatch custom event by event object and prevent default
 */
export function dispatchByEvent<DispatchDetail = any>(
  e: Pick<MouseEvent, 'target' | 'preventDefault'>,
  eventName: string,
  detail?: DispatchDetail,
): CustomEvent {
  e.preventDefault();
  return dispatch(e.target, eventName, detail);
}
