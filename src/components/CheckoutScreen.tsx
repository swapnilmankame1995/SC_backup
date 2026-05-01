/**
 * Checkout Screen Component
 * 
 * Comprehensive checkout flow for laser cutting orders with support for:
 * - Single item checkout (direct from upload)
 * - Cart checkout (multiple items)
 * - Sketch-to-DXF service orders
 * 
 * Features:
 * - Delivery information autofill from previous orders
 * - State-based shipping calculation with live rates
 * - Discount code application
 * - Loyalty points redemption
 * - GST calculation (18% for laser cutting, 18% for CAD/design services)
 * - Billing address (same/different)
 * - Payment gateway selection (Razorpay/PayU)
 * - Order notes for special instructions
 * 
 * Business Rules Implemented:
 * 1. GST Rates: 18% for laser cutting, 18% for CAD/sketch/design services (GST Council 2025/2026)
 * 2. Shipping: Weight-based with state-specific rates, bulk discount (5%)
 * 3. Loyalty Points: Max 50% of order value, excludes shipping
 * 4. Free Shipping: Based on state threshold (e.g., Karnataka 2kg free)
 * 
 * @component
 */

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner@2.0.3";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { DXFData } from "../utils/dxf-parser";
import { calculateItemTotal } from "../utils/cartPricing";
import { getPricingConstants } from "../utils/pricing";
import {
  CreditCard,
  Package,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  Gift,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { WhatsAppContactLink } from "./WhatsAppContactLink";
import { apiCall } from "../utils/api";
import { calculateShippingCost, calculateBatchShippingCost, getShippingEstimate, calculateWeight, calculateStateBasedShippingCost } from "../utils/shipping";

/**
 * Cart Item Interface
 * 
 * Represents a single item in the shopping cart.
 * Can be either a laser cutting item or sketch service.
 */
export interface CartItem {
  id: string;                     // Unique cart item ID
  fileName: string;               // Display name for the file
  material: {
    id: string;                   // Material database ID
    name: string;                 // Material name (e.g., "Mild Steel")
    category: string;             // Category (e.g., "Metal", "service")
  };
  thickness: number;              // Material thickness in mm
  price: number;                  // Unit price in ₹ (includes GST)
  dxfData: {
    width: number;                // Part width in mm
    height: number;               // Part height in mm
    cuttingLength: number;        // Total cutting path in mm
  };
  filePath: string;               // Supabase storage path
  file: File;                     // Original file object
  addedAt: number;                // Timestamp when added to cart
  quantity?: number;              // Quantity multiplier (laser cutting only)
  isSketchService?: boolean;      // Flag for sketch-to-DXF service orders
  color?: string | null;          // Selected colour name for colour-enabled materials
  colorHex?: string | null;       // Hex value of the selected colour for swatch display
}

/**
 * Thickness-based pricing configuration
 */
interface ThicknessPricing {
  thickness: number;              // Thickness in mm
  pricePerMm: number;             // Price per mm of cutting path (₹)
}

/**
 * Material configuration from database
 */
interface Material {
  id: string;                     // Material database ID
  name: string;                   // Material name
  category: string;               // Material category
  pricing: ThicknessPricing[];    // Pricing tiers by thickness
  density?: number;               // Material density in kg/m³ (for shipping weight)
  price_per_mm: number;           // Laser cutting rate per mm
  price_per_sqf: number;          // Material rate per sq ft
  thicknesses?: number[];
}

/**
 * Checkout Screen Component Props
 * 
 * Supports three checkout modes:
 * 1. Single DXF checkout (file, material, thickness, price, dxfData)
 * 2. Cart checkout (cartItems, isCartCheckout=true)
 * 3. Sketch service checkout (sketchFiles, isSketchWorkflow=true)
 */
interface CheckoutScreenProps {
  // Single item checkout props
  file?: File | null;                                   // DXF/SVG file for single checkout
  fileName?: string;                                    // Display name
  sketchFiles?: File[];                                 // Images for sketch service
  material?: Material;                                  // Selected material
  thickness?: number;                                   // Selected thickness (mm)
  price?: number;                                       // Calculated price (₹)
  quantity?: number;                                    // Quantity for single item
  dxfData?: DXFData | null;                            // Parsed DXF data
  
  // Cart checkout props
  cartItems?: CartItem[];                               // All cart items
  cartItemCount?: number;                               // Number of items in cart
  isCartCheckout?: boolean;                             // Flag for cart mode
  
  // Workflow flags
  isSketchWorkflow?: boolean;                           // Flag for sketch service
  
  // Callbacks
  onConfirm?: (                                         // Legacy callback (deprecated)
    paymentMethod: string,
    discountCode?: string,
    deliveryInfo?: any,
    pointsUsed?: number,
    shippingCost?: number,
    shippingCarrier?: string,
    totalWeight?: number
  ) => void | Promise<void>;
  onPlaceOrder?: (                                      // Primary order placement callback
    paymentMethod: string,
    discountCode?: string,
    deliveryInfo?: any,
    pointsUsed?: number,
    shippingCost?: number,
    shippingCarrier?: string,
    totalWeight?: number
  ) => void | Promise<void>;
  onBack: () => void;                                   // Navigate back to previous screen
  
  // State flags
  isProcessing?: boolean;                               // Order is being processed (disable buttons)
  isUploading?: boolean;                                // Files are being uploaded
  
  // User/Auth
  isLoggedIn?: boolean;                                 // User authentication status
  user?: any;                                           // User object (for autofill)
  
  // Order notes
  orderNotes?: string;                                  // Special instructions
  onOrderNotesChange?: (notes: string) => void;         // Update notes callback

  // Colour selection (single-item checkout only)
  selectedColor?: string | null;                        // Selected colour name
  selectedColorHex?: string | null;                     // Hex value for swatch display
}

/**
 * Indian States and Union Territories
 * 
 * Complete list of Indian states and UTs for shipping address validation.
 * Used for state-based shipping rate calculations.
 * 
 * Total: 28 states + 8 UTs = 36 entries
 */
const INDIAN_STATES = [
  // States (28)
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  
  // Union Territories (8)
  "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export function CheckoutScreen({
  file,
  fileName,
  sketchFiles,
  material,
  thickness,
  price,
  quantity = 1,
  dxfData,
  cartItems,
  onConfirm,
  onPlaceOrder,
  onBack,
  isProcessing = false,
  isLoggedIn = false,
  user,
  orderNotes,
  onOrderNotesChange,
  isSketchWorkflow,
  isCartCheckout,
  cartItemCount,
  selectedColor,
  selectedColorHex,
}: CheckoutScreenProps) {
  // Contact & Delivery
  const [email, setEmail] = useState("");
  const [emailOffers, setEmailOffers] = useState(true); // Default to true (matches DB default)
  const [country, setCountry] = useState("India");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);

  // Payment & Discount
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "payu">("razorpay");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
  } | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const hasAutoAppliedRef = useRef(false); // Track if we've auto-applied referral code

  // Payment method availability (loaded from server)
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState({
    razorpay: true,
    payu: true,
  });

  // Setup cost for pricing calculations
  const [setupCost, setSetupCost] = useState(100);

  // Loyalty Points
  const [availablePoints, setAvailablePoints] = useState(0);
  const [maxUsablePoints, setMaxUsablePoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [appliedPoints, setAppliedPoints] = useState(0);
  const [isCheckingPoints, setIsCheckingPoints] = useState(false);
  const [showPointsSection, setShowPointsSection] = useState(false);

  // Billing Address
  const [billingAddressType, setBillingAddressType] = useState<"same" | "different">("same");
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingApartment, setBillingApartment] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPinCode, setBillingPinCode] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  // ============================================================================
  // PRICING CALCULATION
  // ============================================================================
  
  /**
   * Calculate total price for a cart item
   * Uses pre-calculated total from cart context
   * 
   * @param item - Cart item to calculate total for
   * @returns Total price (₹)
   */
  const getItemTotal = (item: CartItem): number => {
    return item.calculatedTotal || 0;
  };
  
  const cartTotal = cartItems?.reduce((sum, item) => {
    return sum + getItemTotal(item);
  }, 0) || 0;
  
  // Calculate raw base price with setup cost optimization
  // For single item checkout, apply the same setup cost logic as cart items
  const singleItemTotal = calculateItemTotal({
    unitPrice: price || 0,
    quantity: quantity,
    isSketchService: false, // Single item checkout is always laser cutting
  }, setupCost);
  
  const rawBasePrice = (cartItems && cartItems.length > 0) ? cartTotal : singleItemTotal;
  
  // ============================================================================
  // GST CALCULATION - SEPARATE RATES FOR DIFFERENT SERVICES
  // ============================================================================
  
  /**
   * BUSINESS RULE: Differential GST Rates
   * 
   * India's GST system requires different tax rates for different services:
   * 
   * 1. Laser Cutting (Manufacturing): 18% GST
   *    - HSN Code: 8456 (Machine tools for working by laser)
   *    - Classified as manufacturing service
   *    - Applies to all DXF/SVG cutting orders
   * 
   * 2. CAD/Design Services (Professional Services): 18% GST
   *    - SAC Code: 998386 (CAD/CAM services)
   *    - Classified as professional/technical service
   *    - Applies to sketch-to-DXF conversion
   *    - Updated per GST Council 2025/2026 (simplified to 5% & 18%)
   * 
   * Important: Prices are GST-inclusive (display price includes tax)
   * We need to separate items by GST rate for invoice generation
   * and reverse-calculate subtotal + tax for each category.
   * 
   * Calculation:
   * - Price including GST = Subtotal × (1 + GST%)
   * - Subtotal = Price / (1 + GST%)
   * - Tax = Price - Subtotal
   */
  
  let rawLaserCuttingTotal = 0;  // Total for 18% GST items
  let rawCadServiceTotal = 0;    // Total for 18% GST items
  
  if (cartItems && cartItems.length > 0) {
    // Cart checkout - separate items by service type
    
    // Laser cutting items (18% GST)
    rawLaserCuttingTotal = cartItems
      .filter(item => !item.isSketchService)
      .reduce((sum, item) => {
        return sum + getItemTotal(item);
      }, 0);
    
    // CAD/sketch service items (18% GST)
    rawCadServiceTotal = cartItems
      .filter(item => item.isSketchService)
      .reduce((sum, item) => {
        return sum + getItemTotal(item);
      }, 0);
      
  } else {
    // Single item checkout
    if (material?.category === 'service' || isSketchWorkflow) {
      // CAD service (18% GST)
      rawCadServiceTotal = (price || 0) * quantity;
    } else {
      // Laser cutting (18% GST)
      rawLaserCuttingTotal = (price || 0) * quantity;
    }
  }
  
  // Final totals by GST category
  const laserCuttingTotal = rawLaserCuttingTotal;
  const cadServiceTotal = rawCadServiceTotal;
  
  // Combined base price (before discounts/points)
  const basePrice = laserCuttingTotal + cadServiceTotal;
  
  // ============================================================================
  // DISCOUNT & LOYALTY POINTS APPLICATION - CORRECT ACCOUNTING METHOD
  // ============================================================================
  
  /**
   * CORRECT ACCOUNTING APPROACH: Apply discounts to ex-GST amounts, then calculate GST
   * 
   * Flow for SINGLE item checkout:
   * 1. Extract ex-GST subtotals from GST-inclusive prices
   * 2. Apply discount to ex-GST amounts (proportionally across categories)
   * 3. Apply loyalty points to ex-GST amounts
   * 4. Calculate GST on the reduced ex-GST amounts
   * 5. Add shipping (with 18% GST) to get final total
   * 
   * Flow for CART checkout (SIMPLIFIED - avoids tax splitting complexity):
   * 1. Extract ex-GST subtotals from GST-inclusive prices
   * 2. Apply ALL discount/loyalty ONLY to the FIRST item
   * 3. Calculate GST on the reduced ex-GST amounts
   * 4. Add shipping (with 18% GST) to get final total
   * 
   * Example (single item):
   * - Base price (GST-incl): ₹1074.78
   * - Ex-GST: ₹910.99 (1074.78 / 1.18)
   * - Discount 10%: ₹910.99 × 0.9 = ₹819.89
   * - Loyalty: ₹819.89 - ₹5 = ₹814.89
   * - GST 18%: ₹814.89 × 0.18 = ₹146.68
   * - Subtotal with tax: ₹961.57
   * - Shipping: ₹233.90 + ₹42.10 (18% GST) = ₹276.00
   * - Total: ₹1237.57 ✓
   */
  
  // Step 1: Extract ex-GST subtotals from original prices
  const laserSubtotalOriginal = laserCuttingTotal / 1.18;
  const cadSubtotalOriginal = cadServiceTotal / 1.12;
  const subtotalOriginal = laserSubtotalOriginal + cadSubtotalOriginal;  // Total ex-GST before discounts
  
  // Step 2: Apply discount & loyalty (SIMPLIFIED for cart with mixed GST rates)
  let laserSubtotal = laserSubtotalOriginal;
  let cadSubtotal = cadSubtotalOriginal;
  let discountAmountExGST = 0;
  let loyaltyAmountApplied = 0;
  
  if (isCartCheckout && cartItems && cartItems.length > 0) {
    // CART: Apply ALL discount/loyalty to FIRST item only (avoids splitting complexity)
    const firstItem = cartItems[0];
    const isFirstItemService = firstItem.material?.category === 'service';
    const firstItemGSTRate = isFirstItemService ? 0.18 : 0.18;
    const firstItemQuantity = firstItem.quantity || 1; // Default to 1 if undefined
    const firstItemGSTInclusiveTotal = firstItem.price * firstItemQuantity;
    const firstItemExGST = firstItemGSTInclusiveTotal / (1 + firstItemGSTRate);
    
    // Apply discount
    if (appliedDiscount?.amount) {
      discountAmountExGST = appliedDiscount.amount / (1 + firstItemGSTRate);
      discountAmountExGST = Math.min(discountAmountExGST, firstItemExGST);
    }
    
    // Apply loyalty
    const firstItemAfterDiscount = Math.max(0, firstItemExGST - discountAmountExGST);
    loyaltyAmountApplied = Math.min(appliedPoints, firstItemAfterDiscount);
    
    // Reduce the appropriate category
    const totalReduction = discountAmountExGST + loyaltyAmountApplied;
    if (isFirstItemService) {
      cadSubtotal = Math.max(0, cadSubtotalOriginal - totalReduction);
    } else {
      laserSubtotal = Math.max(0, laserSubtotalOriginal - totalReduction);
    }
  } else {
    // SINGLE: Apply discount/loyalty proportionally
    if (appliedDiscount?.amount) {
      const discountRatio = appliedDiscount.amount / basePrice;
      discountAmountExGST = subtotalOriginal * discountRatio;
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotalOriginal - discountAmountExGST);
    loyaltyAmountApplied = Math.min(appliedPoints, subtotalAfterDiscount);
    
    const totalReduction = discountAmountExGST + loyaltyAmountApplied;
    const subtotalAfterPoints = Math.max(0, subtotalOriginal - totalReduction);
    const reductionRatio = subtotalOriginal > 0 ? subtotalAfterPoints / subtotalOriginal : 1;
    
    laserSubtotal = laserSubtotalOriginal * reductionRatio;
    cadSubtotal = cadSubtotalOriginal * reductionRatio;
  }
  
  const subtotal = laserSubtotal + cadSubtotal;  // Final ex-GST subtotal
  
  // Step 3: Calculate GST on the reduced ex-GST amounts
  const laserTax = laserSubtotal * 0.18;  // 18% of ex-GST amount
  const cadTax = cadSubtotal * 0.18;      // 18% of ex-GST amount (GST Council 2025/2026)
  const taxAmount = laserTax + cadTax;
  
  // Step 4: Calculate GST-inclusive amounts (for backend consistency)
  const finalLaserTotal = laserSubtotal + laserTax;  // Ex-GST + GST = inclusive
  const finalCadTotal = cadSubtotal + cadTax;
  
  // Calculate price after discount (before loyalty points) - needed for loyalty points calculation
  const subtotalAfterDiscount = subtotalOriginal - discountAmountExGST;
  const priceAfterDiscount = subtotalAfterDiscount + (subtotalAfterDiscount * (laserCuttingTotal > 0 ? 0.18 : 0.18));
  
  const priceAfterPoints = subtotal + taxAmount;  // Total GST-inclusive after all reductions
  
  // ============================================================================
  // SHIPPING CALCULATION STATE
  // ============================================================================
  
  const [shippingCost, setShippingCost] = useState(0);                    // Final shipping cost (₹)
  const [shippingCarrier, setShippingCarrier] = useState('Standard Shipping'); // Carrier name for display
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);   // Loading state
  const [totalWeight, setTotalWeight] = useState(0);                      // Total order weight (kg)
  const [shippingRates, setShippingRates] = useState<any[]>([]);         // State-based shipping rates
  
  // Local processing state for immediate button feedback
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);

  // ============================================================================
  // FETCH PRICING CONSTANTS ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    const fetchSetupCost = async () => {
      const constants = await getPricingConstants();
      setSetupCost(constants.setupCost);
    };
    fetchSetupCost();
  }, []);

  // ============================================================================
  // AUTO-APPLY REFERRAL CODE FROM URL
  // ============================================================================
  
  useEffect(() => {
    // Check for 'ref' parameter in URL (e.g., ?ref=AFFILIATE10)
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && !discountCode && !appliedDiscount) {
      console.log('🔗 Detected referral code from URL:', refCode);
      setDiscountCode(refCode);
      
      // Store in localStorage so it persists across page navigation
      localStorage.setItem('referralCode', refCode);
      
      // Show a toast notification
      toast.info(`Referral code "${refCode}" has been applied!`, {
        duration: 4000,
      });
    } else {
      // Check localStorage for previously stored referral code
      const storedRefCode = localStorage.getItem('referralCode');
      if (storedRefCode && !discountCode && !appliedDiscount) {
        console.log('🔗 Using stored referral code:', storedRefCode);
        setDiscountCode(storedRefCode);
        
        toast.info(`Referral code "${storedRefCode}" is ready to apply!`, {
          duration: 4000,
        });
      }
    }
  }, []); // Run once on mount

  // ============================================================================
  // AUTO-APPLY REFERRAL DISCOUNT CODE
  // ============================================================================
  
  useEffect(() => {
    // Automatically apply the discount code if it was set from a referral link
    // and hasn't been applied yet
    const autoApplyReferralCode = async () => {
      // Only auto-apply once, and only if there's a code that matches localStorage
      if (discountCode && !appliedDiscount && !isApplyingDiscount && !hasAutoAppliedRef.current) {
        const storedRefCode = localStorage.getItem('referralCode');
        if (storedRefCode && storedRefCode === discountCode) {
          console.log('🔗 Auto-applying referral code:', discountCode);
          hasAutoAppliedRef.current = true; // Mark as attempted
          
          setIsApplyingDiscount(true);
          setDiscountError("");

          try {
            const accessToken = localStorage.getItem('access_token');
            
            const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/discounts/validate`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ 
                  code: discountCode, 
                  cartTotal: basePrice
                }),
              }
            );

            const result = await response.json();

            if (result.success && result.valid) {
              setAppliedDiscount({
                code: result.code,
                amount: result.amount,
              });
              setDiscountError("");
              toast.success(`Discount code "${result.code}" applied! You saved ₹${result.amount.toFixed(2)}`, {
                duration: 4000,
              });
            } else {
              setDiscountError(result.error || "Invalid discount code");
              setAppliedDiscount(null);
              toast.error(`Could not apply referral code: ${result.error || "Invalid code"}`, {
                duration: 4000,
              });
            }
          } catch (error) {
            console.error('Auto-apply discount error:', error);
            setDiscountError("Could not verify discount code");
            setAppliedDiscount(null);
          } finally {
            setIsApplyingDiscount(false);
          }
        }
      }
    };
    
    autoApplyReferralCode();
  }, [discountCode, appliedDiscount, isApplyingDiscount, basePrice]); // Trigger when discount code or base price changes

  // ============================================================================
  // FETCH SHIPPING RATES ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    const fetchShippingRates = async () => {
      try {
        const result = await apiCall('/shipping-rates');
        console.log('📦 Shipping rates fetched:', result);
        if (result.success && result.rates) {
          setShippingRates(result.rates);
        }
      } catch (error) {
        console.error('Error fetching shipping rates:', error);
      }
    };
    
    fetchShippingRates();
  }, []);

  // ============================================================================
  // FETCH ENABLED PAYMENT METHODS ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const result = await apiCall('/payment-methods/enabled', { method: 'GET' }, false);
        console.log('💳 Payment methods fetched:', result);
        if (result.success && result.methods) {
          setEnabledPaymentMethods(result.methods);
          
          // If current selection is disabled, switch to first enabled method
          if (paymentMethod === 'razorpay' && !result.methods.razorpay && result.methods.payu) {
            setPaymentMethod('payu');
          } else if (paymentMethod === 'payu' && !result.methods.payu && result.methods.razorpay) {
            setPaymentMethod('razorpay');
          }
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        // On error, keep both enabled to avoid blocking checkout
      }
    };
    
    fetchPaymentMethods();
  }, []);

  // ============================================================================
  // SHIPPING CALCULATION - AUTO-UPDATE ON ADDRESS/ITEMS CHANGE
  // ============================================================================
  
  /**
   * Calculate shipping cost automatically when address or items change
   * 
   * Triggers on:
   * - User enters/changes delivery address
   * - User selects/changes state
   * - Cart items change (quantity update, add/remove)
   * 
   * Calculation Process:
   * 1. Validate address is complete (address, state, pincode required)
   * 2. Filter out sketch services (no physical shipping needed)
   * 3. Expand items by quantity (e.g., 3× same item = 3 entries)
   * 4. Calculate total weight (sum of all items)
   * 5. Fetch state-specific rates from database
   * 6. Apply weight-based calculation or free shipping threshold
   * 7. Add oversized surcharge if applicable
   * 8. Apply bulk discount (5%) for multiple items
   * 
   * Dependencies: [address, state, pinCode, cartItems, material, thickness, dxfData, quantity]
   */
  useEffect(() => {
    const calculateShipping = async () => {
      // ======================================================================
      // STEP 1: Validate address completeness
      // ======================================================================
      if (!address || !state || !pinCode) {
        // Address incomplete - reset shipping to zero
        setShippingCost(0);
        setShippingCarrier('Standard Shipping');
        setTotalWeight(0);
        setIsCalculatingShipping(false);
        return;
      }

      setIsCalculatingShipping(true);

      try {
        if (cartItems && cartItems.length > 0) {
          // For cart checkout - expand items by quantity and exclude sketch services
          const shippingItems = cartItems
            .filter(item => !item.isSketchService) // Exclude sketch services from physical shipping
            .filter(item => {
              // Validate that item has valid dimension data
              const hasValidData = item.dxfData && 
                typeof item.dxfData.width === 'number' && 
                typeof item.dxfData.height === 'number' && 
                typeof item.dxfData.cuttingLength === 'number' &&
                !isNaN(item.dxfData.width) &&
                !isNaN(item.dxfData.height) &&
                !isNaN(item.dxfData.cuttingLength);
              
              if (!hasValidData) {
                console.warn('⚠️ Skipping item with invalid dimensions:', item);
              }
              return hasValidData;
            })
            .flatMap(item => {
              const qty = item.quantity || 1;
              return Array(qty).fill({
                material: item.material.name,
                thickness: item.thickness,
                cuttingLength: item.dxfData.cuttingLength,
                width: item.dxfData.width,
                height: item.dxfData.height,
              });
            });
          
          if (shippingItems.length > 0) {
            // Calculate total weight
            const weight = shippingItems.reduce((sum, item) => sum + calculateWeight(item), 0);
            setTotalWeight(weight);
            
            // Find state-specific rate
            const stateRate = shippingRates.find(rate => rate.state === state);
            console.log('🚚 Shipping calculation:', { 
              state, 
              stateRate, 
              weight: shippingItems.reduce((sum, item) => sum + calculateWeight(item), 0),
              shippingRates 
            });
            
            const stateRateConfig = stateRate ? {
              rate_per_kg: stateRate.rate,
              free_shipping_threshold_kg: stateRate.free_shipping_threshold
            } : undefined;
            
            // Calculate shipping cost with correct parameters
            const cost = calculateStateBasedShippingCost(shippingItems, stateRateConfig);
            console.log('💰 Calculated shipping cost:', { 
              cost, 
              costType: typeof cost,
              stateRateConfig,
              itemCount: shippingItems.length
            });
            
            // Defensive check for NaN
            const validCost = isNaN(cost) || cost === null || cost === undefined ? 0 : cost;
            setShippingCost(validCost);
            setShippingCarrier(stateRate?.carrier_name || 'Standard Shipping');
          } else {
            setShippingCost(0);
            setShippingCarrier('No Physical Items');
            setTotalWeight(0);
          }
        } else if (!isSketchWorkflow && material && thickness && dxfData) {
          // For single DXF item with quantity
          const shippingItems = Array(quantity).fill({
            material: material.name,
            thickness,
            cuttingLength: dxfData.cuttingLength,
            width: dxfData.width,
            height: dxfData.height,
          });
          
          // Calculate total weight
          const weight = shippingItems.reduce((sum, item) => sum + calculateWeight(item), 0);
          setTotalWeight(weight);
          
          // Find state-specific rate
          const stateRate = shippingRates.find(rate => rate.state === state);
          const stateRateConfig = stateRate ? {
            rate_per_kg: stateRate.rate,
            free_shipping_threshold_kg: stateRate.free_shipping_threshold
          } : undefined;
          
          // Calculate shipping cost with correct parameters
          const cost = calculateStateBasedShippingCost(shippingItems, stateRateConfig);
          
          // Defensive check for NaN
          const validCost = isNaN(cost) || cost === null || cost === undefined ? 0 : cost;
          setShippingCost(validCost);
          setShippingCarrier(stateRate?.carrier_name || 'Standard Shipping');
        } else {
          // Sketch services don't have physical shipping
          setShippingCost(0);
          setShippingCarrier('Digital Service');
          setTotalWeight(0);
        }
      } catch (error) {
        console.error('Error calculating shipping:', error);
        // Keep previous values on error
      } finally {
        setIsCalculatingShipping(false);
      }
    };

    calculateShipping();
  }, [address, state, pinCode, cartItems, material, thickness, dxfData, quantity, isSketchWorkflow, shippingRates]);
  
  // ============================================================================
  // SHIPPING GST BREAKDOWN (18% GST on shipping)
  // ============================================================================
  const validShippingCost = isNaN(shippingCost) ? 0 : shippingCost;
  const shippingExGST = validShippingCost / 1.18;  // Extract ex-GST shipping cost
  const shippingGST = validShippingCost - shippingExGST;  // 18% GST component
  
  // Ensure all values are valid numbers before calculating total
  const validPriceAfterPoints = isNaN(priceAfterPoints) ? 0 : priceAfterPoints;
  const total = validPriceAfterPoints + validShippingCost;
  
  // Debug logging for total calculation
  console.log('💰 [CHECKOUT] Pricing breakdown:', {
    checkoutType: isCartCheckout ? 'CART' : 'SINGLE',
    itemCount: isCartCheckout ? cartItems?.length : 1,
    basePrice: basePrice.toFixed(2),
    subtotalOriginal: subtotalOriginal.toFixed(2),
    discountAmount: (appliedDiscount?.amount || 0).toFixed(2),
    discountAmountExGST: discountAmountExGST.toFixed(2),
    priceAfterDiscount: priceAfterDiscount.toFixed(2),
    loyaltyPoints: appliedPoints.toFixed(2),
    loyaltyAmountApplied: loyaltyAmountApplied.toFixed(2),
    subtotal: subtotal.toFixed(2),
    laserSubtotal: laserSubtotal.toFixed(2),
    laserTax: laserTax.toFixed(2),
    cadSubtotal: cadSubtotal.toFixed(2),
    cadTax: cadTax.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    priceAfterPoints: priceAfterPoints.toFixed(2),
    shippingExGST: shippingExGST.toFixed(2),
    shippingGST: shippingGST.toFixed(2),
    shippingCost: shippingCost.toFixed(2),
    total: total.toFixed(2)
  });

  // Prefill email if user is logged in - track with ref to prevent loops
  const hasLoadedUser = useRef(false);
  useEffect(() => {
    if (user && user.email && !hasLoadedUser.current) {

      hasLoadedUser.current = true;
      setEmail(user.email);
      // Check points for the user's email
      checkLoyaltyPoints(user.email);
    }
  }, [user]); // Only run when user changes, but hasLoadedUser prevents re-runs

  // Fetch saved delivery info on mount if user is logged in
  useEffect(() => {
    const fetchDeliveryInfo = async () => {
      if (!user) return;

      try {
        console.log('📍 Fetching delivery info for user:', user.email);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/delivery-info`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        const data = await response.json();
        console.log('📍 Delivery info response:', data);
        
        if (data.success && data.deliveryInfo) {
          const info = data.deliveryInfo;
          console.log('✅ Autofilling address fields:', info);
          // Auto-fill all fields
          setFirstName(info.firstName || '');
          setLastName(info.lastName || '');
          setAddress(info.address || '');
          setApartment(info.apartment || '');
          setCity(info.city || '');
          setState(info.state || '');
          setPinCode(info.pinCode || '');
          setPhone(info.phone || '');
          setGstNumber(info.gstNumber || '');
          setCountry(info.country || 'India');
          // Load email subscription preference
          if (info.isSubscribed !== undefined) {
            setEmailOffers(info.isSubscribed);
          }
        } else {
          console.log('ℹ️ No saved delivery info found for user');
        }
      } catch (error) {
        console.error('❌ Error fetching delivery info:', error);
      }
    };

    fetchDeliveryInfo();
  }, [user]);

  // Recalculate max usable points when order value changes
  useEffect(() => {
    if (availablePoints > 0 && email) {
      const orderValue = priceAfterDiscount + shippingCost;
      const maxAllowedPoints = Math.floor(orderValue * 0.3); // 30% of order value
      const usable = Math.min(availablePoints, maxAllowedPoints);
      
      setMaxUsablePoints(usable);
      setShowPointsSection(usable > 0);
      
      // If points were already applied, adjust if necessary
      if (appliedPoints > usable) {
        setAppliedPoints(0);
        setPointsToUse(usable);
      }
    }
  }, [priceAfterDiscount, shippingCost, availablePoints]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError("");

    try {
      // Manual fetch to avoid logging expected validation errors
      const accessToken = localStorage.getItem('access_token');
      

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/discounts/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            code: discountCode, 
            cartTotal: basePrice  // Use basePrice (GST-inclusive total) for discount calculation
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.valid) {
        setAppliedDiscount({
          code: result.code,
          amount: result.amount,
        });
        setDiscountError("");
      } else {
        setDiscountError(result.error || "Invalid discount code");
        setAppliedDiscount(null);
      }
    } catch (error: any) {
      console.error('Discount validation error:', error);
      setDiscountError("Invalid discount code");
      setAppliedDiscount(null);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
    
    // Note: We keep the referral code in localStorage so user can re-apply it
    // It will only be cleared when order is successfully completed
  };

  // Check loyalty points when email is entered
  const checkLoyaltyPoints = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setShowPointsSection(false);
      return;
    }

    setIsCheckingPoints(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/points-by-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ email: emailToCheck }),
        }
      );

      const data = await response.json();
      
      // Handle token expiration
      if (!response.ok && (data.code === 401 || data.message?.includes('Invalid JWT'))) {
        setShowPointsSection(false);
        setAvailablePoints(0);
        setMaxUsablePoints(0);
        return;
      }
      
      if (data.success && data.userFound && data.points > 0) {
        const orderValue = priceAfterDiscount + shippingCost;
        const maxAllowedPoints = Math.floor(orderValue * 0.3); // 30% of order value
        const usable = Math.min(data.points, maxAllowedPoints);
        
        console.log('Loyalty points calculation:', {
          availablePoints: data.points,
          orderValue,
          maxAllowedPoints,
          usable,
          willShow: usable > 0
        });
        
        setAvailablePoints(data.points);
        setMaxUsablePoints(usable);
        setPointsToUse(usable); // Pre-fill with max usable points
        setShowPointsSection(usable > 0);
      } else {
        setShowPointsSection(false);
        setAvailablePoints(0);
        setMaxUsablePoints(0);
      }
    } catch (error) {
      console.error('Error checking loyalty points:', error);
      setShowPointsSection(false);
    } finally {
      setIsCheckingPoints(false);
    }
  };

  const handleApplyPoints = () => {
    if (pointsToUse > 0 && pointsToUse <= maxUsablePoints) {
      setAppliedPoints(pointsToUse);
    }
  };

  const handleRemovePoints = () => {
    setAppliedPoints(0);
    setPointsToUse(maxUsablePoints);
  };

  // Fetch saved address when email is entered
  const fetchSavedAddress = async (emailToCheck: string) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailToCheck || !emailRegex.test(emailToCheck)) {
      console.log('⚠️ Invalid email format, skipping address fetch:', emailToCheck);
      return;
    }

    console.log('🔍 Fetching saved address for:', emailToCheck);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/address-by-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: emailToCheck }),
        }
      );

      const data = await response.json();
      console.log('📦 Address fetch response:', data);
      
      if (data.success && data.addressFound && data.address) {
        const addr = data.address;
        console.log('✅ Address found, autofilling fields:', addr);
        
        // Only autofill if fields are empty (don't overwrite user input)
        if (!firstName && addr.firstName) setFirstName(addr.firstName);
        if (!lastName && addr.lastName) setLastName(addr.lastName);
        if (!phone && addr.phone) setPhone(addr.phone);
        if (!address && addr.address) setAddress(addr.address);
        if (!apartment && addr.apartment) setApartment(addr.apartment);
        if (!city && addr.city) setCity(addr.city);
        if (!state && addr.state) setState(addr.state);
        if (!pinCode && addr.pinCode) setPinCode(addr.pinCode);
        if (!country && addr.country) setCountry(addr.country);
        if (!gstNumber && addr.gstNumber) setGstNumber(addr.gstNumber);
        
        console.log('✅ Address autofilled successfully for:', emailToCheck);
      } else {
        console.log('ℹ️ No saved address found for:', emailToCheck);
      }
    } catch (error) {
      console.error('❌ Error fetching saved address:', error);
    }
  };

  const handleProceedToPayment = async () => {
    // Set local processing state immediately for button feedback
    setIsLocalProcessing(true);
    
    // CRITICAL: Prevent submission if shipping is still being calculated
    if (isCalculatingShipping) {
      console.log('⚠️ BLOCKED: Shipping calculation in progress');
      alert("Please wait while we calculate shipping costs...");
      setIsLocalProcessing(false);
      return;
    }
    
    if (!email || !firstName || !lastName || !address || !city || !state || !pinCode || !phone) {
      alert("Please fill in all required delivery information fields");
      setIsLocalProcessing(false);
      return;
    }

    if (billingAddressType === "different") {
      if (!billingFirstName || !billingLastName || !billingAddress || !billingCity || !billingState || !billingPinCode || !billingPhone) {
        alert("Please fill in all required billing address fields");
        setIsLocalProcessing(false);
        return;
      }
    }

    // Save delivery info if user is logged in
    if (user) {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/user/delivery-info`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              country,
              firstName,
              lastName,
              address,
              apartment,
              city,
              state,
              pinCode,
              phone,
              gstNumber,
            }),
          }
        );
      } catch (error) {
        console.error('Error saving delivery info:', error);
        // Don't block checkout if saving fails
      }
    }

    const deliveryInfo = {
      email,
      country,
      firstName,
      lastName,
      address,
      apartment,
      city,
      state,
      pinCode,
      phone,
      gstNumber,
      isSubscribed: emailOffers, // User's email marketing preference
      // Include separate billing address if different
      billingAddressType,
      ...(billingAddressType === 'different' && {
        billingAddress: {
          firstName: billingFirstName,
          lastName: billingLastName,
          address: billingAddress,
          apartment: billingApartment,
          city: billingCity,
          state: billingState,
          pinCode: billingPinCode,
          phone: billingPhone,
        }
      })
    };

    console.log('📧 [CHECKOUT] Email subscription preference being sent:', emailOffers, '(isSubscribed:', deliveryInfo.isSubscribed, ')');

    // Store complete pricing breakdown in sessionStorage for order confirmation page
    const pricingBreakdown = {
      rawTotal: rawLaserCuttingTotal + rawCadServiceTotal,
      basePrice,
      discountAmount: appliedDiscount?.amount || 0,
      discountCode: appliedDiscount?.code,
      pointsUsed: appliedPoints,
      subtotal, // Subtotal before tax
      taxAmount,
      shippingCost,
      shippingCarrier,
      total, // FINAL total to charge
      totalWeight,
    };
    

    sessionStorage.setItem('orderPricing', JSON.stringify(pricingBreakdown));

    // Use onPlaceOrder if provided (from App.tsx), otherwise use onConfirm
    const confirmHandler = onPlaceOrder || onConfirm;
    if (confirmHandler) {
      try {
        await confirmHandler(paymentMethod, appliedDiscount?.code, deliveryInfo, appliedPoints, shippingCost, shippingCarrier, totalWeight);
        // If successful, isLocalProcessing will be reset when order completes or uploads
      } catch (error: any) {
        // If payment fails or any error occurs, reset the loading state
        // Use appropriate logging level based on error type
        if (error?.message?.includes('cancelled by user')) {
          console.log('ℹ️ Payment cancellation handled in CheckoutScreen');
        } else {
          console.error('❌ Payment/Order error in CheckoutScreen:', error);
        }
        setIsLocalProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        {/* Contact Section - Mobile Only (Above Order Summary) */}
        <div className="lg:hidden mb-6">
          <h3 className="text-gray-200 mb-4">Contact</h3>
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  checkLoyaltyPoints(email);
                  fetchSavedAddress(email);
                }}
                className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="email-offers-mobile"
                checked={emailOffers}
                onCheckedChange={(checked) => setEmailOffers(checked as boolean)}
                className="border-gray-600"
              />
              <label
                htmlFor="email-offers-mobile"
                className="text-sm text-gray-400 cursor-pointer"
              >
                Email me with news and offers
              </label>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Side - Form */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Contact Section */}
            <div className="hidden lg:block">
              <h3 className="text-gray-200 mb-4">Contact</h3>
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => {
                      checkLoyaltyPoints(email);
                      fetchSavedAddress(email);
                    }}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="email-offers"
                    checked={emailOffers}
                    onCheckedChange={(checked) => setEmailOffers(checked as boolean)}
                    className="border-gray-600"
                  />
                  <label
                    htmlFor="email-offers"
                    className="text-sm text-gray-400 cursor-pointer"
                  >
                    Email me with news and offers
                  </label>
                </div>
              </div>
            </div>

            {/* Delivery Section */}
            <div>
              <h3 className="text-gray-200 mb-4">Delivery</h3>
              <div className="space-y-4">
                {/* Country */}
                <div>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-[#252525] border-gray-700 text-gray-200 h-12">
                      <SelectValue placeholder="Country/Region" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-gray-700">
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="USA">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                </div>

                {/* Address */}
                <div className="relative">
                  <Input
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12 pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>

                {/* Apartment */}
                <Input
                  placeholder="Apartment, suite, etc. (optional)"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                />

                {/* City, State, PIN */}
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="bg-[#252525] border-gray-700 text-gray-200 h-12">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-gray-700 max-h-60">
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="PIN code"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                </div>

                {/* Phone */}
                <Input
                  placeholder="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                />

                {/* GST Number (Optional) */}
                <Input
                  placeholder="GST Number (optional)"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  className="bg-[#252525] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                />

                {/* Save Info */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-info"
                    checked={saveInfo}
                    onCheckedChange={(checked) => setSaveInfo(checked as boolean)}
                    className="border-gray-600"
                  />
                  <label
                    htmlFor="save-info"
                    className="text-sm text-gray-400 cursor-pointer"
                  >
                    Save this information for next time
                  </label>
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div>
              <h3 className="text-gray-200 mb-4">Shipping method</h3>
              <div className="bg-[#252525] border border-gray-700 rounded-lg p-4">
                {address && state && pinCode ? (
                  isCalculatingShipping ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <p className="text-sm text-gray-400">Calculating shipping...</p>
                    </div>
                  ) : shippingCost > 0 ? (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-200">{shippingCarrier}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Estimated delivery: 3-5 business days
                          {totalWeight > 0 && ` • Weight: ${totalWeight.toFixed(1)} kg`}
                        </p>
                      </div>
                      <p className="text-gray-200 font-medium">₹{shippingCost.toFixed(2)}</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-emerald-400">{shippingCarrier || 'Free Shipping'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {shippingCarrier === 'Digital Service' ? 'No physical delivery required' : 'Free delivery'}
                          {totalWeight > 0 && ` • Weight: ${totalWeight.toFixed(1)} kg`}
                        </p>
                      </div>
                      <p className="text-emerald-400 font-medium">Free</p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-400">
                    Enter your shipping address to view available shipping methods.
                  </p>
                )}
              </div>
            </div>

            {/* Additional Order Notes */}
            <div>
              <h3 className="text-gray-200 mb-2">
                Additional Order Notes <span className="text-gray-500 text-sm">(Optional)</span>
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Add any special instructions or notes for your order
              </p>
              <textarea
                value={orderNotes || ''}
                onChange={(e) => onOrderNotesChange?.(e.target.value)}
                placeholder="e.g., Specific delivery instructions, custom requirements, or questions about your order..."
                className="w-full h-32 px-4 py-3 bg-[#252525] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Maximum 500 characters
                </p>
                <p className="text-xs text-gray-500">
                  {orderNotes?.length || 0}/500
                </p>
              </div>
            </div>

            {/* Payment Section */}
            <div>
              <h3 className="text-gray-200 mb-2">Payment</h3>
              <p className="text-sm text-gray-400 mb-4">
                All transactions are secure and encrypted.
              </p>

              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "razorpay" | "payu")}
                className="space-y-0"
              >
                {/* Razorpay Option */}
                {enabledPaymentMethods.razorpay && (
                <div
                  className={`border-2 ${
                    paymentMethod === "razorpay"
                      ? "border-blue-500 bg-blue-950/20"
                      : "border-gray-700 bg-[#252525]"
                  } ${enabledPaymentMethods.payu ? 'rounded-t-lg' : 'rounded-lg'} transition-all`}
                >
                  <Label
                    htmlFor="razorpay"
                    className="flex items-center gap-3 p-4 cursor-pointer"
                  >
                    <RadioGroupItem value="razorpay" id="razorpay" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-200 text-[12px] font-roboto">
                          Razorpay Secure (UPI, Cards, Int'l Cards, Wallets)
                        </span>
                        <div className="flex gap-1 ml-auto">
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Label>
                  {paymentMethod === "razorpay" && (
                    <div className="px-4 pb-4">
                      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 flex items-center justify-center">
                        <CreditCard className="w-12 h-12 text-gray-600" />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        After clicking "Pay now", you will be redirected to Razorpay Secure
                        (UPI, Cards, Int'l Cards, Wallets) to complete your purchase securely.
                      </p>
                    </div>
                  )}
                </div>
                )}

                {/* PayU Option */}
                {enabledPaymentMethods.payu && (
                <div
                  className={`border-2 ${
                    paymentMethod === "payu"
                      ? "border-blue-500 bg-blue-950/20"
                      : "border-gray-700 bg-[#252525]"
                  } ${enabledPaymentMethods.razorpay ? 'rounded-b-lg' : 'rounded-lg'} transition-all`}
                >
                  <Label
                    htmlFor="payu"
                    className="flex items-center gap-3 p-4 cursor-pointer"
                  >
                    <RadioGroupItem value="payu" id="payu" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-200 text-[12px] font-roboto">
                          PayU India: UPI, CARDS, NB, BNPL, EMI, QR
                        </span>
                        <div className="flex gap-1 ml-auto">
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="w-8 h-5 bg-gray-700 rounded flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Label>
                  {paymentMethod === "payu" && (
                    <div className="px-4 pb-4">
                      <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6 flex items-center justify-center">
                        <CreditCard className="w-12 h-12 text-gray-600" />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        After clicking "Pay now", you will be redirected to PayU India
                        to complete your purchase securely.
                      </p>
                    </div>
                  )}
                </div>
                )}
              </RadioGroup>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-gray-200 mb-4">Billing address</h3>
              <RadioGroup
                value={billingAddressType}
                onValueChange={(value) => setBillingAddressType(value as "same" | "different")}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="same" id="billing-same" />
                  <Label
                    htmlFor="billing-same"
                    className="text-gray-200 cursor-pointer"
                  >
                    Same as shipping address
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="different" id="billing-different" />
                  <Label
                    htmlFor="billing-different"
                    className="text-gray-200 cursor-pointer"
                  >
                    Use a different billing address
                  </Label>
                </div>
              </RadioGroup>

              {/* Different Billing Address Form */}
              {billingAddressType === "different" && (
                <div className="mt-4 space-y-4 p-4 bg-[#252525] rounded-lg border border-gray-700">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First name"
                      value={billingFirstName}
                      onChange={(e) => setBillingFirstName(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                    />
                    <Input
                      placeholder="Last name"
                      value={billingLastName}
                      onChange={(e) => setBillingLastName(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                    />
                  </div>
                  <Input
                    placeholder="Address"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                  <Input
                    placeholder="Apartment, suite, etc. (optional)"
                    value={billingApartment}
                    onChange={(e) => setBillingApartment(e.target.value)}
                    className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      placeholder="City"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                    />
                    <Select value={billingState} onValueChange={setBillingState}>
                      <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-gray-200 h-12">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252525] border-gray-700 max-h-60">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="PIN code"
                      value={billingPinCode}
                      onChange={(e) => setBillingPinCode(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                    />
                  </div>
                  <Input
                    placeholder="Phone"
                    type="tel"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                  />
                </div>
              )}
            </div>

            {/* Pay Now Button - Mobile Only */}
            <div className="lg:hidden">
              <p className="text-sm text-gray-400 mb-3 text-center">
                You'll earn {Math.floor(total / 100)} loyalty points with this order
              </p>
              <Button
                onClick={handleProceedToPayment}
                disabled={isProcessing || isLocalProcessing || isCalculatingShipping}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculatingShipping ? "Calculating shipping..." : (isProcessing || isLocalProcessing) ? "Processing..." : "Pay now"}
              </Button>
              <Button
                onClick={onBack}
                variant="ghost"
                className="w-full mt-3 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                disabled={isProcessing || isLocalProcessing}
              >
                Back to Summary
              </Button>
            </div>
          </div>

          {/* Right Side - Order Summary */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Product Summary */}
              <Card className="p-6 bg-[#252525] border-0">
                {cartItems && cartItems.length > 0 ? (
                  <div className="space-y-4 mb-6">
                    <h4 className="text-gray-200 font-medium mb-2">Order Summary ({cartItems.length} items)</h4>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      {cartItems.map((item, index) => (
                        <div key={item.id || index} className="flex gap-4">
                          <div className="relative w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-500" />
                            {!item.isSketchService && (item.quantity || 1) > 1 && (
                              <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">
                                {item.quantity || 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-gray-200 text-sm truncate" title={item.fileName}>
                              {item.fileName}
                            </h5>
                            <p className="text-xs text-gray-400">
                              {item.material.name} • {item.thickness}mm
                              {!item.isSketchService && (item.quantity || 1) > 1 && (
                                <span className="ml-1">× {item.quantity || 1}</span>
                              )}
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
                            <p className="text-gray-300 text-sm mt-1">
                              {!item.isSketchService && (item.quantity || 1) > 1 ? (
                                <>
                                  <span className="text-xs text-gray-500">₹{item.price.toFixed(2)} × {item.quantity || 1} = </span>
                                  ₹{getItemTotal(item).toFixed(2)}
                                </>
                              ) : (
                                `₹${getItemTotal(item).toFixed(2)}`
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 mb-6">
                    <div className="relative w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-8 h-8 text-gray-500" />
                      {quantity > 1 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">
                          {quantity}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-200 mb-1">
                        {material?.name || 'Custom Order'}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {thickness}mm{dxfData && ` × ${dxfData.width.toFixed(0)} × ${dxfData.height.toFixed(0)} mm`}
                        {quantity > 1 && <span className="ml-1">× {quantity}</span>}
                        {selectedColor && (
                          <span className="inline-flex items-center gap-1.5 ml-1">
                            <span>•</span>
                            {selectedColorHex && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0 align-middle"
                                style={{ backgroundColor: selectedColorHex }}
                              />
                            )}
                            <span className="text-gray-300">{selectedColor}</span>
                          </span>
                        )}
                      </p>
                      <p className="text-gray-200 mt-2">
                        {quantity > 1 ? (
                          <>
                            <span className="text-xs text-gray-500">₹{(price || 0).toFixed(2)} × {quantity} = </span>
                            ₹{singleItemTotal.toFixed(2)}
                          </>
                        ) : (
                          `₹${singleItemTotal.toFixed(2)}`
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Discount Code */}
                <div className="mb-6">
                  {appliedDiscount ? (
                    <Alert className="bg-emerald-950 border-emerald-800 mb-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <AlertDescription className="text-emerald-300 flex items-center justify-between">
                        <span className="text-sm">
                          Code "{appliedDiscount.code}" applied
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveDiscount}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900 h-auto p-0"
                        >
                          Remove
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value.toUpperCase());
                            setDiscountError("");
                          }}
                          placeholder="Discount code"
                          className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                          disabled={isApplyingDiscount}
                        />
                        <Button
                          onClick={handleApplyDiscount}
                          disabled={isApplyingDiscount || !discountCode.trim()}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 h-12"
                        >
                          {isApplyingDiscount ? "..." : "Apply"}
                        </Button>
                      </div>
                      {discountError && (
                        <p className="text-xs text-red-400">{discountError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Loyalty Points */}
                {showPointsSection && (
                  <div className="mb-6">
                    {appliedPoints > 0 ? (
                      <Alert className="bg-purple-950 border-purple-800 mb-0">
                        <Gift className="h-4 w-4 text-purple-400" />
                        <AlertDescription className="text-purple-300 flex items-center justify-between">
                          <span className="text-sm">
                            {appliedPoints} points applied (₹{appliedPoints})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePoints}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900 h-auto p-0"
                          >
                            Remove
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                          <Gift className="w-4 h-4 text-purple-400" />
                          <span>You can use up to {maxUsablePoints} points (₹{maxUsablePoints})</span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={pointsToUse}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setPointsToUse(Math.min(value, maxUsablePoints));
                            }}
                            max={maxUsablePoints}
                            placeholder="Points to use"
                            className="bg-[#1a1a1a] border-gray-700 text-gray-200 placeholder-gray-500 h-12"
                          />
                          <Button
                            onClick={handleApplyPoints}
                            disabled={pointsToUse === 0 || pointsToUse > maxUsablePoints}
                            className="bg-purple-700 hover:bg-purple-600 text-white px-6 h-12"
                          >
                            Apply
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Limited to 30% of order value • 1 point = ₹1
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing Breakdown */}
                <div className="space-y-3 pt-4 border-t border-gray-700">
                  {/* Show separate subtotals by service type */}
                  {finalLaserTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Laser Cutting</span>
                      <span className="text-gray-200">₹ {laserSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {finalCadTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Sketch</span>
                      <span className="text-gray-200">₹ {cadSubtotal.toFixed(2)}</span>
                    </div>
                  )}

                  {appliedDiscount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Discount</span>
                      <span className="text-emerald-400">
                        -₹{appliedDiscount.amount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {appliedPoints > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-400">Loyalty Points</span>
                      <span className="text-purple-400">
                        -₹{appliedPoints.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Show tax breakdown by GST rate */}
                  {finalLaserTotal > 0 && finalCadTotal > 0 ? (
                    // Show both GST rates
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">GST @ 18% (Laser Cutting)</span>
                        <span className="text-gray-200">₹ {laserTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">GST @ 18% (CAD Services)</span>
                        <span className="text-gray-200">₹ {cadTax.toFixed(2)}</span>
                      </div>
                    </>
                  ) : finalLaserTotal > 0 ? (
                    // Only laser cutting items
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Taxes (18% GST)</span>
                      <span className="text-gray-200">₹ {taxAmount.toFixed(2)}</span>
                    </div>
                  ) : (
                    // Only CAD service items
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Taxes (18% GST)</span>
                      <span className="text-gray-200">₹ {taxAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shipping</span>
                    {isCalculatingShipping ? (
                      <span className="text-blue-400 text-xs flex items-center gap-1">
                        <span className="animate-pulse">●</span>
                        Calculating...
                      </span>
                    ) : address ? (
                      <span className="text-gray-200">
                        {shippingCost === 0 ? "Free" : `₹${shippingCost.toFixed(2)}`}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">Enter shipping address</span>
                    )}
                  </div>

                  <div className="flex justify-between pt-3 border-t border-gray-700">
                    <span className="text-gray-200">Total</span>
                    <div className="text-right">
                      <p className="text-gray-200 text-xl">
                        <span className="text-sm text-gray-400">INR  </span>
                        ₹ {total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pay Now Button - Desktop Only */}
              <div className="hidden lg:block">
                <p className="text-sm text-gray-400 mb-3 text-center">
                  You'll earn {Math.floor(total / 100)} loyalty points with this order
                </p>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={isProcessing || isLocalProcessing || isCalculatingShipping}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCalculatingShipping ? "Calculating shipping..." : (isProcessing || isLocalProcessing) ? "Processing..." : "Pay now"}
                </Button>
                <Button
                  onClick={onBack}
                  variant="ghost"
                  className="w-full mt-3 text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                  disabled={isProcessing || isLocalProcessing}
                >
                  Back to Summary
                </Button>
              </div>
            </div>
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