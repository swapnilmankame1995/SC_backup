/**
 * Shopping Cart Context
 * 
 * Manages cart state with localStorage persistence and automatic expiry.
 * Handles both laser cutting items (DXF files) and sketch service orders.
 * 
 * Features:
 * - localStorage persistence with 10-day expiration
 * - Debounced auto-save (500ms) to prevent excessive writes
 * - Cart size limit (50 items) to prevent storage issues
 * - Storage quota monitoring with warnings
 * - Quantity management for laser cutting items
 * - Graceful handling of QuotaExceededError
 * 
 * @module CartContext
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { toast } from 'sonner@2.0.3';
import { DXFData } from '../utils/dxf-parser';
import { calculateItemTotal } from '../utils/cartPricing';
import { getPricingConstants } from '../utils/pricing';

/**
 * Cart item interface supporting both laser cutting and sketch services
 */
export interface CartItem {
  id: string;                   // Unique cart item ID (auto-generated)
  fileName: string;             // Display name for the item
  material: {
    id: string;
    name: string;
    category: string;
  };
  thickness: number;            // Material thickness in mm
  price: number;                // Unit price in ₹ (Indian Rupees)
  calculatedTotal: number;      // Pre-calculated total with setup cost optimization
  dxfData: {
    width: number;              // Part width in mm
    height: number;             // Part height in mm
    cuttingLength: number;      // Total cutting path length in mm
  };
  filePath: string;             // Supabase storage path for DXF file
  file?: File;                  // Original file object (not persisted to localStorage)
  addedAt: number;              // Timestamp when item was added (for expiry tracking)
  quantity?: number;            // Quantity multiplier for laser cutting items (not for sketch service)
  isSketchService?: boolean;    // Flag to identify sketch service orders
  sketchFiles?: File[];         // Array of sketch files (not serializable, not persisted)
  sketchFilePaths?: string[];   // Supabase storage paths for sketch files
  sketchFileNames?: string[];   // Display names for sketch files
  color?: string | null;        // Selected colour for colour-enabled non-metal materials (e.g. "Red")
  colorHex?: string | null;     // Hex value of the selected colour (e.g. "#FF0000") for swatch display
}

/**
 * Cart context interface providing cart operations
 */
