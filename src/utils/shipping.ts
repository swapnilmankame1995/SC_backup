/**
 * Shipping Cost Calculation Utility
 * 
 * Calculates shipping costs based on:
 * - Material weight (calculated from dimensions × density × thickness)
 * - Destination state (state-specific rates from database)
 * - Part dimensions (oversized surcharge for large parts)
 * - Order quantity (bulk discount for multiple items)
 * 
 * Shipping Model:
 * 1. Primary: State-based rates configured in admin panel
 * 2. Fallback: Default weight-based tiered rates
 * 3. Modifiers: Oversized surcharge, bulk discount, free shipping threshold
 * 
 * @module shipping
 */

/**
 * Input data for shipping calculations
 */
export interface ShippingCalculationInput {
  material: string;       // Material name (e.g., "Mild Steel")
  thickness: number;      // Thickness in mm
  width: number;          // Width in mm
  height: number;         // Height in mm
  cuttingLength: number;  // Total cutting path length in mm
  quantity?: number;      // Quantity multiplier (optional, defaults to 1)
}

/**
 * Shipping estimate result
 */
export interface ShippingEstimate {
  weight: number;         // Total weight in kg
  cost: number;           // Shipping cost in ₹
  isFreeShipping: boolean; // Whether free shipping applies
}

/**
 * Material densities in kg/m³ (kilograms per cubic meter)
 * 
 * Used to calculate shipping weight from part dimensions.
 * Formula: weight = volume × density
 * where volume = width × height × thickness (converted from mm³ to m³)
 * 
 * Source: Standard engineering material databases
 * Note: Mild Steel used as fallback if material not found
 */
const MATERIAL_DENSITIES: { [key: string]: number } = {
  // Metals (high density = heavy shipping)
  'Mild Steel': 7850,        // Most common steel, general fabrication
  'Stainless Steel': 8000,   // Corrosion-resistant, slightly heavier than mild steel
  'Aluminum': 2700,          // Lightweight alternative, ~1/3 weight of steel
  'Brass': 8500,             // Decorative/electrical applications
  'Copper': 8960,            // Electrical/thermal applications, heaviest common metal
  'Bronze': 8800,            // Marine/bearing applications
  'Steel': 7850,             // Generic steel (same as Mild Steel)
  'Titanium': 4500,          // Aerospace/medical, strong but lightweight
  
  // Plastics (low density = light shipping)
  'Acrylic': 1190,           // Clear plastic, display applications
  'Polycarbonate': 1200,     // Impact-resistant, safety applications
  'PVC': 1300,               // Versatile plastic, chemical resistant
  'ABS': 1050,               // 3D printing, lightweight components
  'PP': 900,                 // Polypropylene, flexible
  'PE': 900,                 // Polyethylene, packaging
  'PS': 1050,                // Polystyrene, insulation
  'PC': 1200,                // Polycarbonate
  'PET': 1350,               // Polyethylene terephthalate
  'POM': 1425,               // Polyoxymethylene (Delrin)
  'PA': 1130,                // Polyamide (Nylon)
  'Nylon': 1130,             // Engineering plastic
  'Teflon': 2200,            // PTFE, low friction
  'Delrin': 1425,            // Acetal, precision machining
  'Plexiglass': 1190,        // Brand name for acrylic
  
  // Composites
  'Fiberglass': 1800,        // Glass fiber reinforced plastic
  'Carbon Fiber': 1700,      // High strength, lightweight
  'Kevlar': 1440,            // Aramid fiber, high tensile strength
  'Graphite': 2200,          // Carbon-based
  
  // Wood & Natural Materials (medium density)
  'MDF': 750,                // Medium-density fiberboard, smooth finish
  'Plywood': 600,            // Layered wood, structural applications
  'Hardwood': 800,           // Oak/maple/etc, furniture grade
  'Wood': 700,               // Generic wood
  'Paper': 800,              // Paper-based materials
  'Cardboard': 600,          // Corrugated cardboard
  
  // Other Materials
  'Foam': 30,                // Extremely lightweight
  'Rubber': 1500,            // Elastic materials
  'Silicone': 2300,          // Flexible, heat-resistant
  'Epoxy': 1800,             // Resin-based
  'Resin': 1800,             // Generic resin
  'Plastic': 1000,           // Generic plastic fallback
  'Glass': 2500,             // Sheet glass
  'Ceramic': 2700,           // Ceramic materials
  'Porcelain': 2700,         // Fine ceramic
  'Marble': 2700,            // Stone
  'Granite': 2700,           // Stone
  'Quartz': 2650,            // Crystal
  'Slate': 2700,             // Stone
  'Limestone': 2700,         // Stone
  'Sandstone': 2700,         // Stone
  'Basalt': 2700,            // Volcanic rock
  'Pumice': 2700,            // Volcanic rock
  'Obsidian': 2650,          // Volcanic glass
};

