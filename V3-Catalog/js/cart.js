export const MAX_QUANTITY = 99;

export function sanitizeCart(value, productsById) {
  if (!Array.isArray(value) || !(productsById instanceof Map)) return [];

  const cart = [];
  const seen = new Set();

  for (const item of value) {
    const { id, quantity } = item ?? {};
    if (!productsById.get(id) || seen.has(id) ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      continue;
    }
    seen.add(id);
    cart.push({ id, quantity });
  }

  return cart;
}

export function removeItem(cart, id) {
  return cart.filter((item) => item.id !== id);
}

export function changeQuantity(cart, id, delta, productsById) {
  if (!productsById.has(id) || (delta !== 1 && delta !== -1)) return cart;

  const current = cart.find((item) => item.id === id);
  const previous = current?.quantity ?? 0;
  const quantity = Math.min(previous + delta, MAX_QUANTITY);

  if (quantity === previous || (!current && quantity < 1)) return cart;
  if (quantity < 1) return removeItem(cart, id);
  if (!current) return [...cart, { id, quantity }];

  return cart.map((item) => item.id === id ? { ...item, quantity } : item);
}

export function summarizeCart(cart, productsById) {
  const lines = sanitizeCart(cart, productsById).map(({ id, quantity }) => {
    const { name, priceCents } = productsById.get(id);
    return { id, name, quantity, priceCents, subtotalCents: priceCents * quantity };
  });
  const totals = lines.reduce(({ units, totalCents }, line) => ({
    units: units + line.quantity,
    totalCents: totalCents + line.subtotalCents,
  }), { units: 0, totalCents: 0 });

  return { lines, ...totals };
}
