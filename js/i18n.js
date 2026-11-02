/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — language (Spanish / English).

   Three ways a text gets translated, so nothing is left half translated:
   1. Rich text is written twice, side by side:
        <span data-l="es">…</span><span data-l="en">…</span>
      and the stylesheet hides the language that is not active (html[lang]).
      Switching is instant and needs no dictionary.
   2. Short plain texts that cannot be duplicated (the options of a <select>,
      placeholders, tooltips) carry both versions as attributes: data-es /
      data-en, data-es-ph / data-en-ph, data-es-title / data-en-title.
      `I18N.apply()` copies the active one.
   3. Text built by JavaScript uses T('español', 'English'); every module that
      draws something listens to the 'langchange' event and draws it again.

   The first language is the one the user chose before; otherwise Spanish, as
   in every app of the LABG Suite, whatever the language of the browser. */
(function () {
  const KEY = 'palynopro.lang';
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };

  function initialLang() {
    const saved = read(KEY);
    return saved === 'es' || saved === 'en' ? saved : 'es';
  }

  const I18N = {
    lang: initialLang(),

    set(lang) {
      if (lang !== 'es' && lang !== 'en') return;
      const changed = lang !== I18N.lang;
      I18N.lang = lang;
      write(KEY, lang);
      I18N.apply();
      if (changed) document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    },

    /* copy the active language into the nodes translated by attributes */
    apply(root) {
      const L = I18N.lang;
      document.documentElement.lang = L;
      const scope = root || document;
      scope.querySelectorAll('[data-es]').forEach(n => { const v = n.getAttribute('data-' + L); if (v != null) n.textContent = v; });
      scope.querySelectorAll('[data-es-ph]').forEach(n => { const v = n.getAttribute('data-' + L + '-ph'); if (v != null) n.setAttribute('placeholder', v); });
      scope.querySelectorAll('[data-es-title]').forEach(n => {
        const v = n.getAttribute('data-' + L + '-title');
        if (v != null) { n.setAttribute('title', v); n.setAttribute('aria-label', v); }
      });
      scope.querySelectorAll('[data-es-label]').forEach(n => { const v = n.getAttribute('data-' + L + '-label'); if (v != null) n.setAttribute('aria-label', v); });
      if (!root) {
        const t = document.querySelector('title');
        if (t && t.dataset.es) document.title = t.getAttribute('data-' + L);
        document.querySelectorAll('.lang-seg button').forEach(b => {
          b.classList.toggle('on', b.dataset.lang === L);
          b.setAttribute('aria-pressed', b.dataset.lang === L ? 'true' : 'false');
        });
      }
    },
  };

  /* T('texto', 'text') → the active language. A pair [es, en] or an object
     {es, en} is accepted too. */
  function T(es, en) {
    if (Array.isArray(es) && en === undefined) return I18N.lang === 'en' ? es[1] : es[0];
    if (es && typeof es === 'object') return I18N.lang === 'en' ? es.en : es.es;
    return I18N.lang === 'en' ? en : es;
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = I18N.lang;
    document.addEventListener('DOMContentLoaded', () => {
      I18N.apply();
      document.querySelectorAll('.lang-seg button').forEach(b => b.addEventListener('click', () => I18N.set(b.dataset.lang)));
    });
  }

  window.I18N = I18N;
  window.T = T;
})();