/**
 * Fallback shipping rates (weight-based tiers)
 * 
 * Used when state-specific rates are not configured in admin panel.
 * Tiered structure based on common courier pricing models (India Post, Delhivery, etc.)
 * 
 * Pricing Strategy:
 * - Lightweight items (<1kg): Higher per-kg rate due to handling overhead
 * - Medium items (1-10kg): Standard rates
 * - Heavy items (>10kg): Lower per-kg rate due to economies of scale
 * - Very heavy (>50kg): Freight shipping, may require manual quote
 * 
 * Note: These are FALLBACK rates. Admin should configure state-specific rates
 * for better accuracy and competitive pricing.
 */
const FALLBACK_SHIPPING_RATES = [
  { maxWeight: 0.5, cost: 80 },         // Up to 500g - ₹160/kg (small parts, PCBs)
  { maxWeight: 1, cost: 120 },          // Up to 1kg - ₹120/kg (typical small order)
  { maxWeight: 2, cost: 160 },          // Up to 2kg - ₹80/kg (standard order)
  { maxWeight: 5, cost: 220 },          // Up to 5kg - ₹44/kg (bulk small parts)
  { maxWeight: 10, cost: 350 },         // Up to 10kg - ₹35/kg (medium fabrication)
  { maxWeight: 20, cost: 500 },         // Up to 20kg - ₹25/kg (large order)
  { maxWeight: 50, cost: 800 },         // Up to 50kg - ₹16/kg (freight territory)
  { maxWeight: Infinity, cost: 1200 },  // Above 50kg - flat rate, manual review needed
];

/**
 * Oversized item surcharge (₹150)
 * 
 * Applied when any dimension exceeds 1000mm (1 meter).
 * 
 * Rationale:
 * - Requires special packaging (can't use standard boxes)
 * - May need custom crating or tube packaging
 * - Higher handling costs at courier facilities
 * - Potentially requires freight shipping instead of courier
 * - Breakage risk increases with size
 * 
 * Definition of oversized: width > 1000mm OR height > 1000mm
 * Note: Thickness not considered (thin sheets can be rolled)
 */
const OVERSIZED_SURCHARGE = 150;

/**
 * Bulk order discount percentage (5%)
 * 
 * Applied to shipping cost when cart has multiple items.
 * 
 * Rationale:
 * - Single package for multiple items
 * - Reduced per-item handling overhead
 * - Encourages bulk orders
 * - Still profitable due to packaging efficiency
 * 
 * Applied AFTER all other calculations (weight, oversized, state rate)
 */
const BULK_DISCOUNT_PERCENTAGE = 0.05; // 5% discount

/**
 * Get material density in kg/m³
 * 
 * Looks up density from MATERIAL_DENSITIES table.
 * Falls back to 0 if material not found (will result in 0 shipping weight).
 * 
 * @param material - Material name
 * @returns Density in kg/m³
 * 
 * @example
 * const density = getMaterialDensity('Mild Steel');
 * // Returns: 7850 kg/m³
 */
function getMaterialDensity(material: string): number {
  return MATERIAL_DENSITIES[material] || 0;
}

/**
 * Calculate weight of a laser cutting part
 * 
 * Formula: weight (kg) = volume (m³) × density (kg/m³)
 * where volume = width × height × thickness
 * 
 * Process:
 * 1. Look up material density (kg/m³)
 * 2. Convert dimensions from mm to m
 * 3. Calculate volume (m³)
 * 4. Multiply by density to get weight (kg)
 * 
 * Important: Returns precise weight WITHOUT rounding.
 * Rounding should only happen after summing multiple items for accurate shipping.
 * 
 * @param input - Part dimensions and material
 * @returns Weight in kilograms (unrounded)
 * 
 * @example
 * const weight = calculateWeight({
 *   material: 'Mild Steel',
 *   thickness: 3,  // 3mm
 *   width: 500,    // 500mm
 *   height: 300,   // 300mm
 *   cuttingLength: 2000
 * });
 * // Returns: ~3.53 kg (unrounded)
 */
