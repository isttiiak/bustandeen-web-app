// bayan.bustandeen.com: the globe menu's "Request a language" form (2026-10-16),
// sent without leaving the page to this host's /api/feedback/language (the only
// API path vercel.json routes here). Optional: without it the menu item stays
// hidden. Same behaviour as src/seo/langRequest.ts on the main site.
/* global document, window, fetch, FormData -- a plain browser script, served as is (not bundled) */
(function () {
  var dialog = document.querySelector('dialog[data-lang-request]');
  var form = dialog && dialog.querySelector('form[data-lang-request-form]');
  if (!dialog || !form || typeof dialog.showModal !== 'function') return;
  var status = form.querySelector('[data-lang-request-status]');
  var fields = form.querySelectorAll('input, button');
  var setDisabled = function (on) {
    Array.prototype.forEach.call(fields, function (el) {
      el.disabled = on;
    });
  };
  var say = function (key) {
    if (status) status.textContent = form.getAttribute('data-' + key) || '';
  };
  Array.prototype.forEach.call(document.querySelectorAll('[data-lang-request-open]'), function (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var menu = b.closest('details');
      if (menu) menu.open = false;
      form.reset();
      if (status) status.textContent = '';
      setDisabled(false);
      dialog.showModal();
      var input = form.querySelector('input[name="language"]');
      if (input) input.focus();
    });
  });
  form.querySelector('[data-lang-request-cancel]').addEventListener('click', function () {
    dialog.close();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    setDisabled(true);
    say('sending');
    fetch('/api/feedback/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: String(data.get('language') || '').trim(),
        botcheck: String(data.get('botcheck') || ''),
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        say('sent');
        // Cancel stays usable to close; it now just closes.
        form.querySelector('[data-lang-request-cancel]').disabled = false;
        window.setTimeout(function () {
          dialog.close();
        }, 2500);
      })
      .catch(function () {
        say('failed');
        setDisabled(false);
      });
  });
})();
