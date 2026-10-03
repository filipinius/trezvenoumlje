export function openDialog(el: HTMLDialogElement): void {
  if (!el.open) el.showModal();
}
export function closeDialog(el: HTMLDialogElement): void {
  if (el.open) el.close();
}
export function initDialogs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-dialog-open]').forEach((trigger) => {
    if (trigger.dataset.bound) return;
    trigger.dataset.bound = '1';
    // Said here, not in the markup: without this script the trigger opens nothing.
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener('click', (e) => {
      const target = document.getElementById(trigger.dataset.dialogOpen!);
      if (target instanceof HTMLDialogElement) { e.preventDefault(); openDialog(target); }
    });
  });
  document.querySelectorAll<HTMLDialogElement>('dialog.overlay').forEach((dlg) => {
    if (dlg.dataset.bound) return;
    dlg.dataset.bound = '1';
    dlg.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t === dlg || t.closest('[data-dialog-close]')) closeDialog(dlg); // backdrop click targets the dialog itself
    });
  });
}
initDialogs();
