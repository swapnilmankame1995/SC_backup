/**
 * Shopping Cart Screen Component
 * 
 * Displays all items in the cart with:
 * - Item details (file name, material, dimensions, price)
 * - Quantity adjustment controls (1-999 per item)
 * - Individual item removal
 * - Clear cart functionality
 * - Price breakdown with GST separation
 * - Proceed to checkout button
 * 
 * Business Rules:
 * 1. Quantity Range: 1-999 per item (prevents accidental bulk orders)
 * 2. GST Separation: 18% for laser cutting, 18% for CAD/design services (GST Council 2025/2026)
 * 3. Empty Cart: Shows empty state with "Continue Shopping" CTA
 * 
 * @component
 */

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { X, Package, AlertCircle, ShoppingCart, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { WhatsAppContactLink } from "./WhatsAppContactLink";
import { getPricingConstants } from "../utils/pricing";

/**
 * Cart Item Interface
 * 
 * Represents a single item in the shopping cart.
 * Supports both laser cutting items and sketch services.
 */
export interface CartItem {
  id: string;                    // Unique cart item ID
  fileName: string;              // Display name (original filename)
  material: {
    id: string;                  // Material database ID
    name: string;                // Material name (e.g., "Mild Steel")
    category: string;            // Category (e.g., "Metal", "service")
  };
  thickness: number;             // Material thickness in mm
  price: number;                 // Unit price in ₹ (GST-inclusive)
  dxfData: {
    width: number;               // Part width in mm
    height: number;              // Part height in mm
    cuttingLength: number;       // Total cutting path in mm
  };
  filePath?: string;             // Supabase storage path
  file?: File;                   // Original file (not persisted)
  addedAt: number;               // Timestamp when added
  quantity?: number;             // Quantity multiplier (1-999)
  isSketchService?: boolean;     // Flag for sketch-to-DXF orders
  calculatedTotal?: number;      // Pre-calculated total price for the item
  color?: string;                // Color of the material (optional)
  colorHex?: string;             // Hex value of the selected colour for swatch display
}

/**
 * Cart Screen Component Props
 */
interface CartScreenProps {
  onBack: () => void;            // Navigate back to upload screen
  onCheckout: () => void;        // Navigate to checkout screen
}

export function CartScreen({
  onBack,
  onCheckout,
}: CartScreenProps) {
  const { cartItems, removeFromCart, clearCart, updateCartItem } = useCart();
  const { user } = useAuth();
  
  const items = cartItems;
  const onRemoveItem = removeFromCart;
  const onClearCart = clearCart;
  const onContinueShopping = onBack;
  const isLoggedIn = !!user;
  
  /**
   * Get total price for a cart item
   * Uses pre-calculated total from cart context
   * 
   * @param item - Cart item
   * @returns Total price in ₹
   */
  const getItemTotal = (item: CartItem): number => {
    return item.calculatedTotal || 0;
  };
  
  /**
   * Handle quantity change for cart item
   * 
   * Constraints:
   * - Minimum: 1 (can't have 0 quantity, just remove item)
   * - Maximum: 999 (prevents accidental huge orders)
   * 
   * @param itemId - Cart item ID
   * @param newQuantity - New quantity value (1-999)
   */
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    // Validate quantity range
    if (newQuantity >= 1 && newQuantity <= 999) {
      updateCartItem(itemId, { quantity: newQuantity });
    }
  };
  
  // ============================================================================
  // PRICE CALCULATION - GST SEPARATION
  // ============================================================================
  
  /**
   * Calculate total prices by GST category
   * 
   * India's GST system requires different rates:
   * - Laser Cutting: 18% GST (manufacturing service)
   * - CAD Services: 18% GST (professional service) (GST Council 2025/2026)
   * 
   * We separate items by type to:
   * 1. Calculate correct GST amounts for invoice
   * 2. Display breakdown to user
   * 3. Comply with GST filing requirements
   * 
   * Note: Prices shown are GST-inclusive. We reverse-calculate
   * subtotal and tax amount for display.
   */
  
  // Laser cutting items (18% GST)
  const laserCuttingTotal = items
    .filter(item => !item.isSketchService)
    .reduce((sum, item) => {
      const itemQuantity = item.quantity || 1;
      return sum + getItemTotal(item);
    }, 0);
  
  // CAD/sketch service items (18% GST) - no minimum
  const cadServiceTotal = items
    .filter(item => item.isSketchService)
    .reduce((sum, item) => {
      const itemQuantity = item.quantity || 1;
      // For sketch service, price is already per order (no per-piece multiplication)
      return sum + (item.price * itemQuantity);
    }, 0);
  
  // Reverse calculate GST (prices already include GST)
  const laserSubtotal = laserCuttingTotal / 1.18; // 18% GST
  const laserTax = laserCuttingTotal - laserSubtotal;
  
  const cadSubtotal = cadServiceTotal / 1.18; // 18% GST
  const cadTax = cadServiceTotal - cadSubtotal;
  
  const subtotal = laserSubtotal + cadSubtotal;
  const taxAmount = laserTax + cadTax;
  const total = laserCuttingTotal + cadServiceTotal;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] pt-8">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h2 className="text-gray-200 mb-6">Shopping Cart</h2>
          
          <Card className="p-12 bg-[#252525] border-0 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-gray-200 text-xl">Your cart is empty</h3>
              <p className="text-gray-400 mb-4">
                Add items to your cart to see them here
              </p>
              <Button
                onClick={onContinueShopping}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue Shopping
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] pt-8">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-8 max-w-6xl pb-32">
        <div className="flex items-center justify-between mb-3 sm:mb-6 gap-1.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-gray-200 mb-1 text-base sm:text-2xl">Shopping Cart</h2>
            <p className="text-gray-400 text-xs sm:text-base">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <Button
            onClick={onClearCart}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-950 text-[10px] sm:text-sm px-2 h-8"
          >
            Clear
          </Button>
        </div>

        {!isLoggedIn && (
          <Alert className="bg-amber-950 border-amber-800 mb-3 sm:mb-6">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" />
            <AlertDescription className="text-amber-300 text-[10px] sm:text-sm leading-tight">
              Your cart will be cleared if you close this tab. Login to save your cart for 180 days.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6">
          {/* Cart Items - Left Side */}
          <div className="lg:col-span-2 space-y-2.5 sm:space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-2.5 sm:p-6 bg-[#252525] border-0 overflow-hidden">
                <div className="flex gap-1.5 sm:gap-4 w-full">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 sm:w-8 sm:h-8 text-gray-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between mb-1.5 gap-1">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="text-gray-200 mb-0.5 text-sm sm:text-base leading-tight pr-1 break-all">{item.fileName}</h3>
                        <p className="text-xs sm:text-sm text-gray-400 break-words">
                          {item.material.name} • {item.thickness}mm
                          {item.color && (
                            <span className="inline-flex items-center gap-1.5 ml-1">
                              <span>•</span>
                              {item.colorHex && (
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0 align-middle"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                              <span className="text-gray-300">{item.color}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => onRemoveItem(item.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400 hover:bg-red-950 flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 p-0"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-xs sm:text-sm mb-2">
                      <div className="flex justify-between gap-1 flex-wrap">
                        <span className="text-gray-500 flex-shrink-0">Dimensions:</span>
                        <span className="text-gray-300 text-right">
                          {item.dxfData.width.toFixed(0)} × {item.dxfData.height.toFixed(0)} mm
                        </span>
                      </div>
                      <div className="flex justify-between gap-1 flex-wrap">
                        <span className="text-gray-500 flex-shrink-0">Cutting Length:</span>
                        <span className="text-gray-300 text-right">
                          {item.dxfData.cuttingLength.toFixed(2)} mm
                        </span>
                      </div>
                    </div>
                    
                    {/* Quantity Controls - Only for DXF parts */}
                    {!item.isSketchService && (
                      <div className="flex items-center gap-2 py-2 border-t border-b border-gray-700">
                        <span className="text-gray-400 text-sm">Quantity:</span>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            onClick={() => handleQuantityChange(item.id, (item.quantity || 1) - 1)}
                            variant="ghost"
                            size="sm"
                            disabled={(item.quantity || 1) <= 1}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-gray-200 text-sm min-w-[2rem] text-center font-medium">
                            {item.quantity || 1}
                          </span>
                          <Button
                            onClick={() => handleQuantityChange(item.id, (item.quantity || 1) + 1)}
                            variant="ghost"
                            size="sm"
                            disabled={(item.quantity || 1) >= 999}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 gap-2">
                      <span className="text-gray-400 text-sm sm:text-base">
                        {!item.isSketchService && (item.quantity || 1) > 1 ? (
                          <span className="text-xs text-gray-500">
                            ₹{item.price.toFixed(2)} × {item.quantity}
                          </span>
                        ) : (
                          'Price:'
                        )}
                      </span>
                      <span className="text-blue-400 text-lg sm:text-xl font-medium whitespace-nowrap">
                        ₹{getItemTotal(item).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary - Right Side */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-[#252525] border-0 lg:sticky lg:top-24">
              <h3 className="text-gray-200 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
                  </span>
                  <span className="text-gray-200">₹{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Shipping</span>
                  <span className="text-gray-200">Calculated at checkout</span>
                </div>
                
                {/* Show tax breakdown by GST rate */}
                {laserCuttingTotal > 0 && cadServiceTotal > 0 ? (
                  // Show both GST rates
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">GST @ 18% (Laser Cutting)</span>
                      <span className="text-gray-200">₹{laserTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">GST @ 18% (CAD Services)</span>
                      <span className="text-gray-200">₹{cadTax.toFixed(2)}</span>
                    </div>
                  </>
                ) : laserCuttingTotal > 0 ? (
                  // Only laser cutting items
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Tax (18% GST)</span>
                    <span className="text-gray-200">₹{taxAmount.toFixed(2)}</span>
                  </div>
                ) : (
                  // Only CAD service items
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Tax (18% GST)</span>
                    <span className="text-gray-200">₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-700 pt-3 flex justify-between">
                  <span className="text-gray-200">Estimated Total</span>
                  <div className="text-right">
                    <p className="text-blue-400 text-2xl">
                      ₹{total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={onCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                  Go to Checkout
                </Button>
                <Button
                  onClick={onContinueShopping}
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Continue Shopping
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                Taxes and shipping calculated at checkout
              </p>
            </Card>
          </div>
        </div>

        {/* WhatsApp Contact Link */}
        <div className="text-center mt-8">
          <WhatsAppContactLink />
        </div>
      </div>
    </div>
  );
}