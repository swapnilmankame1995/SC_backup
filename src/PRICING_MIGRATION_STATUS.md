# Pricing Formula Migration Status

## ✅ Phase 1: Database & Storage (COMPLETED)
- [x] Confirmed `price_per_sqf` column exists in materials table
- [x] KV store keys defined for pricing constants

## ✅ Phase 2: Centralized Pricing Function (COMPLETED)
- [x] Created `/utils/pricing.ts` with:
  - `calculatePrice()` - NEW industry-standard formula
  - `getThicknessMultiplier()` - thickness factor lookup
  - `getPricingConstants()` - fetch from KV
  - `savePricingConstants()` - save to KV
  - Type definitions (PricingConstants, ThicknessMultiplier, MaterialPricing, PriceBreakdown)

## ✅ Phase 3: Admin Panel UI (COMPLETED)
- [x] Edit Material Modal - added "Price per Sq Ft" field
- [x] Add Material Modal - added "Price per Sq Ft" field
- [x] Created `/components/admin/PricingSettings.tsx`
  - Setup Cost input
  - Profit Margin input
  - Thickness Multiplier table (editable rows)
- [x] Added PricingSettings to Materials Management section

## ✅ Phase 4: Backend API (COMPLETED)
- [x] Materials GET - includes `price_per_sqf` (default 1)
- [x] Materials POST - saves `price_per_sqf`
- [x] Materials PUT - saves `price_per_sqf`
- [x] GET `/pricing-constants` endpoint
- [x] POST `/pricing-constants` endpoint

## ✅ Phase 5: Update All Pricing Calculations (COMPLETED)
Updated these files to use new `calculateSimplePrice()`:

### Files Updated:
- [x] `/components/ThicknessScreen.tsx` - Material type + calculateSimplePrice()
- [x] `/components/SummaryScreen.tsx` - Material type (pricing already comes from ThicknessScreen)
- [x] `/components/CartScreen.tsx` - No Material interface (uses CartItem with nested material object)  
- [x] `/components/CheckoutScreen.tsx` - Material type updated
- [x] `/components/MaterialScreen.tsx` - Material type updated

### Material Interface Updates:
Each file needs the Material interface updated to:
```typescript
interface Material {
  id: string;
  name: string;
  category: string;
  pricing: ThicknessPricing[];
  density?: number;
  price_per_mm: number;    // NEW - Laser cutting rate per mm
  price_per_sqf: number;   // NEW - Material rate per sq ft
}
```

## 📋 Phase 6: Testing (PENDING)
- [ ] Test material creation with price_per_sqf
- [ ] Test material editing
- [ ] Test pricing calculation with new formula
- [ ] Test thickness multiplier lookup
- [ ] Test profit margin application
- [ ] Verify cart calculations
- [ ] Verify checkout calculations  
- [ ] Test end-to-end order flow

## 📝 Notes
- Formula: `SELLING_PRICE = ((A × R_a) + (L × R_l × T_f) + S) × (1 + M)`
- R_l comes from material `price_per_mm × 1000` (convert to ₹/meter)
- R_a comes from material `price_per_sqf`
- Area = bounding box in sq ft
- Cutting length converted to meters