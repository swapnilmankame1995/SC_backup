/**
 * Analytics Utility
 * Loads and integrates Google Analytics & Facebook Pixel
 * Uses zero server resources - runs entirely client-side
 */

import { projectId, publicAnonKey } from './supabase/info';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}

// Declare global tracking functions
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

let isInitialized = false;

/**
 * Load external analytics scripts (GA & FB Pixel)
 * These run client-side and use ZERO server resources
 */
async function loadExternalAnalytics() {
  try {
    // Fetch analytics settings from backend with retry logic
    let retries = 3;
    let response = null;
    
    while (retries > 0) {
      try {
        response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/analytics-settings`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        break; // Success, exit retry loop
      } catch (fetchError) {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw fetchError;
        }
      }
    }

    if (!response || !response.ok) return;

    const data = await response.json();
    if (!data.success || !data.settings) return;

    const { googleAnalytics, facebookPixel } = data.settings;

    // Load Google Analytics if enabled
    if (googleAnalytics?.enabled && googleAnalytics?.measurementId) {
      loadGoogleAnalytics(googleAnalytics.measurementId);
    }

    // Load Facebook Pixel if enabled
    if (facebookPixel?.enabled && facebookPixel?.pixelId) {
      loadFacebookPixel(facebookPixel.pixelId);
    }
  } catch (error) {
    console.debug('Analytics loading error:', error);
  }
}

/**
 * Load Google Analytics 4
 * FREE - Uses Google's servers, not yours
 */
function loadGoogleAnalytics(measurementId: string) {
  // Prevent duplicate loading
  if (window.gtag) return;

  console.log('📊 Loading Google Analytics:', measurementId);

  // Create script element
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });
}

/**
 * Load Facebook Pixel
 * FREE - Uses Facebook's servers, not yours
 */
function loadFacebookPixel(pixelId: string) {
  // Prevent duplicate loading
  if (window.fbq) return;

  console.log('📊 Loading Facebook Pixel:', pixelId);

  // Facebook Pixel initialization code
  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js'
  );

  window.fbq!('init', pixelId);
  window.fbq!('track', 'PageView');
}

/**
 * Track custom events
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  const event: AnalyticsEvent = {
    event: eventName,
    properties,
    timestamp: new Date().toISOString(),
  };

  console.log('📊 ANALYTICS:', event);

  // Send to Google Analytics if available
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }

  // Send to Facebook Pixel if available (map common events)
  if (window.fbq) {
    const fbEventMap: { [key: string]: string } = {
      'added_to_cart': 'AddToCart',
      'checkout_initiated': 'InitiateCheckout',
      'purchase_completed': 'Purchase',
      'user_signup': 'CompleteRegistration',
      'page_view': 'PageView'
    };

    const fbEvent = fbEventMap[eventName];
    if (fbEvent) {
      window.fbq('track', fbEvent, properties);
    } else {
      window.fbq('trackCustom', eventName, properties);
    }
  }
}

// Common events for SheetCutters
export const Analytics = {
  /**
   * Initialize analytics
   * Loads Google Analytics & Facebook Pixel (if configured in admin)
   * Uses ZERO server resources - runs entirely in browser
   */
  initialize: async () => {
    if (isInitialized) return;
    isInitialized = true;

    console.log('📊 Analytics initializing...');
    await loadExternalAnalytics();
  },

  // User events
  userSignUp: (method: string) => trackEvent('user_signup', { method }),
  userLogin: (method: string) => trackEvent('user_login', { method }),
  userLogout: () => trackEvent('user_logout'),

  // File upload events
  fileUploaded: (fileType: string, fileSize: number) => 
    trackEvent('file_uploaded', { fileType, fileSize }),
  fileValidationError: (errorType: string) => 
    trackEvent('file_validation_error', { errorType }),

  // Order events
  orderCreated: (orderId: string, amount: number, itemCount: number) => 
    trackEvent('order_created', { orderId, amount, itemCount }),
  orderPaid: (orderId: string, amount: number, paymentMethod: string) => {
    trackEvent('order_paid', { orderId, amount, paymentMethod });
    // Also send as purchase to FB/GA
    if (window.fbq) {
      window.fbq('track', 'Purchase', { 
        value: amount, 
        currency: 'INR',
        content_ids: [orderId]
      });
    }
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: amount,
        currency: 'INR'
      });
    }
  },
  orderCancelled: (orderId: string, reason?: string) => 
    trackEvent('order_cancelled', { orderId, reason }),

  // Cart events
  addedToCart: (itemId: string, material: string, quantity: number) => {
    trackEvent('added_to_cart', { itemId, material, quantity });
  },
  removedFromCart: (itemId: string) => 
    trackEvent('removed_from_cart', { itemId }),
  cartCheckout: (itemCount: number, totalAmount: number) => {
    trackEvent('cart_checkout', { itemCount, totalAmount });
    // Also track as InitiateCheckout
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: totalAmount,
        currency: 'INR',
        num_items: itemCount
      });
    }
  },

  // Aliases for compatibility
  trackAddToCart: (itemName: string, price: number, material: string) => {
    trackEvent('added_to_cart', { itemName, price, material });
    if (window.fbq) {
      window.fbq('track', 'AddToCart', {
        value: price,
        currency: 'INR',
        content_name: itemName
      });
    }
  },
  trackInitiateCheckout: (totalAmount: number, itemCount: number) => {
    trackEvent('checkout_initiated', { totalAmount, itemCount });
    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: totalAmount,
        currency: 'INR',
        num_items: itemCount
      });
    }
  },
  trackPurchase: (orderId: string, amount: number, material: string) => {
    trackEvent('purchase_completed', { orderId, amount, material });
    if (window.fbq) {
      window.fbq('track', 'Purchase', {
        value: amount,
        currency: 'INR',
        content_ids: [orderId]
      });
    }
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: amount,
        currency: 'INR'
      });
    }
  },

  // Material selection
  materialSelected: (materialName: string, thickness: number) => 
    trackEvent('material_selected', { materialName, thickness }),

  // Page views
  pageView: (pageName: string) => {
    trackEvent('page_view', { pageName });
    if (window.gtag) {
      window.gtag('event', 'page_view', { page_path: pageName });
    }
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  },

  // Errors (for tracking user-facing errors)
  error: (errorMessage: string, errorType: string) => 
    trackEvent('error_occurred', { errorMessage, errorType }),
};