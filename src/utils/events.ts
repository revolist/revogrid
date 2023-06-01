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


export function getFromEvent(
  e: MouseEvent | TouchEvent,
  prop: keyof Pick<Touch, 'clientX' | 'clientY' | 'screenX' | 'screenY'>,
  focusClass?: string // for touch events
): number | null {
  if (isTouch(e)) {
    if (e.touches.length > 0) {
      const touchEvent = e.touches[0];
      if (!verifyTouchTarget(touchEvent, focusClass)) {
        return null;
      }
      return (touchEvent[prop] as number) || 0;
    }
    return null;
  }
  return e[prop] || 0;
}