export function calculateWeight(input: ShippingCalculationInput): number {
  // Validate input data to prevent NaN
  if (!input || 
      typeof input.width !== 'number' || 
      typeof input.height !== 'number' || 
      typeof input.thickness !== 'number' ||
      isNaN(input.width) || 
      isNaN(input.height) || 
      isNaN(input.thickness)) {
    console.warn('⚠️ Invalid input for weight calculation:', input);
    return 0;
  }
  
  const materialDensity = getMaterialDensity(input.material);
  
  // Convert dimensions from mm to m
  const widthM = input.width / 1000;
  const heightM = input.height / 1000;
  const thicknessM = input.thickness / 1000;
  
  // Calculate volume in cubic meters
  const volumeM3 = widthM * heightM * thicknessM;
  
  // Calculate weight: volume × density
  const weightKg = volumeM3 * materialDensity;
  
  // Multiply by quantity if specified
  const quantity = input.quantity || 1;
  
  const finalWeight = weightKg * quantity;
  
  // Final safety check
  return isNaN(finalWeight) ? 0 : finalWeight;
}

/**
 * Calculate shipping cost using fallback weight-based rates
 * 
 * Uses FALLBACK_SHIPPING_RATES tier structure.
 * This is used when state-specific rates are not configured.
 * 
 * Process:
 * 1. Calculate total weight
 * 2. Find appropriate tier (first tier where weight ≤ maxWeight)
 * 3. Apply oversized surcharge if needed
 * 4. Round to nearest rupee
 * 
 * @param input - Part dimensions and material
 * @returns Shipping cost in ₹
 * 
 * @example
 * const cost = calculateShippingCost({
 *   material: 'Mild Steel',
 *   thickness: 3,
 *   width: 500,
 *   height: 300,
 *   cuttingLength: 2000
 * });
 * // Returns: ₹220 (falls in 1-5kg tier)
 */
export function calculateShippingCost(input: ShippingCalculationInput): number {
  const weight = calculateWeight(input);
  
  // Find appropriate tier
  const tier = FALLBACK_SHIPPING_RATES.find(rate => weight <= rate.maxWeight);
  let cost = tier ? tier.cost : FALLBACK_SHIPPING_RATES[FALLBACK_SHIPPING_RATES.length - 1].cost;
  
  // Check if oversized (width or height > 1000mm)
  const isOversized = input.width > 1000 || input.height > 1000;
  if (isOversized) {
    cost += OVERSIZED_SURCHARGE;
  }
  
  return Math.round(cost);
}

/**
 * Calculate shipping cost for batch/bulk orders
 * 
 * Features:
 * - Sums weight of all items
 * - Applies 5% bulk discount for multi-item orders
 * - Uses state-based rates if available
 * - Falls back to weight-based tiers
 * - Applies oversized surcharge if any item is oversized
 * - Handles free shipping based on state configuration
 * 
 * @param inputs - Array of items to ship
 * @param stateRate - Optional state-specific rate configuration
 * @returns Shipping cost in ₹
 * 
 * @example
 * const cost = calculateBatchShippingCost([
 *   { material: 'Mild Steel', thickness: 3, width: 500, height: 300, cuttingLength: 2000 },
 *   { material: 'Aluminum', thickness: 5, width: 400, height: 200, cuttingLength: 1500 }
 * ]);
 * // Returns: Cost with 5% bulk discount applied
 */
