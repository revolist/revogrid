(function closest() {
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      ((Element.prototype as unknown) as { msMatchesSelector: (selectors: string) => boolean }).msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s: string) {
      let el: HTMLElement | Element | (Node & ParentNode) | null = this;

      do {
        if (Element.prototype.matches.call(el, s)) {
          return el;
        }
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }
})();
