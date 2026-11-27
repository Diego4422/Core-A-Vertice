'use strict';

const header = document.querySelector('[data-header]');

if (header) {
  const menu = header.querySelector('.menu-toggle');
  const nav = header.querySelector('#navegacion');

  if (menu && nav) {
    function setMenu(open) {
      menu.setAttribute('aria-expanded', String(open));
    }

    menu.hidden = false;
    menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));

    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link || menu.getAttribute('aria-expanded') !== 'true') return;

      const destination = document.getElementById(link.hash.slice(1));
      (destination || menu).focus({ preventScroll: true });
      setMenu(false);
    });

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        if (menu.getClientRects().length) menu.focus();
      }
    });

    header.addEventListener('focusout', (event) => {
      const next = event.relatedTarget;
      if (next && (!(next instanceof Node) || !header.contains(next))) setMenu(false);
    });
  }
}

const form = document.querySelector('.contact-form');

if (form) {
  const fields = form.querySelector('fieldset');
  const name = form.querySelector('#nombre');
  const message = form.querySelector('#mensaje');
  const status = form.querySelector('[role="status"]');

  if (fields && name && message && status) {
    function validateText(field) {
      const hint = field === name ? 'Escribe un nombre de ejemplo.' : 'Escribe un mensaje de ejemplo.';
      field.setCustomValidity(field.value.trim() ? '' : hint);
    }

    for (const field of [name, message]) {
      field.addEventListener('input', () => validateText(field));
      field.addEventListener('invalid', () => validateText(field));
    }

    form.addEventListener('input', () => {
      status.textContent = '';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      validateText(name);
      validateText(message);
      if (!form.reportValidity()) return;
      form.reset();
      status.textContent = 'Demostración completada. No se envió ni se guardó ningún dato.';
    });

    fields.disabled = false;
  }
}
