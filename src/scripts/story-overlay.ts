// Library page only. A click on a story card opens the story in the overlay and gives it the story's address:
// one history entry for the whole reading session, so one Back returns to the library however many stories were read.
// The story is the <article data-story> of the story page itself, fetched from the card's link.
import { closeDialog, openDialog } from './dialog';

const dialog = document.getElementById('story-dialog') as HTMLDialogElement | null;
const slot = dialog?.querySelector<HTMLElement>('[data-story-slot]');
const libraryUrl = location.pathname;
const libraryTitle = document.title;
let overlayInHistory = false;

async function load(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const article = doc.querySelector('article[data-story]');
    if (!article || !dialog || !slot) return false;
    // Inside the library page the story sits one level lower: its sections become third-level headings first,
    // then the title the second-level heading that labels the dialog.
    for (const h2 of article.querySelectorAll('h2')) {
      const h3 = document.createElement('h3');
      for (const { name, value } of [...h2.attributes]) h3.setAttribute(name, value);
      h3.append(...h2.childNodes);
      h2.replaceWith(h3);
    }
    const h1 = article.querySelector('h1');
    h1?.replaceWith(Object.assign(document.createElement('h2'), {
      id: 'story-dialog-title', tabIndex: -1, textContent: h1.textContent ?? '',
    }));
    slot.replaceChildren(document.importNode(article, true));
    document.title = article.getAttribute('data-title') ?? libraryTitle;
    dialog.scrollTop = 0; // the dialog is the scroll container
    return true;
  } catch { return false; }
}

async function show(url: string, mode: 'push' | 'replace'): Promise<void> {
  if (!dialog) return;
  if (!(await load(url))) { location.href = url; return; } // fall back to the real page
  if (mode === 'push' && !overlayInHistory) { history.pushState({ story: true }, '', url); overlayInHistory = true; }
  else history.replaceState({ story: true }, '', url);
  const wasOpen = dialog.open;
  openDialog(dialog);
  // Previous/next removed the link that had focus: move it to the new title instead of losing it.
  if (wasOpen) dialog.querySelector<HTMLElement>('#story-dialog-title')?.focus();
}

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-story-link], #story-dialog a[data-story-nav]');
  // A modified click (new tab, new window, download) stays a plain link.
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  void show(a.href, a.hasAttribute('data-story-nav') ? 'replace' : 'push');
});

dialog?.addEventListener('close', () => {
  document.title = libraryTitle;
  if (overlayInHistory) { overlayInHistory = false; history.back(); }
});

window.addEventListener('popstate', () => {
  if (dialog?.open) { overlayInHistory = false; closeDialog(dialog); }
  if (location.pathname !== libraryUrl) location.reload();
});
