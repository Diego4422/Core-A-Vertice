import { access, readFile, writeFile } from 'node:fs/promises';
import { validateCatalog } from '../js/data.js';
import { formatSoles } from '../js/utils.js';

const root = new URL('../', import.meta.url);
const html = new URL('index.html', root);
const products = validateCatalog(JSON.parse(await readFile(new URL('data/productos.json', root), 'utf8')));
const start = '          <!-- CATALOG:START -->';
const end = '          <!-- CATALOG:END -->';

function escapeHtml(text) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return text.replace(/[&<>"]/g, (character) => entities[character]);
}

function renderCard(product) {
  const { name, category, priceCents, shortDescription, specs, image, alt } = product;
  return `
          <article class="group/product flex min-w-0 flex-col overflow-hidden rounded-lg border border-border-light bg-white dark:border-border-dark dark:bg-surface-dark" data-product="${escapeHtml(JSON.stringify(product))}">
            <div class="overflow-hidden">
              <img class="aspect-square w-full object-contain transition-transform duration-200 motion-safe:group-hover/product:scale-[1.025] motion-reduce:transition-none" src="${image}" width="800" height="800" loading="lazy" decoding="async" alt="${escapeHtml(alt)}">
            </div>
            <div class="flex flex-1 flex-col p-4 sm:p-5">
              <p class="mb-2 text-sm font-semibold text-copper-text dark:text-copper" data-product-category>${escapeHtml(category)}</p>
              <h3 class="text-xl xl:text-[1.35rem]" data-product-name>${escapeHtml(name)}</h3>
              <p class="mt-2.5 text-sm text-titanium dark:text-titanium-light" data-product-description>${escapeHtml(shortDescription)}</p>
              <ul class="mt-4 space-y-1.5 border-t border-border-light pt-3 text-sm text-titanium dark:border-border-dark dark:text-titanium-light" data-product-specs>
                ${specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join('\n                ')}
              </ul>
              <div class="mt-auto pt-5">
                <p class="font-display text-2xl font-bold tabular-nums" data-product-price>${formatSoles(priceCents)}</p>
                <button class="mt-3 min-h-12 w-full cursor-pointer rounded-sm bg-copper px-3 py-2 text-sm font-semibold text-graphite hover:bg-copper-hover" type="button" aria-label="Añadir al carrito: ${escapeHtml(name)}" data-add="${product.id}" hidden>Añadir al carrito</button>
              </div>
            </div>
          </article>`;
}

const source = await readFile(html, 'utf8');
const from = source.indexOf(start);
const to = source.indexOf(end);
if (from < 0 || to <= from || source.lastIndexOf(start) !== from || source.lastIndexOf(end) !== to) {
  throw new Error('Se requiere exactamente un bloque de catálogo.');
}
for (const product of products) await access(new URL(product.image, root));
const output = source.slice(0, from + start.length) + products.map(renderCard).join('') + '\n' + source.slice(to);
if (output !== source) await writeFile(html, output);
