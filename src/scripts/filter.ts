// In-place filter for a list whose chips are real links (the page works without this script).
//   [data-filter-root]          container; gets data-filter-active while a non-empty value is selected
//   a[data-filter-value]        chip; "" selects everything; its href is the page that shows the same selection
//   [data-filter-item="value"]  item; hidden unless its value is the selected one
//   [data-filter-empty]         shown only while no item is visible; to have it announced, put it inside an
//                               always-rendered aria-live region (a live region that is itself hidden is unreliable)
//     [data-filter-empty-all]   optional: its text while everything is selected
//     [data-filter-empty-value] optional: its text while one value is selected
// Optional, so the page keeps naming the view its address points at:
//   chip[data-filter-title]     document title of that view
//   chip[data-filter-heading]   heading text of that view, written into the root's [data-filter-heading] element
function initFilter(root: HTMLElement): void {
  const chips = [...root.querySelectorAll<HTMLAnchorElement>('a[data-filter-value]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-filter-item]')];
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
  // A chip carries data-filter-heading too, and chips may precede the heading.
  const heading = root.querySelector<HTMLElement>('[data-filter-heading]:not(a[data-filter-value])');

  for (const chip of chips) {
    chip.addEventListener('click', (e) => {
      // A modified click (new tab, new window) stays a plain link.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const value = chip.dataset.filterValue ?? '';
      let visible = 0;
      for (const item of items) {
        const show = value === '' || item.dataset.filterItem === value;
        item.hidden = !show;
        if (show) visible += 1;
      }
      if (empty) {
        empty.hidden = visible > 0;
        const text = value === '' ? empty.dataset.filterEmptyAll : empty.dataset.filterEmptyValue;
        if (text) empty.textContent = text;
      }
      for (const other of chips) {
        if (other === chip) other.setAttribute('aria-current', 'true');
        else other.removeAttribute('aria-current');
      }
      root.toggleAttribute('data-filter-active', value !== '');
      history.replaceState(null, '', chip.href);
      if (chip.dataset.filterTitle) document.title = chip.dataset.filterTitle;
      if (heading && chip.dataset.filterHeading) heading.textContent = chip.dataset.filterHeading;
    });
  }
}
document.querySelectorAll<HTMLElement>('[data-filter-root]').forEach(initFilter);
