function isTouch(e: MouseEvent | TouchEvent): e is TouchEvent {
  return !!(e as TouchEvent).touches;
}

export function verifyTouchTarget(touchEvent?: Touch, focusClass?: string) {
  if (focusClass && touchEvent) {
    if (!(touchEvent.target instanceof Element && touchEvent.target.classList.contains(focusClass))) { 
      return false;
    }
  }
  return true;
}


/**
 * Function to get the value of a specific property from a MouseEvent or TouchEvent object.
 */
export function getPropertyFromEvent(
  e: MouseEvent | TouchEvent,
  prop: keyof Pick<Touch, 'clientX' | 'clientY' | 'screenX' | 'screenY'>,
  focusClass?: string // for touch events
): number | null {
  // Check if the event is a touch event
  if (isTouch(e)) {
    // If the event has touches, get the first touch
    if (e.touches.length > 0) {
      const touchEvent = e.touches[0];
      // Check if the target of the touch event is the specified element
      if (!verifyTouchTarget(touchEvent, focusClass)) {
        // If not, return null
        return null;
      }
      // Get the value of the specified property from the touch event and return it
      return (touchEvent[prop] as number) || 0;
    }
    // If there are no touches, return null
    return null;
  }
  // If the event is not a touch event, get the value of the specified property from the event and return it
  return e[prop] || 0;
}
