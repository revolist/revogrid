/**
 * Dispatches a custom event to a specified target element.
 *
 * @param target - The target element to dispatch the event to.
 * @param eventName - The name of the custom event.
 * @param detail - Optional. The detail of the custom event.
 * @returns The custom event that was dispatched.
 */
export function dispatch<DispatchDetail = any>(
  target: MouseEvent['target'],
  eventName: string,
  detail?: DispatchDetail,
) {
  // Create a new CustomEvent with the specified event name and detail.
  const event = new CustomEvent<DispatchDetail>(eventName, {
    detail,
    cancelable: true, // Indicates whether the event can be canceled.
    bubbles: true, // Indicates whether the event bubbles up through the DOM.
  });

  // Dispatch the event on the target element.
  target?.dispatchEvent(event);

  // Return the custom event that was dispatched.
  return event;
}

/**
 * Dispatches a custom event based on an existing event object and prevents the default behavior of the original event.
 *
 * @param e - The original event object containing the target and preventDefault method.
 * @param eventName - The name of the custom event.
 * @param detail - Optional. The detail of the custom event.
 * @returns The custom event that was dispatched.
 */
export function dispatchByEvent<DispatchDetail = any>(
  e: Pick<MouseEvent, 'target' | 'preventDefault'>, // The original event object containing the target and preventDefault method.
  eventName: string, // The name of the custom event.
  detail?: DispatchDetail, // Optional. The detail of the custom event.
): CustomEvent {
  // Prevent the default behavior of the original event.
  e.preventDefault();

  // Dispatch the custom event to the target element specified in the original event object.
  return dispatch<DispatchDetail>(e.target, eventName, detail);
}
