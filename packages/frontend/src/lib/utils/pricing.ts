/**
 * Utility functions for pricing calculations and formatting
 * Maintains single version of truth for pricing logic across the platform
 */

export interface ProductPricing {
  price?: number;
  quantity?: number;
}

/**
 * Calculate total value for a single product (price * quantity)
 */
export function calculateProductTotal(product: ProductPricing): number {
  const price = product.price || 0;
  const quantity = product.quantity || 1;
  return price * quantity;
}

/**
 * Calculate total value for multiple products
 */
export function calculateTotalValue(products: ProductPricing[]): number {
  return products.reduce((total, product) => total + calculateProductTotal(product), 0);
}

/**
 * Format price in Indian Rupees with proper localization
 */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Format price with fallback for undefined/null values
 */
export function formatPriceWithFallback(amount?: number, fallback: string = 'N/A'): string {
  if (amount === undefined || amount === null) {
    return fallback;
  }
  return formatPrice(amount);
}

/**
 * Get formatted product price with quantity information
 */
export function getProductPriceDisplay(product: ProductPricing): string {
  const basePrice = formatPriceWithFallback(product.price, 'Price not set');
  const quantity = product.quantity || 1;
  
  if (quantity > 1) {
    return `${basePrice} (Qty: ${quantity})`;
  }
  
  return basePrice;
}

/**
 * Get formatted total value display for products
 */
export function getTotalValueDisplay(products: ProductPricing[]): string {
  const total = calculateTotalValue(products);
  return `Total: ${formatPrice(total)}`;
}
