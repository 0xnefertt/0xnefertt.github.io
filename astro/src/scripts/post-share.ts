export function initPostShare(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  const open = root.querySelector<HTMLButtonElement>('[data-share-open]');
  const input = root.querySelector<HTMLInputElement>('.post-share-url');
  const url = root.dataset.shareUrl;
  if (!dialog || !open || !input || !url || root.dataset.shareReady) return;
  root.dataset.shareReady = 'true';
  const korean = document.documentElement.lang === 'ko';
  let returnFocus: HTMLElement = open;
  function message(text: string) {
    root.querySelectorAll<HTMLElement>('[data-share-status]').forEach((node) => node.textContent = text);
  }
  open.addEventListener('click', () => {
    message('');
    returnFocus = open;
    dialog.showModal();
    document.documentElement.classList.add('post-share-is-open');
  });
  root.querySelector('[data-share-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('post-share-is-open');
    returnFocus.focus({ preventScroll: true });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-share-copy]').forEach((button) => button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      message(korean ? '링크를 복사했습니다.' : 'Link copied.');
    } catch {
      returnFocus = dialog.open ? open : button;
      if (!dialog.open) dialog.showModal();
      document.documentElement.classList.add('post-share-is-open');
      input.focus();
      input.select();
      message(korean ? '선택된 주소를 복사해 주세요.' : 'Please copy the selected link.');
    }
  }));
}
