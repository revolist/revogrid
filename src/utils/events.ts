function isTouch(e: MouseEvent | TouchEvent): e is TouchEvent {
    return !!(e as TouchEvent).touches;
}
  
export function getFromEvent(e: MouseEvent & TouchEvent, prop: keyof Touch): number {
    if (isTouch(e)) {
      return e.touches[0][prop] as number || 0;
    }
    return e[prop] || 0;
}