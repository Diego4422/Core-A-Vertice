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
      if (event.target.closest('a')) setMenu(false);
    });

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        if (menu.getClientRects().length) menu.focus();
      }
    });

    header.addEventListener('focusout', (event) => {
      if (!header.contains(event.relatedTarget)) setMenu(false);
    });
  }
}

const form = document.querySelector('.contact-form');

if (form) {
  const fields = form.querySelector('fieldset');
  const message = form.querySelector('#mensaje');
  const status = form.querySelector('[role="status"]');

  if (fields && message && status) {
    form.addEventListener('input', () => {
      message.setCustomValidity('');
      status.textContent = '';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!message.value.trim()) {
        message.setCustomValidity('Escribe un mensaje de ejemplo.');
        message.reportValidity();
        return;
      }
      form.reset();
      status.textContent = 'Demostración completada. No se envió ni se guardó ningún dato.';
    });

    fields.disabled = false;
  }
}
