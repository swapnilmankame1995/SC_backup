import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { DXFData } from '../utils/dxf-parser';
import { BottomNavigationBar } from './BottomNavigationBar';
import { apiCall } from '../utils/api';
import { WhatsAppContactLink } from './WhatsAppContactLink';
import { calculatePrice, getPricingConstants, setVerboseLogging } from '../utils/pricing';
import { Loader2, Palette } from 'lucide-react';

interface ThicknessPricing {
  thickness: number;
  pricePerMm: number;
  pricePerSqft?: number;  // Add thickness-specific price per sq ft
  inStock?: boolean;       // Whether this specific thickness is in stock
}

interface MaterialColor {
  name: string;
  hex: string;
}

interface Material {
  id: string;
  name: string;
  category: string;
  pricing: ThicknessPricing[];
  density?: number;
  price_per_mm: number;    // Laser cutting rate per mm
  price_per_sqf: number;   // Material rate per sq ft
  thicknesses?: number[];
  colors_enabled?: boolean;
  colors?: MaterialColor[];
}

interface ThicknessScreenProps {
  material: Material;
  dxfData: DXFData | null;
  onNext: (thickness: number, price: number, color?: string) => void;
  onBack: () => void;
  isSketchWorkflow?: boolean;
}

export function ThicknessScreen({ material, dxfData, onNext, onBack, isSketchWorkflow = false }: ThicknessScreenProps) {
  const [selectedThickness, setSelectedThickness] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [designServicePrice, setDesignServicePrice] = useState<number>(150);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [isCalculating, setIsCalculating] = useState(true);

  // Whether this material requires a colour selection
  const colorsEnabled = material.colors_enabled && material.colors && material.colors.length > 0;
  // Continue is enabled only when thickness selected, and color selected if required
  const canContinue = selectedThickness !== null && (!colorsEnabled || selectedColor !== null);

  useEffect(() => {
    if (isSketchWorkflow) {
      loadDesignServicePrice();
    }
  }, [isSketchWorkflow]);

  // Memoize material ID and DXF key to prevent unnecessary recalculations
  const calculationKey = useMemo(() => {
    return `${material.id}-${dxfData?.cuttingLength || 0}-${dxfData?.width || 0}-${dxfData?.height || 0}`;
  }, [material.id, dxfData?.cuttingLength, dxfData?.width, dxfData?.height]);

  useEffect(() => {
    // Pre-calculate prices for all thicknesses - OPTIMISED for speed
    const loadPrices = async () => {
      setIsCalculating(true);
      const startTime = performance.now();
      
      // Disable verbose logging for batch calculations (massive performance boost)
      setVerboseLogging(false);
      
      try {
        // Fetch pricing constants once (avoid multiple API calls)
        const pricingConstants = await getPricingConstants();
        
        const priceMap: Record<number, number> = {};
        
        // Calculate all prices in parallel with shared constants
        const pricePromises = material.pricing.map(async (pricing) => {
          const materialWithThicknessPricing = {
            ...material,
            price_per_mm: pricing.pricePerMm,
            price_per_sqf: pricing.pricePerSqft || material.price_per_sqf || 1,
          };
          
          const breakdown = await calculatePrice(
            dxfData, 
            materialWithThicknessPricing, 
            pricing.thickness, 
            1,
            pricingConstants // Pass pre-fetched constants
          );
          
          return { thickness: pricing.thickness, price: breakdown.sellingPrice };
        });
        
        // Wait for all calculations to complete
        const results = await Promise.all(pricePromises);
        
        // Build price map
        results.forEach(({ thickness, price }) => {
          priceMap[thickness] = price;
        });
        
        setPrices(priceMap);
        
        const endTime = performance.now();
        console.log(`⚡ Price calculation completed in ${(endTime - startTime).toFixed(0)}ms for ${material.pricing.length} thicknesses`);
      } finally {
        // Re-enable verbose logging for single calculations
        setVerboseLogging(true);
        setIsCalculating(false);
      }
    };
    
    loadPrices();
  }, [calculationKey, material.pricing]); // Use memoised key instead of full objects

  const loadDesignServicePrice = async () => {
    try {
      const result = await apiCall('/settings/design-service-price', { method: 'GET' }, false);
      setDesignServicePrice(result.price);
    } catch (error: any) {
      console.error('Load design service price error:', error);
    }
  };

  const handleThicknessClick = (thickness: number) => {
    setSelectedThickness(thickness);
    // Reset colour selection when thickness changes, so customer re-picks
    if (colorsEnabled) setSelectedColor(null);
  };

  const handleNext = () => {
    if (selectedThickness !== null) {
      const price = prices[selectedThickness] || 0;
      onNext(selectedThickness, price, colorsEnabled ? (selectedColor || undefined) : undefined);
    }
  };

  return (
    <>
      <style>{`
        .thickness-card {
          background: #1a1a1a;
          border: 1px solid #2d3748;
          border-radius: 8px;
        }

        /* Colour swatch styles */
        .colour-swatch {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
          position: relative;
        }
        .colour-swatch:hover {
          transform: scale(1.1);
          box-shadow: 0 0 0 2px rgba(255,255,255,0.25);
        }
        .colour-swatch.selected {
          border-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(220,0,0,0.6);
          transform: scale(1.12);
        }
        /* Special outline for very light/white colours so they're visible on dark bg */
        .colour-swatch.light-color {
          border-color: rgba(255,255,255,0.3);
        }
        .colour-swatch.light-color.selected {
          border-color: #ffffff;
        }

        /* Colour section fade-in animation */
        @keyframes colourFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .colour-section {
          animation: colourFadeIn 0.2s ease forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 py-8 max-w-4xl pb-[140px] md:pb-32">
        <div className="space-y-6">
          <div>
            <h2 className="text-gray-200 mb-2">Select Thickness</h2>
            <p className="text-gray-400">
              Choose the thickness for your {material.name} project
            </p>
          </div>

          <Card className="p-6 bg-blue-950 border-blue-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Material</p>
                <p className="text-gray-200">{material.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Cutting Length</p>
                <p className="text-gray-200">{dxfData?.cuttingLength.toFixed(2) || 'N/A'} mm</p>
              </div>
            </div>
          </Card>

          {/* Thickness Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {material.pricing.map((pricing) => {
              const price = prices[pricing.thickness] || 0;
              const isLoading = isCalculating && price === 0;
              // inStock defaults to true if not set (backward compat with old data)
              const isOutOfStock = pricing.inStock === false;
              const isSelected = selectedThickness === pricing.thickness;

              return (
                <Card
                  key={pricing.thickness}
                  className={`p-6 transition-all relative ${
                    isOutOfStock
                      ? 'opacity-50 cursor-not-allowed border border-gray-700 bg-[#1a1a1a]'
                      : isSelected
                      ? 'cursor-pointer border-2 border-[#dc0000] bg-red-950/30 shadow-red-900/50 hover:shadow-lg'
                      : 'cursor-pointer border border-0 bg-[#222222] hover:border-[#dc0000] hover:shadow-lg'
                  }`}
                  onClick={() => {
                    if (!isOutOfStock) {
                      handleThicknessClick(pricing.thickness);
                    }
                  }}
                >
                  {/* Out of Stock overlay badge */}
                  {isOutOfStock && (
                    <span className="absolute top-1.5 right-1.5 bg-red-900/80 text-red-300 text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide border border-red-700/50 leading-none">
                      Out of Stock
                    </span>
                  )}

                  <div className="text-center">
                    <p className={`mb-2 ${isOutOfStock ? 'text-gray-500' : isSelected ? 'text-white font-semibold' : 'text-gray-200'}`}>
                      {pricing.thickness} mm
                    </p>
                    {!isSketchWorkflow && (
                      <>
                        {isLoading ? (
                          <Loader2 className="w-6 h-6 text-[#dc0000] animate-spin mx-auto" />
                        ) : isOutOfStock ? (
                          <p className="text-gray-600 text-sm">Unavailable</p>
                        ) : (
                          <p className={`text-sm ${isSelected ? 'text-[#dc0000] font-medium' : 'text-gray-400'}`}>
                            ₹{price.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Inline Colour Selection ── */}
          {/* Shown only when a thickness is selected AND material has colours enabled */}
          {selectedThickness !== null && colorsEnabled && material.colors && material.colors.length > 0 && (
            <div className="colour-section">
              <Card className="p-5 bg-[#1e1e1e] border border-[#dc0000]/30">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-4 h-4 text-[#dc0000] flex-shrink-0" />
                  <h3 className="text-gray-200 text-sm font-semibold uppercase tracking-wide">
                    Select Colour
                  </h3>
                  {selectedColor && (
                    <span className="ml-auto text-[#dc0000] text-sm font-medium">
                      {selectedColor}
                    </span>
                  )}
                </div>

                {/* Colour Swatches Grid */}
                <div className="flex flex-wrap gap-3">
                  {material.colors.map((colour) => {
                    const isLightColor = isLightHex(colour.hex);
                    const isColorSelected = selectedColor === colour.name;

                    return (
                      <div
                        key={colour.name}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => setSelectedColor(colour.name)}
                        title={colour.name}
                      >
                        <div
                          className={`colour-swatch ${isLightColor ? 'light-color' : ''} ${isColorSelected ? 'selected' : ''}`}
                          style={{ backgroundColor: colour.hex }}
                        />
                        <span
                          className={`text-[10px] leading-tight text-center max-w-[48px] break-words transition-colors ${
                            isColorSelected ? 'text-white font-semibold' : 'text-gray-500 group-hover:text-gray-300'
                          }`}
                        >
                          {colour.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Prompt if no colour selected yet */}
                {!selectedColor && (
                  <p className="text-gray-500 text-xs mt-3 italic">
                    Please select a colour to continue.
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Selected Configuration Summary */}
          {selectedThickness !== null && (
            <Card className={`p-6 transition-all ${canContinue ? 'bg-emerald-950 border-emerald-800' : 'bg-[#1e1e1e] border-gray-700'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Selected Configuration</p>
                  <p className="text-gray-200">
                    {material.name} — {selectedThickness}mm
                    {colorsEnabled && selectedColor && (
                      <span className="text-[#dc0000] font-medium"> · {selectedColor}</span>
                    )}
                  </p>
                  {colorsEnabled && !selectedColor && (
                    <p className="text-amber-400 text-xs mt-1">Choose a colour above to continue</p>
                  )}
                </div>
                {!isSketchWorkflow && (
                  <div className="text-right">
                    <p className="text-gray-400 text-sm mb-1">Total Price</p>
                    <p className="text-emerald-400 text-2xl">
                      ₹{(prices[selectedThickness] || 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
          
          {/* WhatsApp Contact Link */}
          <div className="text-center mt-4">
            <WhatsAppContactLink />
          </div>
        </div>
      </div>
      
      <BottomNavigationBar
        onBack={onBack}
        onNext={handleNext}
        nextLabel={colorsEnabled && selectedThickness !== null && !selectedColor ? 'Select a Colour' : 'Continue to Summary'}
        nextDisabled={!canContinue}
      />
    </>
  );
}

/**
 * Determine if a hex colour is light (so we can add a visible border on dark backgrounds).
 * Uses perceived luminance formula.
 */
function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // Perceived luminance (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.65;
}
