/**
 * Centralized Cart Pricing Calculations
 * 
 * Single source of truth for all cart item price calculations.
 * This ensures consistency across SummaryScreen, CartScreen, and CheckoutScreen.
 * 
 * Business Rules:
 * - Setup cost is charged once per item, not per piece
 * - For qty=1: Total = Unit Price
 * - For qty>1: Total = (Unit Price - Setup Cost) × Quantity + Setup Cost
 * - Sketch services don't use setup cost logic
 * 
 * Example:
 * - Unit Price: ₹1847.37 (includes ₹100 setup cost)
 * - Quantity: 2
 * - Without optimization: ₹1847.37 × 2 = ₹3694.74
 * - With optimization: (₹1847.37 - ₹100) × 2 + ₹100 = ₹3594.74
 * - Savings: ₹100 (one setup cost eliminated)
 */

export interface PricingInput {
  unitPrice: number;          // Price per piece (includes setup cost)
  quantity: number;           // Number of pieces
  isSketchService?: boolean;  // Sketch services use different pricing
}

export interface PricingResult {
  unitPrice: number;          // Original unit price
  quantity: number;           // Quantity
  subtotal: number;           // Price before GST
  gstRate: number;            // GST rate (0.18 or 0.12)
  gstAmount: number;          // GST amount
  total: number;              // Final total (GST-inclusive)
  setupCostSavings?: number;  // Amount saved by not duplicating setup cost
}

/**
 * Calculate total price for a cart item with setup cost applied only once
 * 
 * @param input - Pricing input (unitPrice, quantity, isSketchService)
 * @param setupCost - Setup cost from pricing constants (default: 100)
 * @returns Total price
 */
export function calculateItemTotal(
  input: PricingInput,
  setupCost: number = 100
): number {
  const { unitPrice, quantity, isSketchService } = input;

  // For sketch services or single quantity, return price as-is
  if (isSketchService || quantity === 1) {
    return unitPrice * quantity;
  }

  // For multiple quantities: remove setup cost from unit price, multiply, then add setup cost once
  const priceWithoutSetup = unitPrice - setupCost;
  const totalWithoutSetup = priceWithoutSetup * quantity;
  return totalWithoutSetup + setupCost;
}

/**
 * Calculate detailed pricing breakdown for a cart item
 * 
 * @param input - Pricing input
 * @param setupCost - Setup cost from pricing constants
 * @returns Detailed pricing breakdown
 */
export function calculateItemPricing(
  input: PricingInput,
  setupCost: number = 100
): PricingResult {
  const { unitPrice, quantity, isSketchService } = input;

  // Calculate total using centralized logic
  const total = calculateItemTotal(input, setupCost);

  // Determine GST rate based on service type
  const gstRate = isSketchService ? 0.18 : 0.18;

  // Reverse calculate subtotal and GST (prices are GST-inclusive)
  const subtotal = total / (1 + gstRate);
  const gstAmount = total - subtotal;

  // Calculate setup cost savings for qty > 1
  let setupCostSavings: number | undefined;
  if (!isSketchService && quantity > 1) {
    const totalWithoutOptimization = unitPrice * quantity;
    setupCostSavings = totalWithoutOptimization - total;
  }

  return {
    unitPrice,
    quantity,
    subtotal,
    gstRate,
    gstAmount,
    total,
    setupCostSavings,
  };
}

/**
 * Calculate cart totals with GST separation
 * 
 * @param items - Array of pricing inputs
 * @param setupCost - Setup cost from pricing constants
 * @returns Cart totals with GST breakdown
 */
export function calculateCartTotals(
  items: PricingInput[],
  setupCost: number = 100
): {
  laserCuttingTotal: number;
  laserSubtotal: number;
  laserTax: number;
  cadServiceTotal: number;
  cadSubtotal: number;
  cadTax: number;
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  // Separate items by service type
  const laserItems = items.filter(item => !item.isSketchService);
  const cadItems = items.filter(item => item.isSketchService);

  // Calculate laser cutting totals (18% GST)
  const laserCuttingTotal = laserItems.reduce((sum, item) => {
    return sum + calculateItemTotal(item, setupCost);
  }, 0);

  const laserSubtotal = laserCuttingTotal / 1.18;
  const laserTax = laserCuttingTotal - laserSubtotal;

  // Calculate CAD service totals (18% GST - updated per GST Council 2025/2026)
  const cadServiceTotal = cadItems.reduce((sum, item) => {
    return sum + calculateItemTotal(item, setupCost);
  }, 0);

  const cadSubtotal = cadServiceTotal / 1.18;
  const cadTax = cadServiceTotal - cadSubtotal;

  // Combined totals
  const subtotal = laserSubtotal + cadSubtotal;
  const taxAmount = laserTax + cadTax;
  const total = laserCuttingTotal + cadServiceTotal;

  return {
    laserCuttingTotal,
    laserSubtotal,
    laserTax,
    cadServiceTotal,
    cadSubtotal,
    cadTax,
    subtotal,
    taxAmount,
    total,
  };
}