/**
 * Centralized Pricing Calculation Module
 * 
 * Industry-standard laser cutting pricing formula:
 * 
 * FINAL_PRICE = ((A × R_a) + (L × R_l × T_f)) × Q + S
 * SELLING_PRICE = FINAL_PRICE × (1 + M)
 * 
 * Where:
 * - A = Area in square feet (from DXF bounding box)
 * - R_a = Material rate per square foot (₹/sq ft)
 * - L = Cutting length in meters
 * - R_l = Laser cutting rate per meter (₹/meter)
 * - T_f = Thickness factor multiplier
 * - Q = Quantity (number of parts)
 * - S = Setup cost (₹) - APPLIED ONCE PER ORDER
 * - M = Profit margin (decimal, e.g., 0.40 = 40%)
 * 
 * @module pricing
 */

import { DXFData } from './dxf-parser';
import { projectId, publicAnonKey } from './supabase/info';

// Performance mode - disable verbose logging for batch calculations
let ENABLE_VERBOSE_LOGGING = true;

export function setVerboseLogging(enabled: boolean) {
  ENABLE_VERBOSE_LOGGING = enabled;
}

/**
 * Thickness multiplier entry
 */
export interface ThicknessMultiplier {
  minThickness: number;  // Minimum thickness (mm)
  maxThickness: number;  // Maximum thickness (mm)
  multiplier: number;    // Multiplier factor
  label: string;         // Display label (e.g., "2-3mm")
}

/**
 * Material pricing configuration
 */
export interface MaterialPricing {
  id: string;
  name: string;
  category: string;
  price_per_mm: number;      // Laser cutting rate per mm (₹/mm)
  price_per_sqf: number;     // Material rate per square foot (₹/sq ft)
  thicknesses: number[];     // Available thicknesses
  density?: number;          // Material density (kg/m³)
}

/**
 * Global pricing constants (stored in KV)
 */
export interface PricingConstants {
  setupCost: number;                         // S - Setup cost per job (₹)
  profitMargin: number;                      // M - Profit margin (decimal)
  thicknessMultipliers: ThicknessMultiplier[]; // T_f - Thickness factor table
  maxFileSize: number;                       // Maximum file upload size in MB
}

/**
 * Detailed price breakdown
 */
export interface PriceBreakdown {
  area: number;              // Area in sq ft
  materialCost: number;      // A × R_a
  cuttingLength: number;     // Length in meters
  cuttingCost: number;       // L × R_l × T_f
  setupCost: number;         // S
  finalPrice: number;        // Material + Cutting + Setup
  profitMargin: number;      // M (decimal)
  sellingPrice: number;      // Final × (1 + M)
  thicknessMultiplier: number; // T_f
}

/**
 * Default thickness multiplier table (industry standard)
 */
export const DEFAULT_THICKNESS_MULTIPLIERS: ThicknessMultiplier[] = [
  { minThickness: 2, maxThickness: 3, multiplier: 1.0, label: '2-3mm' },
  { minThickness: 4, maxThickness: 5, multiplier: 1.4, label: '4-5mm' },
  { minThickness: 6, maxThickness: 6, multiplier: 1.8, label: '6mm' },
  { minThickness: 8, maxThickness: 8, multiplier: 2.5, label: '8mm' },
  { minThickness: 12, maxThickness: 999, multiplier: 3.0, label: '12mm+' },
];

/**
 * Default pricing constants
 */
export const DEFAULT_PRICING_CONSTANTS: PricingConstants = {
  setupCost: 100,              // ₹100 setup cost
  profitMargin: 0.40,          // 40% profit margin
  thicknessMultipliers: DEFAULT_THICKNESS_MULTIPLIERS,
  maxFileSize: 50,             // 50 MB max file size
};

/**
 * Fetch pricing constants from KV store
 * 
 * @returns Pricing constants (setup cost, profit margin, thickness multipliers)
 */
