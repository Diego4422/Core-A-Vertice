'use strict';

const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');

if (themeToggle && window.matchMedia) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let followsSystem = true;

  function applyTheme(dark) {
    root.classList.toggle('dark', dark);
    themeToggle.setAttribute('aria-pressed', String(dark));
  }

  applyTheme(systemTheme.matches);
  themeToggle.addEventListener('click', () => {
    followsSystem = false;
    applyTheme(!root.classList.contains('dark'));
  });
  systemTheme.addEventListener('change', (event) => {
    if (followsSystem) applyTheme(event.matches);
  });
  themeToggle.hidden = false;
}

const header = document.querySelector('[data-header]');

if (header) {
  const menu = header.querySelector('[data-menu-toggle]');
  const nav = header.querySelector('#navegacion');

  if (menu && nav) {
    function setMenu(open) {
      menu.setAttribute('aria-expanded', String(open));
      header.dataset.menu = open ? 'open' : 'closed';
    }

    setMenu(false);
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
    menu.hidden = false;
  }
}

const form = document.querySelector('[data-demo-form]');

if (form) {
  const fieldset = form.querySelector('fieldset');
  const alert = form.querySelector('[role="alert"]');
  const status = form.querySelector('[role="status"]');
  const messages = {
    nombre: 'Escribe un nombre de ejemplo.',
    correo: 'Escribe un correo de ejemplo válido, como persona@example.test.',
    categoria: 'Selecciona una categoría de interés.',
    mensaje: 'Escribe un mensaje de ejemplo.',
  };
  const fields = Object.entries(messages).map(([id, message]) => ({
    control: form.querySelector('#' + id),
    error: form.querySelector('#' + id + '-error'),
    message,
  }));

  if (fieldset && alert && status && fields.every(({ control, error }) => control && error)) {
    function setError(field, invalid) {
      const { control, error, message } = field;
      if (invalid) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      error.textContent = invalid ? message : '';
      error.hidden = !invalid;
    }

    function invalidField({ control }) {
      return !control.validity.valid || !control.value.trim();
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      status.textContent = '';
      const invalid = fields.filter(invalidField);
      fields.forEach((field) => setError(field, invalid.includes(field)));
      if (invalid.length) {
        alert.textContent = 'Revisa los campos señalados para completar la demostración.';
        invalid[0].control.focus();
        return;
      }

      alert.textContent = '';
      form.reset();
      status.textContent = 'Demostración completada. No se envió ni se guardó ningún dato.';
    });

    form.addEventListener('input', (event) => {
      status.textContent = '';
      const field = fields.find(({ control }) => control === event.target);
      if (!field || !field.control.hasAttribute('aria-invalid')) return;

      setError(field, invalidField(field));
      if (!form.querySelector('[aria-invalid="true"]')) alert.textContent = '';
    });

    form.noValidate = true;
    fieldset.disabled = false;
  }
}
