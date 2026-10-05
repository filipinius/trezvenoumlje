// YouTube on demand: the player is inserted when a video dialog is opened and removed when it closes,
// so no request leaves the page before the click. Opening and closing the dialog itself is dialog.ts.
//   [data-video-frame][data-youtube-id][data-video-title]  empty player slot inside a <dialog>
//   [data-video-start]                                     optional: the second at which playback starts
document.querySelectorAll<HTMLElement>('[data-video-frame]').forEach((slot) => {
  const dialog = slot.closest('dialog');
  const id = slot.dataset.youtubeId;
  if (!dialog || !id) return;

  const play = () => {
    if (slot.firstElementChild) return;
    const frame = document.createElement('iframe');
    const start = slot.dataset.videoStart;
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1${start ? `&start=${encodeURIComponent(start)}` : ''}`;
    frame.title = slot.dataset.videoTitle ?? '';
    frame.allow = 'autoplay; encrypted-media';
    frame.allowFullscreen = true;
    slot.append(frame);
  };
  document.querySelectorAll(`[data-dialog-open="${dialog.id}"]`).forEach((trigger) => trigger.addEventListener('click', play));
  dialog.addEventListener('close', () => slot.replaceChildren());
});
