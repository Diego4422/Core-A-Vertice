import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CATEGORIES, loadCatalog, readFallbackCatalog, validateCatalog } from '../js/data.js';
import { changeQuantity, MAX_QUANTITY, removeItem, sanitizeCart, summarizeCart } from '../js/cart.js';
import { CART_KEY, THEME_KEY, readCart, readTheme, writeCart, writeTheme } from '../js/storage.js';
import { buildOrderMessage, buildWhatsAppUrl, filterProducts, formatSoles, normalizeText } from '../js/utils.js';

const catalog = JSON.parse(readFileSync(new URL('../data/productos.json', import.meta.url), 'utf8'));
const products = new Map(validateCatalog(catalog).map((product) => [product.id, product]));
const id = 'vt-aud-01';
const item = (identifier, quantity) => ({ id: identifier, quantity });

function mockStorage(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
}

test('normaliza mayúsculas, tildes, espacios y entradas inesperadas', () => {
  assert.equal(normalizeText('  RATÓN   Ergonómico  '), 'raton ergonomico');
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(7), '');
});

test('combina términos y categorías, admite etiquetas y devuelve un estado vacío', () => {
  assert.deepEqual(filterProducts(catalog, 'ERGONÓMICO RATÓN', 'Periféricos').map(({ id }) => id), ['vt-per-02']);
  assert.deepEqual(filterProducts(catalog, 'ERGONÓMICO RATÓN', 'Audio'), []);
  assert.equal(filterProducts(catalog, 'parlante', 'Audio')[0].id, 'vt-aud-03');
  for (const category of CATEGORIES) assert.equal(filterProducts(catalog, '', category).length, 3);
  assert.equal(filterProducts(catalog, ' ', 'Todos').length, 12);
});

test('formatea céntimos enteros con precisión y rechaza valores inválidos', () => {
  assert.equal(formatSoles(0), 'S/ 0.00');
  assert.equal(formatSoles(13900), 'S/ 139.00');
  assert.equal(formatSoles(89900), 'S/ 899.00');
  assert.equal(formatSoles(3107), 'S/ 31.07');
  assert.equal(formatSoles(-102), '-S/ 1.02');
  for (const invalid of ['2500', NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(formatSoles(invalid), 'S/ 0.00');
  }
});

test('añade, incrementa, reduce hasta retirar y conserva inmutabilidad', () => {
  const initial = Object.freeze([Object.freeze(item(id, 1))]);
  const added = changeQuantity(initial, 'vt-wsp-03', 1, products);
  const increased = changeQuantity(added, id, 1, products);
  assert.deepEqual(initial, [item(id, 1)]);
  assert.deepEqual(increased, [item(id, 2), item('vt-wsp-03', 1)]);
  assert.deepEqual(changeQuantity(increased, 'vt-wsp-03', -1, products), [item(id, 2)]);
  assert.deepEqual(removeItem(increased, id), [item('vt-wsp-03', 1)]);
});

test('limita a 99 y rechaza ID, incremento o decremento inaplicables', () => {
  const full = [item(id, MAX_QUANTITY)];
  assert.equal(changeQuantity(full, id, 1, products), full);
  assert.equal(changeQuantity(full, 'inexistente', 1, products), full);
  assert.equal(changeQuantity(full, id, 5, products), full);
  assert.equal(changeQuantity(full, 'vt-wsp-03', -1, products), full);
  assert.equal(changeQuantity(full, id, -1, products)[0].quantity, 98);
});

test('sanitiza estructuras corruptas, duplicados, IDs desconocidos y cantidades inválidas', () => {
  const invalid = [null, {}, item('otro', 1), item(id, -1), item(id, 0), item(id, 2.3),
    item(id, NaN), item(id, 100), item(id, '1')];
  for (const row of invalid) assert.deepEqual(sanitizeCart([row], products), []);
  assert.deepEqual(sanitizeCart({ 0: item(id, 1) }, products), []);
  assert.deepEqual(sanitizeCart([{ ...item(id, 2), priceCents: 1 }, item(id, 5)], products), [item(id, 2)]);
});

test('calcula subtotales y total en céntimos con precios del catálogo validado', () => {
  const result = summarizeCart([{ ...item(id, 2), priceCents: 1 }, item('vt-wsp-03', 3)], products);
  assert.deepEqual(result.lines.map((line) => line.subtotalCents), [179800, 41700]);
  assert.equal(result.units, 5);
  assert.equal(result.totalCents, 221500);
  assert.deepEqual(summarizeCart([], products), { lines: [], units: 0, totalCents: 0 });
});

test('la validación exige doce fichas coherentes, identificadores únicos y un total seguro', () => {
  assert.equal(validateCatalog(catalog).length, 12);
  for (const change of [
    { id: catalog[1].id }, { category: 'otro' }, { category: 'Workspace' },
    { name: ' ' }, { image: 'https://example.test/prod.webp' }, { image: catalog[1].image },
    { image: 'assets/img/../prod-aura-anc.webp' }, { specs: ['', 'Prueba'] },
    { searchTags: {} }, { priceCents: 99.99 }, { priceCents: -1 }, { priceCents: Number.MAX_SAFE_INTEGER },
  ]) {
    assert.throws(() => validateCatalog([{ ...catalog[0], ...change }, ...catalog.slice(1)]));
  }
  assert.throws(() => validateCatalog(catalog.slice(1)));
});

test('fetch comprueba HTTP antes de leer y rechaza JSON o esquema inválido', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => catalog }));
  assert.equal(await loadCatalog(), catalog);
  assert.match(mock.mock.calls[0].arguments[0].pathname, /\/data\/productos\.json$/);
  for (const status of [404, 500]) {
    mock.mock.mockImplementation(async () => ({ ok: false, status, json: async () => assert.fail() }));
    await assert.rejects(loadCatalog, new RegExp(String(status)));
  }
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => JSON.parse('inválido') }));
  await assert.rejects(loadCatalog, SyntaxError);
  mock.mock.mockImplementation(async () => ({ ok: true, json: async () => [] }));
  await assert.rejects(loadCatalog, TypeError);
});