export async function getPricingConstants(): Promise<PricingConstants> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/pricing-constants`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch pricing constants, using defaults');
      return DEFAULT_PRICING_CONSTANTS;
    }

    const data = await response.json();
    return {
      setupCost: data.setupCost || DEFAULT_PRICING_CONSTANTS.setupCost,
      profitMargin: data.profitMargin || DEFAULT_PRICING_CONSTANTS.profitMargin,
      thicknessMultipliers: data.thicknessMultipliers || DEFAULT_PRICING_CONSTANTS.thicknessMultipliers,
      maxFileSize: data.maxFileSize || DEFAULT_PRICING_CONSTANTS.maxFileSize,
    };
  } catch (error) {
    console.error('Error fetching pricing constants:', error);
    return DEFAULT_PRICING_CONSTANTS;
  }
}

/**
 * Save pricing constants to KV store
 * 
 * @param constants - Pricing constants to save
 */
export async function savePricingConstants(constants: PricingConstants): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/pricing-constants`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(constants),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save pricing constants');
    }
  } catch (error) {
    console.error('Error saving pricing constants:', error);
    throw error;
  }
}

/**
 * Get thickness multiplier for a given thickness
 * 
 * Looks up the thickness in the multiplier table to find the appropriate
 * factor for cutting cost calculation.
 * 
 * @param thickness - Material thickness in mm
 * @param multipliers - Thickness multiplier table
 * @returns Multiplier factor (T_f)
 */
export function getThicknessMultiplier(
  thickness: number,
  multipliers: ThicknessMultiplier[]
): number {
  // Find matching range
  const match = multipliers.find(
    (m) => thickness >= m.minThickness && thickness <= m.maxThickness
  );

  // Log for debugging
  if (match) {
    console.log(`✅ Thickness ${thickness}mm matched: ${match.label} (multiplier: ${match.multiplier})`);
  } else {
    console.warn(`⚠️ Thickness ${thickness}mm not found in table, using default multiplier: 1.0`);
  }

  // Return multiplier or default to 1.0
  return match ? match.multiplier : 1.0;
}

/**
 * Convert area from mm² to square feet
 * 
 * @param widthMm - Width in millimeters
 * @param heightMm - Height in millimeters
 * @returns Area in square feet
 */
export function calculateAreaInSqFt(widthMm: number, heightMm: number): number {
  // 1 foot = 304.8 mm
  // 1 sq ft = 304.8² mm²
  const MM_PER_FOOT = 304.8;
  const MM_SQ_PER_SQ_FT = MM_PER_FOOT * MM_PER_FOOT;
  
  const areaMmSq = widthMm * heightMm;
  const areaSqFt = areaMmSq / MM_SQ_PER_SQ_FT;
  
  return areaSqFt;
}

/**
 * Calculate price using industry-standard laser cutting formula
 * 
 * Formula:
 * 1. Material Cost = A × R_a
 * 2. Cutting Cost = L × R_l × T_f
 * 3. Final Price = Material Cost + Cutting Cost + S
 * 4. Selling Price = Final Price × (1 + M)
 * 
 * @param dxfData - Parsed DXF data (width, height, cutting length)
 * @param material - Material pricing configuration
 * @param thickness - Selected thickness in mm
 * @param quantity - Number of parts to cut
 * @param pricingConstants - Global pricing constants (S, M, T_f table)
 * @returns Price breakdown with selling price
 */
