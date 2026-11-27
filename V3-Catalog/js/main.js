import { changeQuantity, MAX_QUANTITY, removeItem, summarizeCart } from './cart.js';
import { loadCatalog, readFallbackCatalog } from './data.js';
import { readCart, readTheme, writeCart, writeTheme } from './storage.js';
import { buildOrderMessage, filterProducts, formatSoles } from './utils.js';

const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');

if (themeToggle && window.matchMedia) {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = readTheme();
  let followsSystem = !savedTheme;

  function applyTheme(dark) {
    root.classList.toggle('dark', dark);
    themeToggle.setAttribute('aria-pressed', String(dark));
  }

  applyTheme(savedTheme ? savedTheme === 'dark' : systemTheme.matches);
  themeToggle.addEventListener('click', () => {
    followsSystem = false;
    const dark = !root.classList.contains('dark');
    applyTheme(dark);
    writeTheme(dark ? 'dark' : 'light');
  });
  systemTheme.addEventListener('change', (event) => {
    if (followsSystem) applyTheme(event.matches);
  });
  themeToggle.disabled = false;
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

function initializeDrawer(productsById) {
  const parts = Object.fromEntries([
    ['drawer', '#carrito-panel'], ['trigger', '[data-cart-trigger]'], ['badge', '[data-cart-count]'],
    ['live', '[data-cart-announcement]'], ['feedback', '[data-cart-feedback]'],
    ['close', '[data-cart-close]'], ['items', '[data-cart-items]'], ['row', '#cart-row-template'],
    ['empty', '[data-cart-empty]'], ['drawerCount', '[data-drawer-count]'], ['total', '[data-cart-total]'],
    ['controls', '[data-order-controls]'], ['summary', '[data-order-summary]'],
    ['details', '[data-order-details]'], ['copy', '[data-copy-order]'], ['copied', '[data-copy-status]'],
    ['clear', '[data-clear-cart]'], ['storage', '[data-storage-note]'],
  ].map(([name, selector]) => [name, document.querySelector(selector)]));
  if (Object.values(parts).some((node) => !node) || typeof parts.drawer.showModal !== 'function') return null;

  let cart = readCart(productsById);
  let feedbackTimeout;
  let pointerStartedOutside = false;

  function makeRow(line) {
    const row = parts.row.content.firstElementChild.cloneNode(true);
    row.dataset.cartId = line.id;
    row.querySelector('[data-row-image]').src = productsById.get(line.id).image;
    row.querySelector('[data-row-name]').textContent = line.name;
    row.querySelector('[data-row-unit]').textContent = `${formatSoles(line.priceCents)} por unidad`;
    row.querySelector('[data-row-quantity]').textContent = line.quantity;
    row.querySelector('[data-row-subtotal]').textContent = formatSoles(line.subtotalCents);
    const decrease = row.querySelector('[data-action="decrease"]');
    const increase = row.querySelector('[data-action="increase"]');
    const remove = row.querySelector('[data-action="remove"]');
    decrease.setAttribute('aria-label', `Reducir cantidad de ${line.name}`);
    increase.setAttribute('aria-label', `Aumentar cantidad de ${line.name}`);
    remove.setAttribute('aria-label', `Eliminar ${line.name}`);
    increase.disabled = line.quantity >= MAX_QUANTITY;
    return row;
  }

  function paintCart(focusRow) {
    const order = summarizeCart(cart, productsById);
    const units = String(order.units);
    const count = order.units === 1 ? '1 unidad' : `${units} unidades`;
    const fragment = document.createDocumentFragment();
    order.lines.forEach((line) => fragment.append(makeRow(line)));
    parts.items.replaceChildren(fragment);
    parts.badge.textContent = units;
    parts.badge.toggleAttribute('data-wide', units.length > 1);
    parts.trigger.setAttribute('aria-label', `Abrir carrito, ${count}`);
    if (parts.drawerCount.textContent !== count) parts.drawerCount.textContent = count;
    parts.empty.hidden = order.units !== 0;
    parts.controls.hidden = order.units === 0;
    parts.total.textContent = formatSoles(order.totalCents);
    parts.summary.value = order.units ? buildOrderMessage(order) : '';
    parts.copied.textContent = '';

    if (!focusRow) return count;
    const rows = [...parts.items.children];
    const same = rows.find((row) => row.dataset.cartId === focusRow.id);
    const next = same || rows[Math.min(focusRow.index, rows.length - 1)];
    const sameAction = next?.querySelector(`[data-action="${focusRow.action}"]:not(:disabled)`);
    (sameAction || next?.querySelector('button:not(:disabled)') || parts.close).focus();
  }

  function commit(next, focusRow) {
    cart = next;
    parts.storage.hidden = writeCart(cart, productsById);
    return paintCart(focusRow);
  }

  function outsidePanel(event) {
    const box = parts.drawer.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
  }

  parts.trigger.addEventListener('click', () => {
    parts.feedback.hidden = true;
    parts.drawer.showModal();
    parts.trigger.setAttribute('aria-expanded', 'true');
    parts.close.focus();
  });
  parts.close.addEventListener('click', () => parts.drawer.close());
  parts.drawer.addEventListener('close', () => {
    parts.trigger.setAttribute('aria-expanded', 'false');
    parts.trigger.focus();
  });
  parts.drawer.addEventListener('pointerdown', (event) => {
    pointerStartedOutside = outsidePanel(event);
  });
  parts.drawer.addEventListener('click', (event) => {
    if (pointerStartedOutside && outsidePanel(event)) parts.drawer.close();
    pointerStartedOutside = false;
  });
  parts.drawer.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const focusable = [...parts.drawer.querySelectorAll('button:not(:disabled), summary, textarea')]
      .filter((element) => element.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    const focused = document.activeElement;
    if (event.shiftKey ? focused === first : focused === last) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });
  parts.items.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    const row = button?.closest('[data-cart-id]');
    if (!row) return;

    const { action } = button.dataset;
    const id = row.dataset.cartId;
    const index = [...parts.items.children].indexOf(row);
    const next = action === 'remove' ? removeItem(cart, id) :
      changeQuantity(cart, id, action === 'increase' ? 1 : -1, productsById);
    commit(next, { id, index, action });
  });
  parts.clear.addEventListener('click', () => {
    commit([]);
    parts.close.focus();
  });
  parts.copy.addEventListener('click', async () => {
    const summary = parts.summary.value;
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      if (parts.drawer.open && parts.summary.value === summary) {
        parts.copied.textContent = 'Resumen copiado al portapapeles.';
      }
    } catch {
      if (!parts.drawer.open || parts.summary.value !== summary) return;
      parts.details.open = true;
      parts.summary.focus();
      parts.summary.select();
      parts.copied.textContent = 'No se pudo acceder al portapapeles. El resumen está seleccionado para que lo copies manualmente.';
    }
  });

  paintCart();
  parts.feedback.setAttribute('aria-hidden', 'true');
  parts.trigger.disabled = false;

  return function add(id) {
    const next = changeQuantity(cart, id, 1, productsById);
    if (!productsById.has(id)) return;
    const name = productsById.get(id).name;
    if (next === cart) {
      parts.feedback.textContent = `El límite es de ${MAX_QUANTITY} unidades por producto.`;
      parts.live.textContent = parts.feedback.textContent;
    } else {
      const count = commit(next);
      parts.feedback.textContent = `${name} se añadió al carrito.`;
      parts.live.textContent = `${parts.feedback.textContent} ${count} en el carrito.`;
    }
    parts.feedback.hidden = false;
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => { parts.feedback.hidden = true; }, 3500);
  };
}

