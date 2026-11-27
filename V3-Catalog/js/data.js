import { MAX_QUANTITY } from './cart.js';

const prefixes = new Map([
  ['Audio', 'vt-aud-'], ['Periféricos', 'vt-per-'], ['Conectividad', 'vt-con-'], ['Workspace', 'vt-wsp-'],
]);
export const CATEGORIES = [...prefixes.keys()];
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isTextList = (value, min, max) => Array.isArray(value) &&
  value.length >= min && value.length <= max && Array.from(value).every(isText);

export function validateCatalog(products) {
  if (!Array.isArray(products) || products.length !== 12) throw new TypeError('Se requieren doce productos.');

  const ids = new Set();
  const images = new Set();
  const categories = new Map(CATEGORIES.map((category) => [category, 0]));
  let maxTotal = 0;

  for (const product of products) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) throw new TypeError('Ficha inválida.');
    const { id, name, category, priceCents, shortDescription, specs, image, alt, searchTags } = product;
    if (!prefixes.has(category) || typeof id !== 'string' || !id.startsWith(prefixes.get(category)) ||
        !/^vt-(?:aud|per|con|wsp)-\d{2}$/.test(id) || ids.has(id) ||
        !Number.isSafeInteger(priceCents) || priceCents <= 0 || !isText(name) || !isText(shortDescription) ||
        !isTextList(specs, 2, 3) || !isTextList(searchTags, 1, 15) || !isText(alt) ||
        typeof image !== 'string' || !/^assets\/img\/prod-[a-z0-9-]+\.webp$/.test(image) || images.has(image)) {
      throw new TypeError('Ficha del catálogo inválida o duplicada.');
    }
    ids.add(id);
    images.add(image);
    categories.set(category, categories.get(category) + 1);
    maxTotal += priceCents * MAX_QUANTITY;
  }

  if ([...categories.values()].some((count) => count !== 3)) throw new TypeError('Se requieren tres productos por categoría.');
  if (!Number.isSafeInteger(maxTotal)) throw new RangeError('El total del catálogo excede el rango seguro.');
  return products;
}

export async function loadCatalog() {
  const response = await fetch(new URL('../data/productos.json', import.meta.url));
  if (!response.ok) throw new Error(`El catálogo respondió con HTTP ${response.status}.`);
  return validateCatalog(await response.json());
}

export function readFallbackCatalog(grid) {
  const products = [...grid.querySelectorAll('article[data-product]')]
    .map((card) => JSON.parse(card.dataset.product));
  return validateCatalog(products);
}