export async function calculatePrice(
  dxfData: DXFData | null,
  material: MaterialPricing | null,
  thickness: number | null,
  quantity: number = 1,
  pricingConstants?: PricingConstants
): Promise<PriceBreakdown> {
  // Validate inputs
  if (!dxfData || !material || thickness === null) {
    return {
      area: 0,
      materialCost: 0,
      cuttingLength: 0,
      cuttingCost: 0,
      setupCost: 0,
      finalPrice: 0,
      profitMargin: 0,
      sellingPrice: 0,
      thicknessMultiplier: 1.0,
    };
  }

  // Fetch pricing constants if not provided
  const constants = pricingConstants || await getPricingConstants();

  if (ENABLE_VERBOSE_LOGGING) {
    console.log('🧮 ===== PRICING CALCULATION START =====');
    console.log('📊 Inputs:', { 
      material: material.name, 
      thickness: `${thickness}mm`, 
      quantity,
      dxfWidth: `${dxfData.width.toFixed(2)}mm`,
      dxfHeight: `${dxfData.height.toFixed(2)}mm`,
      cuttingLength: `${dxfData.cuttingLength.toFixed(2)}mm`
    });
  }

  // ============================================================================
  // STEP 1: Calculate Area (A) in square feet
  // ============================================================================
  const A = calculateAreaInSqFt(dxfData.width, dxfData.height);
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`📐 STEP 1: Area = ${A.toFixed(4)} sq ft`);
  }

  // ============================================================================
  // STEP 2: Get Material Rate per Sq Ft (R_a)
  // ============================================================================
  const R_a = material.price_per_sqf || 1; // Default to ₹1 if not set
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`💰 STEP 2: Material rate = ₹${R_a}/sq ft`);
  }

  // ============================================================================
  // STEP 3: Calculate Material Cost
  // ============================================================================
  const materialCost = A * R_a;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`💵 STEP 3: Material cost = ${A.toFixed(4)} × ₹${R_a} = ₹${materialCost.toFixed(2)}`);
  }

  // ============================================================================
  // STEP 4: Calculate Cutting Length (L) in meters
  // ============================================================================
  const L = dxfData.cuttingLength / 1000; // Convert mm to meters
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`📏 STEP 4: Cutting length = ${L.toFixed(3)} meters`);
  }

  // ============================================================================
  // STEP 5: Get Laser Cutting Rate per Meter (R_l)
  // ============================================================================
  // Convert price_per_mm to price_per_meter
  const R_l = material.price_per_mm * 1000;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`⚡ STEP 5: Laser rate = ₹${material.price_per_mm}/mm × 1000 = ₹${R_l}/meter`);
  }

  // ============================================================================
  // STEP 6: Get Thickness Multiplier (T_f)
  // ============================================================================
  const T_f = getThicknessMultiplier(thickness, constants.thicknessMultipliers);
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`🔧 STEP 6: Thickness multiplier = ${T_f} (from table lookup)`);
  }

  // ============================================================================
  // STEP 7: Calculate Cutting Cost
  // ============================================================================
  const cuttingCost = L * R_l * T_f;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`✂️ STEP 7: Cutting cost = ${L.toFixed(3)} × ₹${R_l} × ${T_f} = ₹${cuttingCost.toFixed(2)}`);
  }

  // ============================================================================
  // STEP 8: Calculate Base Cost Per Unit (Material + Cutting)
  // ============================================================================
  const baseCostPerUnit = materialCost + cuttingCost;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`📦 STEP 8: Base cost per unit = ₹${materialCost.toFixed(2)} + ₹${cuttingCost.toFixed(2)} = ₹${baseCostPerUnit.toFixed(2)}`);
  }

  // ============================================================================
  // STEP 9: Apply Quantity to Base Cost
  // ============================================================================
  const totalBaseCost = baseCostPerUnit * quantity;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`🔢 STEP 9: Total base cost = ₹${baseCostPerUnit.toFixed(2)} × ${quantity} = ₹${totalBaseCost.toFixed(2)}`);
  }

  // ============================================================================
  // STEP 10: Add Setup Cost (Applied ONCE per order, not per unit)
  // ============================================================================
  const S = constants.setupCost;
  const finalPrice = totalBaseCost + S;
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`🔧 STEP 10: Setup cost (once) = ₹${S}`);
    console.log(`📊 STEP 11: Final price = ₹${totalBaseCost.toFixed(2)} + ₹${S} = ₹${finalPrice.toFixed(2)}`);
  }

  // ============================================================================
  // STEP 12: Apply Profit Margin (M)
  // ============================================================================
  const M = constants.profitMargin;
  const sellingPrice = finalPrice * (1 + M);
  if (ENABLE_VERBOSE_LOGGING) {
    console.log(`💸 STEP 12: Selling price = ₹${finalPrice.toFixed(2)} × (1 + ${M}) = ₹${sellingPrice.toFixed(2)}`);
    console.log('🧮 ===== PRICING CALCULATION END =====');
    console.log(' ');
  }

  return {
    area: A,
    materialCost,
    cuttingLength: L,
    cuttingCost,
    setupCost: S,
    finalPrice,
    profitMargin: M,
    sellingPrice,
    thicknessMultiplier: T_f,
  };
}

/**
 * Calculate simple price (legacy compatibility)
 * 
 * Returns just the selling price without detailed breakdown.
 * Used for quick price displays.
 * 
 * @param dxfData - Parsed DXF data
 * @param material - Material pricing configuration
 * @param thickness - Selected thickness in mm
 * @param quantity - Number of parts
 * @returns Selling price (₹)
 */
export async function calculateSimplePrice(
  dxfData: DXFData | null,
  material: MaterialPricing | null,
  thickness: number | null,
  quantity: number = 1
): Promise<number> {
  const breakdown = await calculatePrice(dxfData, material, thickness, quantity);
  return breakdown.sellingPrice;
}