async function initializeCatalog() {
  const grid = document.querySelector('[data-product-grid]');
  const loading = document.querySelector('[data-catalog-status]');
  const controls = document.querySelector('[data-catalog-controls]');
  const search = document.querySelector('#buscar-productos');
  const clearSearch = document.querySelector('[data-clear-search]');
  const filters = document.querySelector('[data-filters]');
  const count = document.querySelector('[data-result-count]');
  const empty = document.querySelector('[data-empty-results]');
  const reset = document.querySelector('[data-reset-filters]');
  const template = grid?.querySelector('article[data-product]');
  if (!grid || !loading || !controls || !search || !clearSearch || !filters || !count || !empty || !reset || !template) {
    if (loading) loading.textContent = 'Puedes consultar los productos y sus precios en el catálogo de respaldo.';
    return;
  }

  grid.setAttribute('aria-busy', 'true');
  loading.textContent = 'Cargando catálogo…';
  let products;
  try {
    products = await loadCatalog();
    loading.textContent = '';
  } catch {
    try {
      products = readFallbackCatalog(grid);
      loading.textContent = 'El catálogo actualizado no está disponible. Estás usando el catálogo de respaldo.';
    } catch {
      loading.textContent = 'No se pudo activar el catálogo interactivo. Puedes consultar los productos visibles.';
      return;
    }
  } finally {
    grid.removeAttribute('aria-busy');
  }

  const add = initializeDrawer(new Map(products.map((product) => [product.id, product])));
  const cards = new Map(products.map((product) => {
    const card = template.cloneNode(true);
    card.removeAttribute('data-product');
    const img = card.querySelector('img');
    img.src = product.image;
    img.alt = product.alt;
    card.querySelector('[data-product-category]').textContent = product.category;
    card.querySelector('[data-product-name]').textContent = product.name;
    card.querySelector('[data-product-description]').textContent = product.shortDescription;
    card.querySelector('[data-product-price]').textContent = formatSoles(product.priceCents);
    const specs = document.createDocumentFragment();
    for (const value of product.specs) {
      const spec = document.createElement('li');
      spec.textContent = value;
      specs.append(spec);
    }
    card.querySelector('[data-product-specs]').replaceChildren(specs);
    const button = card.querySelector('[data-add]');
    button.dataset.add = product.id;
    button.setAttribute('aria-label', `Añadir al carrito: ${product.name}`);
    button.hidden = !add;
    return [product.id, card];
  }));

  let category = 'Todos';
  function renderCatalog() {
    const matching = filterProducts(products, search.value, category);
    const fragment = document.createDocumentFragment();
    for (const product of matching) fragment.append(cards.get(product.id));
    grid.replaceChildren(fragment);
    empty.hidden = matching.length !== 0;
    clearSearch.hidden = !search.value;
    count.textContent = matching.length === products.length
      ? `${products.length} productos disponibles`
      : `Mostrando ${matching.length} de ${products.length} productos`;
  }

  function selectCategory(value) {
    category = value;
    for (const button of filters.querySelectorAll('button[data-category]')) {
      button.setAttribute('aria-pressed', String(button.dataset.category === category));
    }
    renderCatalog();
  }

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-category]');
    if (button) selectCategory(button.dataset.category);
  });
  search.addEventListener('input', renderCatalog);
  clearSearch.addEventListener('click', () => {
    search.value = '';
    search.focus();
    renderCatalog();
  });
  reset.addEventListener('click', () => {
    search.value = '';
    search.focus();
    selectCategory('Todos');
  });
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-add]');
    if (button && add) add(button.dataset.add);
  });
  controls.hidden = false;
  renderCatalog();
}

initializeCatalog();
