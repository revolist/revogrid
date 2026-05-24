export function closest(el: Element, s: string): Element | null {
  const matches =
    Element.prototype.matches ||
    ((Element.prototype as unknown) as { msMatchesSelector: (selectors: string) => boolean }).msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;

  do {
    if (matches.call(el, s)) {
      return el;
    }
    el = (el.parentElement || el.parentNode) as Element;
  } while (el !== null && el.nodeType === 1);
  return null;
}