interface CartContextType {
  cartItems: CartItem[];                                               // All items in cart
  cartItemCount: number;                                               // Total number of items
  cartTotal: number;                                                   // Total price (₹) including quantities
  cartAnimationTrigger: number;                                        // Timestamp trigger for cart icon animation
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;       // Add item to cart
  removeFromCart: (itemId: string) => void;                           // Remove item by ID
  clearCart: () => void;                                               // Clear entire cart
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void; // Update item properties
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================================================
// CART CONFIGURATION CONSTANTS
// ============================================================================

/**
 * localStorage key for cart data
 */
const CART_STORAGE_KEY = 'sheetcutters_cart';

/**
 * localStorage key for cart expiry timestamp
 */
const CART_EXPIRY_KEY = 'sheetcutters_cart_expiry';

/**
 * Maximum items allowed in cart
 * 
 * Rationale:
 * - Average cart item size: ~50KB (includes metadata, DXF data, paths)
 * - 50 items × 50KB = ~2.5MB
 * - Well under typical 5MB localStorage limit
 * - Prevents performance issues with large cart renders
 * - Encourages checkout for bulk orders
 */
const CART_SIZE_LIMIT = 50;

/**
 * Storage size warning threshold (4.5MB)
 * 
 * Rationale:
 * - Typical browser localStorage limit: 5MB
 * - Warning at 4.5MB leaves 0.5MB safety buffer
 * - Prevents QuotaExceededError during normal operation
 * - Alerts users before cart becomes unmanageable
 */
const STORAGE_SIZE_WARNING = 4.5 * 1024 * 1024; // 4.5MB in bytes

/**
 * Cart expiration period (10 days)
 * 
 * Rationale:
 * - Balances user convenience vs. data freshness
 * - Material prices may change over time
 * - Prevents stale pricing from being ordered
 * - Long enough for users to complete multi-session quotes
 * - Shorter than typical abandoned cart recovery (14-30 days)
 */
const CART_EXPIRY_DAYS = 10;

/**
 * Debounce delay for localStorage saves (500ms)
 * 
 * Rationale:
 * - Prevents excessive writes during rapid cart updates
 * - Example: User quickly adjusts quantities for 10 items
 *   Without debounce: 10 writes
 *   With debounce: 1 write
 * - 500ms feels instant to users but saves resources
 * - Balance between responsiveness and efficiency
 */
const SAVE_DEBOUNCE_DELAY = 500;

/**
 * Cart Provider Component
 * 
 * Provides cart state and operations to entire application.
 * Automatically persists to localStorage with debouncing.
 * 
 * @param children - Child components that need cart access
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartAnimationTrigger, setCartAnimationTrigger] = useState<number>(0);
  const [setupCost, setSetupCost] = useState(100);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load setup cost from pricing constants on mount
   * Then reload cart to ensure migration with correct setupCost
   */
  useEffect(() => {
    const init = async () => {
      const constants = await getPricingConstants();
      setSetupCost(constants.setupCost);
      
      // Load cart from localStorage after setupCost is available
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        const expiry = localStorage.getItem(CART_EXPIRY_KEY);
        
        if (saved && expiry) {
          const items = JSON.parse(saved);
          const expiryDate = new Date(parseInt(expiry));
          const currentDate = new Date();

          // Check if cart has expired
          if (currentDate > expiryDate) {
            toast.info('Cart has expired. Starting with empty cart.');
            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(CART_EXPIRY_KEY);
            return;
          }

          // File objects can't be serialized to JSON, so they're always undefined after reload
          const restoredItems = items.map((item: any) => {
            const baseItem = {
              ...item,
              file: undefined,
              sketchFiles: undefined,
            };
            
            // Migration: Calculate total for old items that don't have calculatedTotal
            if (baseItem.calculatedTotal === undefined) {
              baseItem.calculatedTotal = calculateItemTotal({
                unitPrice: baseItem.price,
                quantity: baseItem.quantity || 1,
                isSketchService: baseItem.isSketchService,
              }, constants.setupCost);
            }
            
            return baseItem;
          });
          
          setCartItems(restoredItems);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        toast.error('Failed to load cart. Starting with empty cart.');
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(CART_EXPIRY_KEY);
      }
    };
    
    init();
  }, []);

