// The globe menu's "Request a language" form (src/seo/components/LanguageMenu.tsx).
// Document-level listeners, set once: they work on the prerendered pages
// (static-entry.ts) and when the app's router draws the same pages, and they
// survive the page body being redrawn. No inline handlers: the CSP forbids them.

let wired = false;

function dialog(): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>('dialog[data-lang-request]');
}

function closeMenus(except?: Element | null): void {
  document.querySelectorAll<HTMLDetailsElement>('details[data-lang-menu][open]').forEach((d) => {
    if (!except || !d.contains(except)) d.open = false;
  });
}

export function wireLanguageRequest(): void {
  if (wired || typeof document === 'undefined') return;
  wired = true;

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('[data-lang-request-open]')) {
      const d = dialog();
      if (!d) return;
      closeMenus();
      const form = d.querySelector('form');
      form?.reset();
      const status = d.querySelector('[data-lang-request-status]');
      if (status) status.textContent = '';
      d.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach(
        (el) => (el.disabled = false)
      );
      d.showModal();
      d.querySelector<HTMLInputElement>('input[name="language"]')?.focus();
      return;
    }
    if (target?.closest('[data-lang-request-cancel]')) {
      dialog()?.close();
      return;
    }
    closeMenus(target);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenus();
  });

  document.addEventListener('submit', (e) => {
    const form =
      e.target instanceof HTMLFormElement && e.target.matches('[data-lang-request-form]')
        ? e.target
        : null;
    if (!form) return;
    e.preventDefault();
    const status = form.querySelector('[data-lang-request-status]');
    const fields = form.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button');
    const data = new FormData(form);
    const say = (key: 'sending' | 'sent' | 'failed') => {
      if (status) status.textContent = form.dataset[key] ?? '';
    };
    fields.forEach((el) => (el.disabled = true));
    say('sending');
    fetch('/api/feedback/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: String(data.get('language') ?? '').trim(),
        botcheck: String(data.get('botcheck') ?? ''),
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        say('sent');
        // Cancel stays usable to close; it now just closes.
        form.querySelector<HTMLButtonElement>('[data-lang-request-cancel]')!.disabled = false;
        window.setTimeout(() => dialog()?.close(), 2500);
      })
      .catch(() => {
        say('failed');
        fields.forEach((el) => (el.disabled = false));
      });
  });
}
