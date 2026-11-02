/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
(function () {
  if (!window.HAS_DOM) return;
  const R = window.TESTS;
  Promise.all(R.async).then(() => {
  const s = document.getElementById('sum');
  s.innerHTML = R.fail === 0 ? '<span class="ok">' + R.pass + ' pruebas, todas pasan</span>' : '<span class="bad">' + R.fail + ' fallan</span> de ' + (R.pass + R.fail);
  document.title = 'PalynoPro — ' + (R.fail ? R.fail + ' fallan' : R.pass + ' pruebas');
  });
})();
