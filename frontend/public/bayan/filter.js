// bayan.bustandeen.com: filters the guide cards on the home page as you type.
// Optional: without it the search box stays hidden and every guide is listed.
/* global document -- a plain browser script, served as is (not bundled) */
(function () {
  var box = document.querySelector('[data-bayan-filter]');
  var input = document.getElementById('bayan-filter');
  var none = document.querySelector('[data-bayan-nomatch]');
  if (!box || !input) return;
  box.hidden = false;
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-bayan-guide]'));
  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var hit = !q || card.getAttribute('data-bayan-guide').indexOf(q) !== -1;
      card.hidden = !hit;
      if (hit) shown += 1;
    });
    if (none) none.hidden = shown > 0;
  });
})();
