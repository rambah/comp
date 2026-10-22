/** Comp can scroll the app shell instead of the document. Use the actual scroller. */
export function auditScrollContainer(root: HTMLElement | null): Element | null {
  let element = root?.parentElement;
  while (element) {
    if (
      /(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
      element.scrollHeight > element.clientHeight
    )
      return element;
    element = element.parentElement;
  }
  return document.scrollingElement;
}
