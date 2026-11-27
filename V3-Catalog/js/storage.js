import { sanitizeCart } from './cart.js';

export const CART_KEY = 'vertice_cart_v1';
export const THEME_KEY = 'vertice_theme_v1';

function read(key) {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readCart(productsById) {
  try {
    return sanitizeCart(JSON.parse(read(CART_KEY)), productsById);
  } catch {
    return [];
  }
}

export function writeCart(cart, productsById) {
  return write(CART_KEY, JSON.stringify(sanitizeCart(cart, productsById)));
}

export function readTheme() {
  const theme = read(THEME_KEY);
  return theme === 'dark' || theme === 'light' ? theme : null;
}

export function writeTheme(theme) {
  return (theme === 'dark' || theme === 'light') && write(THEME_KEY, theme);
}