  /**
   * Debounced save function to prevent excessive localStorage writes
   * 
   * How it works:
   * 1. Clear any pending save timeout
   * 2. Set new timeout for 500ms
   * 3. If another change happens within 500ms, reset timer
   * 4. Only saves after 500ms of no changes
   * 
   * @param items - Cart items to save
   */
  const debouncedSave = useCallback((items: CartItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveCartToLocalStorage(items);
    }, SAVE_DEBOUNCE_DELAY);
  }, []);

  /**
   * Auto-save cart whenever items change
   * - Non-empty carts: Debounced save
   * - Empty cart: Immediate clear (no need to debounce deletion)
   */
  useEffect(() => {
    if (cartItems.length > 0) {
      debouncedSave(cartItems);
    } else {
      clearCartFromLocalStorage();
    }
  }, [cartItems, debouncedSave]);

  /**
   * Save cart to localStorage
   * 
   * Features:
   * - Removes non-serializable File objects
   * - Monitors storage size and warns at threshold
   * - Handles QuotaExceededError gracefully
   * - Attempts minimal save (first 10 items) if quota exceeded
   * - Updates expiry timestamp on each save
   * 
   * @param items - Cart items to persist
   */
  const saveCartToLocalStorage = (items: CartItem[]) => {
    try {
      // Remove File objects (can't be serialized to JSON)
      const serializableItems = items.map(({ file, sketchFiles, ...rest }) => rest);
      const serialized = JSON.stringify(serializableItems);
      
      // Check serialized size
      const sizeInBytes = new Blob([serialized]).size;
      
      // Warn if approaching storage limit
      if (sizeInBytes > STORAGE_SIZE_WARNING) {
        toast.warning('Cart is getting large. Consider checking out soon.');
      }

      // Save to localStorage
      localStorage.setItem(CART_STORAGE_KEY, serialized);
      
      // Update expiry timestamp (extends expiry on each save)
      const expiryTimestamp = Date.now() + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      localStorage.setItem(CART_EXPIRY_KEY, expiryTimestamp.toString());
      
    } catch (error: any) {
      console.error('Error saving cart to localStorage:', error);
      
      // Handle storage quota exceeded error
      if (error.name === 'QuotaExceededError') {
        toast.error('Cart storage limit exceeded. Please remove some items or checkout.');
        
        // Attempt to save minimal version (first 10 items without DXF data)
        try {
          const minimalItems = items.slice(0, 10).map(({ file, sketchFiles, dxfData, ...rest }) => rest);
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimalItems));
          toast.info('Only first 10 items were saved due to storage limits.');
        } catch (e) {
          console.error('Failed to save minimal cart:', e);
          // At this point, localStorage is full and we can't save anything
        }
      } else {
        toast.error('Failed to save cart');
      }
    }
  };

  /**
   * Clear cart from localStorage
   * Removes both cart data and expiry timestamp
   */
  const clearCartFromLocalStorage = () => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_EXPIRY_KEY);
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  };

  /**
   * Generate unique cart item ID
   * 
   * Format: cart-{timestamp}-{random}
   * Example: cart-1702389847123-k3x9m2p4q
   * 
   * Collision probability: ~1 in 10 billion for same-millisecond additions
   * 
   * @returns Unique cart item ID
   */
  const generateCartItemId = () => {
    return `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Add item to cart
   * 
   * Features:
   * - Enforces cart size limit (50 items)
   * - Auto-generates unique ID and timestamp
   * - Sets default quantity (1) for laser cutting items
   * - Triggers cart icon animation
   * - Shows success toast (desktop only, to avoid mobile clutter)
   * 
   * @param item - Item to add (without id and addedAt, which are auto-generated)
   */
  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'addedAt'>) => {
    // Enforce cart size limit
    if (cartItems.length >= CART_SIZE_LIMIT) {
      toast.error(`Cart limit reached (${CART_SIZE_LIMIT} items). Please checkout or remove items.`);
      return;
    }

    const newItem: CartItem = {
      ...item,
      id: generateCartItemId(),
      addedAt: Date.now(),
      // Sketch service doesn't use quantity, laser cutting defaults to 1
      quantity: item.isSketchService ? undefined : (item.quantity || 1),
    };

    setCartItems(prev => [...prev, newItem]);
    setCartAnimationTrigger(Date.now()); // Trigger cart icon bounce animation

    // Show success toast only on desktop (mobile users see the cart icon bounce)
    if (window.innerWidth >= 768) {
      toast.success(item.isSketchService ? 'Files added to cart' : 'File added to cart');
    }
  }, [cartItems.length]);

  /**
   * Remove item from cart by ID
   * 
   * @param itemId - Unique cart item ID to remove
   */
  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  }, []);

  /**
   * Clear entire cart
   * Removes all items and clears localStorage immediately
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
    clearCartFromLocalStorage(); // Immediate clear, no debounce
    toast.success('Cart cleared');
  }, []);

  /**
   * Update specific cart item properties
   * 
   * Automatically recalculates total when quantity changes
   * 
   * Common use cases:
   * - Update quantity
   * - Change material/thickness (re-price)
   * - Add order notes
   * 
   * @param itemId - Cart item ID to update
   * @param updates - Partial cart item with properties to update
   */
  const updateCartItem = useCallback((itemId: string, updates: Partial<CartItem>) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item;
        
        const updatedItem = { ...item, ...updates };
        
        // Recalculate total if quantity changed
        if (updates.quantity !== undefined && updates.quantity !== item.quantity) {
          const newTotal = calculateItemTotal({
            unitPrice: item.price,
            quantity: updates.quantity,
            isSketchService: item.isSketchService,
          }, setupCost);
          
          updatedItem.calculatedTotal = newTotal;
        }
        
        return updatedItem;
      })
    );
  }, [setupCost]);

  /**
   * Calculate total cart item count
   */
  const cartItemCount = cartItems.length;
  
  /**
   * Calculate total cart value using pre-calculated totals
   */
  const cartTotal = cartItems.reduce((sum, item) => {
    return sum + (item.calculatedTotal || 0);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartItemCount,
        cartTotal,
        cartAnimationTrigger,
        addToCart,
        removeFromCart,
        clearCart,
        updateCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * Hook to access cart context
 * 
 * Must be used within CartProvider component tree.
 * Throws error if used outside provider.
 * 
 * @returns Cart context with state and operations
 * 
 * @example
 * function MyComponent() {
 *   const { cartItems, addToCart, cartTotal } = useCart();
 *   // ...
 * }
 */
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}