export function calculateBatchShippingCost(
  inputs: ShippingCalculationInput[],
  stateRate?: { rate_per_kg: number; free_shipping_threshold_kg: number }
): number {
  if (inputs.length === 0) return 0;
  
  // Calculate total weight
  const totalWeight = inputs.reduce((sum, input) => sum + calculateWeight(input), 0);
  
  // Check for oversized items
  const hasOversized = inputs.some(input => input.width > 1000 || input.height > 1000);
  
  let cost = 0;
  
  if (stateRate) {
    // Use state-based rate
    
    console.log('🔍 State rate debugging:', {
      stateRate,
      threshold: stateRate.free_shipping_threshold_kg,
      thresholdType: typeof stateRate.free_shipping_threshold_kg,
      totalWeight,
      ratePerKg: stateRate.rate_per_kg
    });
    
    // Check for free shipping ONLY if a valid threshold is set
    // If free_shipping_threshold_kg is null, 0, or undefined, always charge shipping
    if (stateRate.free_shipping_threshold_kg && 
        stateRate.free_shipping_threshold_kg > 0 && 
        totalWeight <= stateRate.free_shipping_threshold_kg) {
      console.log('✅ Free shipping applies (weight under threshold)');
      return 0; // Free shipping!
    }
    
    console.log('💵 Charging shipping:', { calculation: `${totalWeight} kg × ₹${stateRate.rate_per_kg}/kg` });
    
    // Calculate: weight × rate per kg
    cost = totalWeight * stateRate.rate_per_kg;
  } else {
    // Use fallback weight-based tiers
    const tier = FALLBACK_SHIPPING_RATES.find(rate => totalWeight <= rate.maxWeight);
    cost = tier ? tier.cost : FALLBACK_SHIPPING_RATES[FALLBACK_SHIPPING_RATES.length - 1].cost;
  }
  
  // Add oversized surcharge if applicable
  if (hasOversized) {
    cost += OVERSIZED_SURCHARGE;
  }
  
  // Apply bulk discount for multi-item orders (5% off)
  if (inputs.length > 1) {
    cost = cost * (1 - BULK_DISCOUNT_PERCENTAGE);
  }
  
  return Math.round(cost);
}

/**
 * Calculate shipping cost using state-specific rates
 * 
 * This is the PRIMARY shipping calculation method used in production.
 * Falls back to weight-based rates if state rate not provided.
 * 
 * Features:
 * - State-specific pricing (configured in admin panel)
 * - Free shipping threshold (e.g., Karnataka: 2kg free)
 * - Oversized surcharge
 * - Bulk discount for multiple items
 * 
 * @param inputs - Array of items to ship
 * @param stateRate - State-specific rate configuration from database
 * @returns Shipping cost in ₹
 * 
 * @example
 * const cost = calculateStateBasedShippingCost(
 *   [{ material: 'Mild Steel', thickness: 3, width: 500, height: 300, cuttingLength: 2000 }],
 *   { rate_per_kg: 100, free_shipping_threshold_kg: 2 }
 * );
 * // Returns: ₹0 if weight < 2kg, otherwise weight × ₹100/kg
 */
export function calculateStateBasedShippingCost(
  inputs: ShippingCalculationInput[],
  stateRate?: { rate_per_kg: number; free_shipping_threshold_kg: number }
): number {
  return calculateBatchShippingCost(inputs, stateRate);
}

/**
 * Get shipping estimate with detailed breakdown
 * 
 * Returns both weight and cost, plus free shipping flag.
 * Useful for UI display where you want to show "Free Shipping!" badges.
 * 
 * @param inputs - Array of items to ship
 * @param stateRate - Optional state-specific rate configuration
 * @returns Shipping estimate with weight, cost, and free shipping status
 * 
 * @example
 * const estimate = getShippingEstimate(
 *   [{ material: 'Mild Steel', thickness: 3, width: 500, height: 300, cuttingLength: 2000 }],
 *   { rate_per_kg: 100, free_shipping_threshold_kg: 2 }
 * );
 * // Returns: { weight: 3.53, cost: 0, isFreeShipping: true }
 */
export function getShippingEstimate(
  inputs: ShippingCalculationInput[],
  stateRate?: { rate_per_kg: number; free_shipping_threshold_kg: number }
): ShippingEstimate {
  if (inputs.length === 0) {
    return { weight: 0, cost: 0, isFreeShipping: false };
  }
  
  // Calculate total weight
  const totalWeight = inputs.reduce((sum, input) => sum + calculateWeight(input), 0);
  
  // Calculate cost
  const cost = calculateBatchShippingCost(inputs, stateRate);
  
  // Determine if free shipping applies
  const isFreeShipping = cost === 0 && stateRate && totalWeight <= stateRate.free_shipping_threshold_kg;
  
  return {
    weight: Math.round(totalWeight * 100) / 100, // Round to 2 decimal places for display
    cost,
    isFreeShipping
  };
}