test('el respaldo generado contiene los datos, precios y fotos de los doce productos', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const block = page.split('<!-- CATALOG:START -->')[1].split('<!-- CATALOG:END -->')[0];
  const cards = [...block.matchAll(/<article [\s\S]*?<\/article>/g)].map(([markup]) => ({
    markup, dataset: { product: markup.match(/data-product="([^"]+)"/)[1].replaceAll('&quot;', '"')
      .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&') },
  }));
  assert.deepEqual(readFallbackCatalog({ querySelectorAll: () => cards }), catalog);
  cards.forEach(({ markup }, index) => {
    assert.ok(markup.includes(formatSoles(catalog[index].priceCents)));
    assert.ok(markup.includes(`src="${catalog[index].image}"`));
    assert.ok(markup.includes(' hidden>Añadir al carrito'));
  });
});

test('filtra lo persistido, guarda solo ID y cantidad y separa el tema', (t) => {
  const saved = new Map([[CART_KEY, '{'], [THEME_KEY, '{"dark":true}']]);
  mockStorage(t, {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  });
  assert.deepEqual(readCart(products), []);
  assert.equal(readTheme(), null);
  assert.equal(writeTheme('dark'), true);
  assert.equal(writeTheme('sepia'), false);
  assert.equal(writeCart([{ ...item(id, 1), priceCents: 1, name: 'Ajeno' }, item('x', 1)], products), true);
  assert.equal(saved.get(CART_KEY), '[{"id":"vt-aud-01","quantity":1}]');
  assert.deepEqual(readCart(products), [item(id, 1)]);
  assert.equal(readTheme(), 'dark');
  writeCart([], products);
  assert.equal(readTheme(), 'dark');
  saved.set(CART_KEY, '{}');
  assert.deepEqual(readCart(products), []);
});

test('si el almacenamiento falla, la lectura y las escrituras degradan sin excepciones', (t) => {
  const fail = () => { throw new Error('Storage bloqueado'); };
  mockStorage(t, { getItem: fail, setItem: fail });
  assert.equal(readTheme(), null);
  assert.deepEqual(readCart(products), []);
  assert.equal(writeTheme('light'), false);
  assert.equal(writeCart([item(id, 1)], products), false);
});

test('genera texto plano y una URL demostrativa bien codificada sin destinatario', () => {
  const summary = buildOrderMessage(summarizeCart([item(id, 2)], products));
  assert.match(summary, /2 × VÉRTICE Aura ANC · S\/ 1798\.00/);
  assert.match(summary, /Total: S\/ 1798\.00/);
  const url = new URL(buildWhatsAppUrl(summary + '& á'));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/');
  assert.equal(url.searchParams.get('text'), summary + '& á');
  assert.doesNotThrow(() => buildWhatsAppUrl('\ud800'));
});
