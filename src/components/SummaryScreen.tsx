import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  DXFData,
  generateSVGPreview,
} from "../utils/dxf-parser";
import {
  Loader2,
  File,
  Package,
  Ruler,
  IndianRupee,
  Info,
  Plus,
  Minus,
} from "lucide-react";
import { BottomNavigationBar } from "./BottomNavigationBar";
import { Alert, AlertDescription } from "./ui/alert";
import { WhatsAppContactLink } from "./WhatsAppContactLink";
import { getPricingConstants } from "../utils/pricing";

interface ThicknessPricing {
  thickness: number;
  pricePerMm: number;
  pricePerSqft?: number;  // Thickness-specific price per sq ft
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
  colors?: Array<{ name: string; hex: string }>;
}

interface SummaryScreenProps {
  file: File | null;
  fileName?: string;
  sketchFiles?: File[];
  material: Material | null;
  thickness: number | null;
  selectedColor?: string | null;   // Selected colour for colour-enabled non-metal materials
  price: number;
  dxfData: DXFData | null;
  onConfirm: (quantity?: number) => void;
  onBack: () => void;
  onAddToCart?: (quantity?: number) => void;
  isLoggedIn?: boolean;
  isUploading?: boolean;
  isSketchWorkflow?: boolean;
}

export function SummaryScreen({
  file,
  fileName,
  sketchFiles = [],
  material,
  thickness,
  selectedColor,
  price,
  dxfData,
  onConfirm,
  onBack,
  onAddToCart,
  isLoggedIn = false,
  isUploading = false,
  isSketchWorkflow = false,
}: SummaryScreenProps) {
  // Quantity state - only for DXF workflow
  const [quantity, setQuantity] = useState(1);
  
  const selectedPricing = thickness && material?.pricing?.find(
    (p) => p.thickness === thickness,
  );
  const pricePerMm = selectedPricing?.pricePerMm || 0;
  
  // Calculate weight for DXF workflow
  const calculateWeight = () => {
    if (!dxfData || !thickness || !material?.density) {
      return null;
    }
    
    // Area in square meters
    const areaM2 = (dxfData.width * dxfData.height) / (1000 * 1000);
    
    // Volume in cubic meters
    const volumeM3 = areaM2 * (thickness / 1000);
    
    // Weight in kg
    const weightKg = volumeM3 * material.density;
    
    // Area in square feet for display
    const areaSqFt = areaM2 * 10.7639; // 1 m² = 10.7639 sq ft
    
    return {
      weightKg,
      areaSqFt,
      areaM2
    };
  };
  
  const weightData = !isSketchWorkflow ? calculateWeight() : null;
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 999) {
      setQuantity(newQuantity);
    }
  };
  
  // Pricing constants
  const [setupCost, setSetupCost] = useState(0);

  useEffect(() => {
    const fetchPricingConstants = async () => {
      const constants = await getPricingConstants();
      setSetupCost(constants.setupCost);
    };

    fetchPricingConstants();
  }, []);

  // Calculate total price with setup cost applied only once
  // Formula: Total = (Unit Price - Setup Cost) × Quantity + Setup Cost
  const calculateTotalPrice = () => {
    if (isSketchWorkflow || quantity === 1) {
      // For sketch workflow or single item, just return the price as-is
      return price;
    }
    
    // For multiple quantities: remove setup cost from unit price, multiply, then add setup cost once
    const priceWithoutSetup = price - setupCost;
    const totalWithoutSetup = priceWithoutSetup * quantity;
    return totalWithoutSetup + setupCost;
  };

  const totalPrice = calculateTotalPrice();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-[140px] md:pb-40">
      <div className="space-y-6">
        <div>
          <h2 className="text-gray-200 mb-2">Order Summary</h2>
          <p className="text-gray-400">
            Review your order details before confirming
          </p>
        </div>

        {!isLoggedIn && (
          <Alert className="bg-blue-950 border-blue-800">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              You'll be asked to login or create an account
              before placing your order.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <Card className="p-6 bg-[#222222] border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
                <File className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-gray-200 mb-2">
                  File Information
                </h3>
                <div className="space-y-2">
                  {isSketchWorkflow ? (
                    <>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Service Type:
                        </span>
                        <span className="text-gray-200 text-right">
                          Convert Sketch to DXF
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Sketch Files:
                        </span>
                        <span className="text-gray-200 text-right">
                          {sketchFiles?.length || 0} file(s) uploaded
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          File Name:
                        </span>
                        <span className="text-gray-200 text-right break-all">
                          {fileName || file?.name}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Dimensions:
                        </span>
                        <span className="text-gray-200 text-right">
                          {dxfData?.width.toFixed(2)} ×{" "}
                          {dxfData?.height.toFixed(2)} mm
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Cutting Length:
                        </span>
                        <span className="text-gray-200 text-right">
                          {dxfData?.cuttingLength.toFixed(2)} mm
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {!isSketchWorkflow && (
            <>
              <Card className="p-6 bg-[#222222] border-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-gray-200 mb-2">
                      Material Selection
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Material:
                        </span>
                        <span className="text-gray-200 text-right">
                          {material?.name}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Category:
                        </span>
                        <span className="text-gray-200 text-right">
                          {material?.category}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">Rate:</span>
                        <span className="text-gray-200 text-right">
                          ₹{pricePerMm.toFixed(2)}/mm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[#222222] border-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-950 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="text-gray-200 mb-2">
                      Thickness
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Selected Thickness:
                        </span>
                        <span className="text-gray-200 text-right">
                          {thickness} mm
                        </span>
                      </div>
                      {selectedColor && (
                        <div className="flex justify-between gap-2 flex-wrap">
                          <span className="text-gray-400 flex-shrink-0">
                            Colour:
                          </span>
                          <span className="flex items-center gap-2 text-gray-200 text-right">
                            {/* Small swatch dot showing the actual colour — purely visual, not red */}
                            {(() => {
                              const hex = material?.colors?.find(c => c.name === selectedColor)?.hex;
                              return hex ? (
                                <span
                                  className="inline-block w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                                  style={{ backgroundColor: hex }}
                                />
                              ) : null;
                            })()}
                            {selectedColor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          <Card className="p-6 bg-blue-950 border-blue-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-gray-200 mb-4">
                  Pricing Breakdown
                </h3>
                <div className="space-y-3">
                  {isSketchWorkflow ? (
                    <>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Design Service Fee:
                        </span>
                        <span className="text-gray-200 text-right">
                          ₹{price.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-blue-800 pt-3">
                        <p className="text-gray-400 text-sm mb-2">
                          This fee covers the conversion of your sketch files to a professional DXF format suitable for laser cutting.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-gray-400 flex-shrink-0">
                          Unit Price:
                        </span>
                        <span className="text-gray-200 text-right">
                          ₹{price.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="border-t border-blue-800 pt-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-gray-200 flex-shrink-0">
                            Quantity:
                          </span>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => handleQuantityChange(quantity - 1)}
                              variant="ghost"
                              size="sm"
                              disabled={quantity <= 1}
                              className="h-8 w-8 p-0 text-gray-300 hover:text-gray-100 hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-gray-100 text-lg min-w-[3rem] text-center font-medium">
                              {quantity}
                            </span>
                            <Button
                              onClick={() => handleQuantityChange(quantity + 1)}
                              variant="ghost"
                              size="sm"
                              disabled={quantity >= 999}
                              className="h-8 w-8 p-0 text-gray-300 hover:text-gray-100 hover:bg-blue-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-t border-blue-800 pt-3 flex justify-between gap-2 flex-wrap">
                    <span className="text-gray-200 flex-shrink-0">
                      Total Amount:
                    </span>
                    <span className="text-blue-400 text-2xl whitespace-nowrap">
                      ₹{totalPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Shipping Cost Notice */}
                  {!isSketchWorkflow && (
                    <div className="border-t border-blue-800/50 pt-3 mt-1">
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-amber-200 text-sm">
                            <strong>Note:</strong> Shipping charges will be calculated at checkout based on your location and order weight.
                          </p>
                          <p className="text-amber-300/70 text-xs mt-1">
                            This is not the final payable amount.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="container mx-auto max-w-4xl">
              <p className="text-xs text-gray-500 text-center">
                {isLoggedIn
                  ? "Your uploaded file will be stored securely for 180 days after order confirmation."
                  : "Your uploaded file will be stored securely for 180 days after order confirmation."}
              </p>
            </div>
          </Card>

          {/* Bulk Pricing Helper - Show bulk savings due to one-time setup cost */}
          {!isSketchWorkflow && (
            <Card className="p-4 md:p-6 bg-amber-950/50 border-amber-800/50">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 md:mt-1">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-amber-200 font-medium mb-1 md:mb-2 text-sm md:text-base">Save More with Bulk Orders!</h3>
                    <p className="text-amber-100/80 text-xs md:text-sm mb-3 md:mb-4">
                      Setup cost is applied only once. Order more pieces to reduce cost per piece:
                    </p>
                    <div className="bg-[#1a1a1a] rounded-lg p-2 md:p-4 space-y-1.5 md:space-y-2">
                      {[1, 3, 5, 10].map((qty) => {
                        // Calculate total using correct formula: (Unit Price - Setup) × Qty + Setup
                        const qtyTotal = qty === 1 
                          ? price 
                          : ((price - setupCost) * qty) + setupCost;
                        const pricePerPiece = qtyTotal / qty;
                        const savings = qty > 1 ? ((price - pricePerPiece) / price) * 100 : 0;
                        const isGoodValue = qty >= 3; // Highlight 3+ pieces
                        
                        return (
                          <div 
                            key={qty}
                            className={`flex items-center justify-between py-1.5 md:py-2 px-2 md:px-3 rounded text-xs md:text-sm ${
                              isGoodValue ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-gray-800/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <span className="text-gray-300 font-medium min-w-[60px] md:min-w-[80px]">
                                {qty} {qty === 1 ? 'piece' : 'pieces'}:
                              </span>
                              {savings > 0 && (
                                <span className="text-emerald-400 text-[10px] md:text-xs bg-emerald-900/50 px-1.5 md:px-2 py-0.5 rounded">
                                  Save {savings.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-white font-medium">₹{qtyTotal.toFixed(2)}</span>
                              <span className="text-gray-400 text-[10px] md:text-xs ml-1 md:ml-2">
                                (₹{pricePerPiece.toFixed(2)}/pc)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-amber-100/70 text-[10px] md:text-xs mt-2 md:mt-3">
                      💡 Tip: Setup cost is applied once per order, so ordering multiple pieces significantly reduces the per-piece cost!
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* WhatsApp Contact Link */}
        <div className="text-center mt-4">
          <WhatsAppContactLink />
        </div>
      </div>

      <BottomNavigationBar
        onBack={onBack}
        onAddToCart={onAddToCart ? () => onAddToCart(isSketchWorkflow ? undefined : quantity) : undefined}
        onNext={() => onConfirm(isSketchWorkflow ? undefined : quantity)}
        nextLabel="Go to Checkout"
        nextDisabled={false}
        isLoading={isUploading}
        loadingLabel="Uploading files..."
      />

      <div className="fixed bottom-24 left-0 right-0 px-4 pb-2 pointer-events-none"></div>
    </div>
  );
}