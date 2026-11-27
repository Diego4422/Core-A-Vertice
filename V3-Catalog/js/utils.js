export function normalizeText(value) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')
    : '';
}

export function filterProducts(products, query, category) {
  const terms = normalizeText(query).split(' ').filter(Boolean);
  return products.filter(({ name, category: group, shortDescription, specs, searchTags }) =>
    (category === 'Todos' || category === group) &&
    terms.every((term) => normalizeText([name, group, shortDescription, ...specs, ...searchTags].join(' ')).includes(term))
  );
}

export function formatSoles(cents) {
  if (!Number.isSafeInteger(cents)) return 'S/ 0.00';
  const magnitude = Math.abs(cents);
  const fraction = String(magnitude % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}S/ ${Math.floor(magnitude / 100)}.${fraction}`;
}

export function buildOrderMessage({ lines, totalCents }) {
  const details = lines.map(({ name, quantity, subtotalCents }) =>
    `${quantity} × ${name} · ${formatSoles(subtotalCents)}`
  );
  return ['VÉRTICE Technology · Pedido demostrativo', '', ...details, '', `Total: ${formatSoles(totalCents)}`].join('\n');
}

export function buildWhatsAppUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message.toWellFormed())}`;
}
