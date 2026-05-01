import { CartItem } from '../components/CartScreen';

const CART_STORAGE_KEY = 'sheetcutters_cart';

export function saveCartToLocalStorage(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

export function loadCartFromLocalStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    return [];
  }
}

export function clearCartFromLocalStorage(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart from localStorage:', error);
  }
}

export function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
