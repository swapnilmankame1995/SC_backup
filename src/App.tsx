import { useEffect, useState, lazy, Suspense, startTransition } from 'react';
import { toast, Toaster } from 'sonner@2.0.3';
import { Analytics } from './utils/analytics';
import { apiCall, uploadDXF, setOutageTrigger } from './utils/api';
import { initializeSessionTracking } from './utils/sessionTracking';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart, CartItem } from './contexts/CartContext';
import { OrderProvider, useOrder } from './contexts/OrderContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { SupportProvider } from './contexts/SupportContext';
import { ServerOutageProvider, useServerOutage } from './contexts/ServerOutageContext';

// Critical Components (loaded immediately)
import { LandingPage } from './components/LandingPage';
import { StepIndicator } from './components/StepIndicator';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ServerOutageNotification } from './components/ServerOutageNotification';
import { PaymentVerificationOverlay } from './components/PaymentVerificationOverlay';
import { Preloader } from './components/Preloader';
import { DXFData } from './utils/dxf-parser';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { calculateItemTotal } from './utils/cartPricing';
import { getPricingConstants } from './utils/pricing';

// Lazy-loaded Components (code splitting for better performance)
const FinalScreen = lazy(() => import('./components/FinalScreen').then(m => ({ default: m.FinalScreen })));
const OrdersScreen = lazy(() => import('./components/OrdersScreen').then(m => ({ default: m.OrdersScreen })));
const UploadScreen = lazy(() => import('./components/UploadScreen').then(m => ({ default: m.UploadScreen })));
const MaterialScreen = lazy(() => import('./components/MaterialScreen').then(m => ({ default: m.MaterialScreen })));
const ThicknessScreen = lazy(() => import('./components/ThicknessScreen').then(m => ({ default: m.ThicknessScreen })));
const SummaryScreen = lazy(() => import('./components/SummaryScreen').then(m => ({ default: m.SummaryScreen })));
const CheckoutScreen = lazy(() => import('./components/CheckoutScreen').then(m => ({ default: m.CheckoutScreen })));
const CartScreen = lazy(() => import('./components/CartScreen').then(m => ({ default: m.CartScreen })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ServiceSelectionScreen = lazy(() => import('./components/ServiceSelectionScreen').then(m => ({ default: m.ServiceSelectionScreen })));
const SketchChecklistScreen = lazy(() => import('./components/SketchChecklistScreen').then(m => ({ default: m.SketchChecklistScreen })));
const SketchUploadScreen = lazy(() => import('./components/SketchUploadScreen').then(m => ({ default: m.SketchUploadScreen })));
const UserDashboard = lazy(() => import('./components/UserDashboard').then(m => ({ default: m.UserDashboard })));
const UploadProgressScreen = lazy(() => import('./components/UploadProgressScreen').then(m => ({ default: m.UploadProgressScreen })));
const NotFoundPage = lazy(() => import('./components/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-white text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#dc0000] mx-auto mb-4"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

const STEPS = ['Upload', 'Material', 'Thickness', 'Summary', 'Checkout', 'Complete'];

interface Material {
  id: string;
  name: string;
  category: string;
  pricing: {
    thickness: number;
    pricePerMm: number;
  }[];
  density?: number; // kg per cubic meter
  colors_enabled?: boolean;
  colors?: Array<{ name: string; hex: string }>;
}

// Main App Component (now using contexts)
function AppContent() {
  const { user, logout, refreshUser, verifyAuth } = useAuth();
  const { cartItems, cartItemCount, cartTotal, cartAnimationTrigger, addToCart, clearCart } = useCart();
  const { 
    file, fileName, filePath, dxfData, selectedMaterial, selectedThickness, selectedColor, price, orderNotes, orderId,
    sketchFiles, isSketchWorkflow,
    setFile, setFileName, setFilePath, setDxfData, setSelectedMaterial, setSelectedThickness, setSelectedColor,
    setPrice, setOrderNotes, setOrderId, setSketchFiles, setIsSketchWorkflow, resetOrder
  } = useOrder();
  const { currentScreen, currentStep, isCartCheckout, setCurrentScreen, setCurrentStep, setIsCartCheckout } = useNavigation();
  const { showOutageNotification, triggerOutageNotification, dismissOutageNotification } = useServerOutage();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(() => {
    // Check for recovery flow immediately on component mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      return hash && hash.includes('type=recovery');
    }
    return false;
  });
  const [showPaymentVerificationOverlay, setShowPaymentVerificationOverlay] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1); // Quantity for single item orders
  const [setupCost, setSetupCost] = useState(100); // Setup cost from pricing constants
  const [uploadProgress, setUploadProgress] = useState({
    filesCount: 0,
    currentFileIndex: 0,
    currentFileName: '',
    isComplete: false,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const [isLoading, setIsLoading] = useState(() => {
    // Skip preloader if we're in password recovery flow
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        return false;
      }
    }
    return true;
  });

  // Initialize analytics and session tracking on mount
  useEffect(() => {
    Analytics.initialize();
    initializeSessionTracking();
    
    // Load Google Fonts dynamically for production reliability
    // Using dynamic link injection instead of CSS @import for better production compatibility
    const loadGoogleFonts = () => {
      // Check if fonts are already loaded to prevent duplicates
      const existingLink = document.querySelector('link[href*="fonts.googleapis.com"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@300;600;700&family=Roboto:wght@400;500;600;700&display=swap';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    };
    loadGoogleFonts();
    
    // Set up server outage notification trigger
    setOutageTrigger(triggerOutageNotification);
    
    // Fetch setup cost from pricing constants
    const fetchSetupCost = async () => {
      const constants = await getPricingConstants();
      setSetupCost(constants.setupCost);
    };
    fetchSetupCost();
    
    // Force www subdomain redirect
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // If on production (sheetcutters.com) and not using www, redirect to www
      if (hostname === 'sheetcutters.com') {
        const newUrl = window.location.href.replace('sheetcutters.com', 'www.sheetcutters.com');
        window.location.replace(newUrl);
        return;
      }
    }
  }, [triggerOutageNotification]);

  // Handle URL parameters for deep linking (e.g., from email links)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const screen = urlParams.get('screen');
    const refCode = urlParams.get('ref');
    
    console.log('🔍 URL Detection - Full URL:', window.location.href);
    console.log('🔍 URL Detection - Search params:', window.location.search);
    console.log('🔍 URL Detection - Ref code found:', refCode);
    
    // Handle referral code from URL (e.g., ?ref=AFFILIATE10)
    if (refCode) {
      console.log('🔗 Affiliate referral detected:', refCode);
      localStorage.setItem('referralCode', refCode);
      toast.info(`Referral code "${refCode}" will be applied at checkout!`, {
        duration: 5000,
      });
      
      // Log referral for analytics (custom event tracking not available in Analytics module)
      console.log('📊 Affiliate referral tracked:', refCode);
    } else {
      console.log('ℹ️ No referral code found in URL');
    }
    
    // Handle query parameter-based routing (e.g., ?screen=dashboard)
    if (screen === 'dashboard') {
      startTransition(() => {
        setCurrentScreen('dashboard');
      });
      // Clean up URL without page reload
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Handle path-based routing (e.g., /dashboard)
    const pathname = window.location.pathname;
    if (pathname === '/dashboard') {
      startTransition(() => {
        setCurrentScreen('dashboard');
      });
      // Clean up URL to root path without page reload
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Handle password recovery flow from email link
  useEffect(() => {
    const hash = window.location.hash;
    
    if (hash && hash.includes('type=recovery')) {
      // Extract tokens from hash
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // Store tokens temporarily for password update
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        // Show reset password modal immediately (before preloader finishes)
        setShowResetPasswordModal(true);
        
        // Skip preloader for password reset flow
        setIsLoading(false);
        
        // Clean URL (remove hash)
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    resetOrder();
    startTransition(() => {
      setCurrentScreen('landing');
      setCurrentStep(0);
    });
  };

  const handleResetOrder = () => {
    resetOrder();
    // Clear payment status for new order
    sessionStorage.removeItem('orderPaymentStatus');
    startTransition(() => {
      setCurrentScreen('landing');
      setCurrentStep(0);
    });
  };

  const handleGetStarted = () => {
    startTransition(() => {
      setCurrentScreen('service-selection');
      setCurrentStep(0);
    });
  };

  const handleServiceSelection = (serviceType: 'dxf' | 'sketch') => {
    startTransition(() => {
      if (serviceType === 'dxf') {
        setCurrentScreen('upload');
        setCurrentStep(0);
        setIsSketchWorkflow(false);
      } else {
        setCurrentScreen('sketch-checklist');
        setCurrentStep(0);
        setIsSketchWorkflow(true);
      }
    });
  };

  const handleShowLogin = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = async (userData: any) => {
    setShowAuthModal(false);
    // Refresh user state in AuthContext
    await refreshUser();
    if (currentScreen === 'summary') {
      toast.success('Login successful! You can now complete your order.');
    } else if (currentScreen === 'landing' || currentScreen === 'auth') {
      startTransition(() => {
        setCurrentScreen('upload');
        setCurrentStep(0);
      });
    }
  };

  const handleReorderFile = async (filePathToReorder: string, fileNameToReorder: string, material: string, thickness: number, dxfDataToReorder: DXFData | null) => {
    try {
      toast.info('Loading your file for reorder...');
      
      setFilePath(filePathToReorder);
      setFileName(fileNameToReorder);
      setDxfData(dxfDataToReorder);
      setSelectedMaterial(null);
      setSelectedThickness(null);
      setPrice(0);
      
      startTransition(() => {
        setCurrentScreen('material');
        setCurrentStep(1);
      });
      toast.success('File loaded! Select your material and thickness.');
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to load file for reorder');
    }
  };

  const handleViewOrders = () => {
    startTransition(() => {
      setCurrentScreen('dashboard');
    });
  };

  const handleFileUpload = (uploadedFile: File, uploadedFilePath: string, uploadedFileName: string, uploadedDxfData: DXFData) => {
    setFile(uploadedFile);
    setFilePath(uploadedFilePath);
    setFileName(uploadedFileName);
    setDxfData(uploadedDxfData);
    startTransition(() => {
      setCurrentScreen('material');
      setCurrentStep(1);
    });
  };

  const handleSketchFilesUploaded = (files: File[], paths: string[], names: string[]) => {
    setSketchFiles(files);
    startTransition(() => {
      setCurrentScreen('summary');
      setCurrentStep(3);
    });
  };

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material);
    startTransition(() => {
      setCurrentScreen('thickness');
      setCurrentStep(2);
    });
  };

  const handleThicknessSelect = (thickness: number, calculatedPrice: number, color?: string) => {
    setSelectedThickness(thickness);
    setPrice(calculatedPrice);
    setSelectedColor(color || null);
    startTransition(() => {
      setCurrentScreen('summary');
      setCurrentStep(3);
    });
  };

  const handleAddToCart = (quantity?: number) => {
    if (isSketchWorkflow) {
      // Sketch service workflow
      const sketchPrice = 150; // Fixed price for sketch service
      const calculatedTotal = calculateItemTotal({
        unitPrice: sketchPrice,
        quantity: 1,
        isSketchService: true,
      }, setupCost);
      
      const cartItem = {
        fileName: `Sketch Service (${sketchFiles.length} files)`,
        material: { id: 'sketch', name: 'Sketch Service', category: 'service' },
        thickness: 0,
        price: sketchPrice,
        calculatedTotal,
        dxfData: { width: 0, height: 0, cuttingLength: 0 },
        filePath: '',
        isSketchService: true,
        sketchFiles: sketchFiles, // Store actual File objects
        sketchFilePaths: sketchFiles.map((_, i) => `sketch-${i}`), // Placeholder paths (will be replaced during checkout)
        sketchFileNames: sketchFiles.map(f => f.name),
      };
      addToCart(cartItem);
      Analytics.trackAddToCart(cartItem.fileName, calculatedTotal, 'Sketch Service');
    } else {
      // DXF workflow
      if (!selectedMaterial || !dxfData) return;
      
      const itemQuantity = quantity || 1;
      const calculatedTotal = calculateItemTotal({
        unitPrice: price,
        quantity: itemQuantity,
        isSketchService: false,
      }, setupCost);
      
      const cartItem = {
        fileName,
        material: {
          id: selectedMaterial.id,
          name: selectedMaterial.name,
          category: selectedMaterial.category,
          density: selectedMaterial.density, // Include density for weight calculations
        },
        thickness: selectedThickness || 0,
        price,
        calculatedTotal,
        quantity: itemQuantity,
        dxfData: {
          width: dxfData.width,
          height: dxfData.height,
          cuttingLength: dxfData.cuttingLength,
        },
        filePath,
        file,
        color: selectedColor || undefined,  // Colour selection for non-metal materials
        colorHex: (selectedColor && selectedMaterial?.colors?.find(c => c.name === selectedColor)?.hex) || undefined,
      };
      addToCart(cartItem);
      Analytics.trackAddToCart(fileName, calculatedTotal, selectedMaterial.name);
    }
    
    resetOrder();
    setOrderQuantity(1); // Reset quantity for next order
    startTransition(() => {
      setCurrentScreen('service-selection');
      setCurrentStep(0);
    });
  };

  const handleProceedToCheckout = (quantity?: number) => {
    if (!user) {
      toast.error('Please login to place an order');
      setShowAuthModal(true);
      return;
    }

    if (isSketchWorkflow) {
      startTransition(() => {
        setCurrentScreen('checkout');
        setCurrentStep(4);
      });
    } else {
      if (!selectedMaterial || !selectedThickness) {
        toast.error('Please select material and thickness');
        return;
      }
      // Store quantity for single item checkout
      setOrderQuantity(quantity || 1);
      startTransition(() => {
        setCurrentScreen('checkout');
        setCurrentStep(4);
      });
    }
  };

  // ==============================================
  // PAYMENT GATEWAY INTEGRATION
  // ==============================================

  /**
   * Load Razorpay SDK dynamically
   * Returns a promise that resolves when the SDK is loaded
   */
  const loadRazorpaySDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as any).Razorpay) {
        resolve();
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  };

  /**
   * Process payment through Razorpay/PayU
   * Returns payment ID on success
   */
  const processPayment = async (
    finalAmount: number,
    gateway: string,
    deliveryInfo: any
  ): Promise<string> => {
    console.log(`💳 Creating ${gateway} payment for ₹${finalAmount}`);

    // Step 1: Create payment order on server
    const paymentOrderResult = await apiCall('/create-payment-order', {
      method: 'POST',
      body: JSON.stringify({
        amount: finalAmount,
        currency: 'INR',
        gateway: gateway.toLowerCase(),
        receipt: `order_${Date.now()}`
      })
    });

    if (!paymentOrderResult.success) {
      throw new Error(paymentOrderResult.error || 'Failed to create payment order');
    }

    // Step 2: Process payment based on gateway
    if (gateway.toLowerCase() === 'razorpay') {
      return await processRazorpayPayment(paymentOrderResult, finalAmount, deliveryInfo);
    } else if (gateway.toLowerCase() === 'payu') {
      return await processPayUPayment(paymentOrderResult, finalAmount, deliveryInfo);
    } else {
      throw new Error('Invalid payment gateway');
    }
  };

  /**
   * Process Razorpay payment
   * Opens Razorpay modal and handles payment flow
   */
  const processRazorpayPayment = async (
    paymentOrderData: any,
    amount: number,
    deliveryInfo: any
  ): Promise<string> => {
    // Load Razorpay SDK if not already loaded
    await loadRazorpaySDK();

    return new Promise((resolve, reject) => {
      // Guard flag to prevent double-settling the promise
      // This handles race conditions where both success and failure events fire
      let isSettled = false;
      
      const options = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount, // Amount in paise
        currency: paymentOrderData.currency,
        name: 'Sheetcutters.com',
        description: 'Laser Cutting Service',
        image: '/favicon.ico', // Your logo
        order_id: paymentOrderData.orderId,
        handler: async (response: any) => {
          try {
            console.log('🔐 Verifying payment...', response);

            // Verify payment signature on server
            const verifyResult = await apiCall('/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                gateway: 'razorpay',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (!verifyResult.success || !verifyResult.verified) {
              throw new Error('Payment verification failed');
            }

            console.log('✅ Payment verified!', verifyResult.paymentId);
            toast.success('Payment successful!');
            
            // Only resolve if not already settled
            if (!isSettled) {
              isSettled = true;
              resolve(verifyResult.paymentId);
            }

          } catch (error: any) {
            console.error('Payment verification error:', error);
            setShowPaymentVerificationOverlay(false);
            
            // Only reject if not already settled
            if (!isSettled) {
              isSettled = true;
              reject(error);
            }
          }
        },
        prefill: {
          name: `${deliveryInfo.firstName || ''} ${deliveryInfo.lastName || ''}`.trim(),
          email: user?.email || '',
          contact: deliveryInfo.phone || ''
        },
        notes: {
          service: 'Laser Cutting',
          platform: 'Sheetcutters.com'
        },
        theme: {
          color: '#dc0000', // Brand red
          backdrop_color: 'rgba(0, 0, 0, 0.8)'
        },
        modal: {
          ondismiss: () => {
            // Only reject if not already settled (payment might have succeeded)
            if (!isSettled) {
              isSettled = true;
              setShowPaymentVerificationOverlay(false);
              reject(new Error('Payment cancelled by user'));
            }
          },
          escape: true,
          animation: true,
          confirm_close: true // Ask before closing
        }
      };

      const rzp = new (window as any).Razorpay(options);
      
      // Handle payment failure - but don't immediately reject
      // Sometimes Razorpay fires this event even when payment succeeds due to
      // internal errors, network issues, or race conditions
      rzp.on('payment.failed', (response: any) => {
        console.error('⚠️ Razorpay payment.failed event fired:', response.error);
        
        // Wait a bit to see if the success handler also fires
        // This handles the race condition where Razorpay has internal errors
        // but the payment actually succeeds on their backend
        setTimeout(() => {
          if (!isSettled) {
            console.error('❌ Payment truly failed after timeout');
            isSettled = true;
            setShowPaymentVerificationOverlay(false);
            reject(new Error(response.error.description || 'Payment failed'));
          } else {
            console.log('ℹ️ Payment.failed event ignored - payment was already verified successfully');
          }
        }, 3000); // Wait 3 seconds for success handler to complete verification
      });

      // Open payment modal
      rzp.open();
    });
  };

  /**
   * Process PayU payment
   * Creates payment form and submits to PayU
   */
  const processPayUPayment = async (
    paymentOrderData: any,
    amount: number,
    deliveryInfo: any
  ): Promise<string> => {
    console.log('💳 Processing PayU payment...', paymentOrderData);

    return new Promise(async (resolve, reject) => {
      try {
        // Generate payment hash on server
        const hashResult = await apiCall('/generate-payu-hash', {
          method: 'POST',
          body: JSON.stringify({
            txnid: paymentOrderData.txnid,
            amount: amount,
            productInfo: paymentOrderData.productInfo,
            firstName: deliveryInfo.firstName || paymentOrderData.firstName,
            email: user?.email || paymentOrderData.email,
            phone: deliveryInfo.phone || ''
          })
        });

        if (!hashResult.success) {
          throw new Error('Failed to generate payment hash');
        }

        // Create form and submit to PayU
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://secure.payu.in/_payment'; // Use test.payu.in for testing
        form.style.display = 'none';

        const formData = {
          key: paymentOrderData.merchantId,
          txnid: paymentOrderData.txnid,
          amount: amount.toString(),
          productinfo: paymentOrderData.productInfo,
          firstname: deliveryInfo.firstName || paymentOrderData.firstName,
          email: user?.email || paymentOrderData.email,
          phone: deliveryInfo.phone || '',
          surl: `${window.location.origin}/payment-success`,  // Success URL
          furl: `${window.location.origin}/payment-failure`,  // Failure URL
          hash: hashResult.hash
        };

        // Add form fields
        Object.entries(formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        // Add form to page and submit
        document.body.appendChild(form);
        
        // Note: PayU will redirect to success/failure URL
        // For now, we'll use a simplified approach
        toast.info('Redirecting to PayU payment gateway...');
        
        // In production, you'd submit the form
        // form.submit();
        
        // For now, simulate PayU response (in production, this would come from PayU redirect)
        setTimeout(() => {
          // Clean up form
          document.body.removeChild(form);
          
          // In production, payment verification would happen on the success/failure page
          // For now, return txnid as payment ID
          resolve(paymentOrderData.txnid);
        }, 2000);

      } catch (error: any) {
        console.error('PayU payment error:', error);
        setShowPaymentVerificationOverlay(false);
        reject(error);
      }
    });
  };

  const handlePlaceOrder = async (paymentMethod: string, discountCode: string | undefined, deliveryInfo: any, pointsUsed: number = 0, shippingCost: number = 0, shippingCarrier?: string, totalWeight?: number) => {
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    // Verify authentication is still valid before placing order
    if (!verifyAuth()) {
      toast.error('Your session has expired. Please log in again.');
      setShowAuthModal(true);
      return;
    }

    try {
      // ============================================
      // STEP 1: PROCESS PAYMENT FIRST! 💳
      // ============================================
      
      // Show payment verification overlay in background
      // It will be visible after Razorpay modal closes
      setShowPaymentVerificationOverlay(true);
      
      // Get final amount from CheckoutScreen's calculation
      const pricingData = JSON.parse(sessionStorage.getItem('orderPricing') || '{}');
      const finalAmount = pricingData.total || price;

      console.log(`💰 Final amount to charge: ₹${finalAmount}`);

      // Process payment through Razorpay/PayU
      let paymentId: string;
      try {
        paymentId = await processPayment(finalAmount, paymentMethod, deliveryInfo);
        console.log('✅ Payment successful! Payment ID:', paymentId);
        
        // CRITICAL: Store payment info immediately for recovery if order creation fails
        sessionStorage.setItem('orderPaymentStatus', 'paid');
        sessionStorage.setItem('lastPaymentId', paymentId);
        sessionStorage.setItem('lastPaymentAmount', finalAmount.toString());
        sessionStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
      } catch (paymentError: any) {
        // ============================================
        // COMPREHENSIVE PAYMENT ERROR HANDLING
        // ============================================
        
        // Hide payment verification overlay on any error
        setShowPaymentVerificationOverlay(false);
        
        // Determine error type and show appropriate message
        const errorMessage = paymentError.message || '';
        
        // Use appropriate logging level based on error type
        if (errorMessage.includes('cancelled by user')) {
          console.log('ℹ️ Payment cancelled by user (expected behavior)');
        } else {
          console.error('❌ Payment error:', paymentError);
        }
        
        if (errorMessage.includes('cancelled by user')) {
          toast.error('Payment cancelled. You can try again when ready.', {
            duration: 4000,
            icon: 'ℹ️'
          });
        } else if (errorMessage.includes('Failed to load') || errorMessage.includes('SDK')) {
          toast.error('Failed to load payment gateway. Please check your internet connection and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('verification failed')) {
          toast.error('Payment verification failed. If money was deducted, please contact support.', {
            duration: 6000
          });
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          toast.error('Payment request timed out. Please check your connection and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          toast.error('Network error. Please check your internet connection.', {
            duration: 5000
          });
        } else if (errorMessage.includes('Invalid amount')) {
          toast.error('Invalid payment amount. Please refresh and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('not configured') || errorMessage.includes('credentials')) {
          toast.error('Payment gateway is not properly configured. Please contact support.', {
            duration: 6000
          });
        } else {
          // Generic error message with the actual error
          toast.error(`Payment failed: ${errorMessage || 'Unknown error'}. Please try again or contact support.`, {
            duration: 6000
          });
        }
        
        // Log detailed error for debugging (only for non-cancellation errors)
        if (!errorMessage.includes('cancelled by user')) {
          console.log('📋 Payment error details:', {
            message: errorMessage,
            gateway: paymentMethod,
            amount: finalAmount,
            timestamp: new Date().toISOString()
          });
        }
        
        // Re-throw the error so CheckoutScreen's catch block can reset button state
        throw paymentError;
      }

      // ============================================
      // STEP 2: PAYMENT SUCCESSFUL - CREATE ORDER
      // ============================================

      // Hide payment verification overlay before showing upload screen
      setShowPaymentVerificationOverlay(false);

      setIsUploading(true);
      
      // Validate token with server before starting upload
      console.log('Validating authentication before order placement...');
      try {
        await refreshUser();
        console.log('Authentication validated successfully');
      } catch (error) {
        // Token is invalid - refreshUser already cleared it
        console.log('Authentication validation failed - token expired');
        setIsUploading(false);
        toast.error('Your session has expired. Please log in again.');
        setShowAuthModal(true);
        return;
      }

      if (isSketchWorkflow) {
        // Sketch service order
        setUploadProgress({
          filesCount: sketchFiles.length,
          currentFileIndex: 0,
          currentFileName: sketchFiles[0]?.name || '',
          isComplete: false,
        });

        console.log('📦 Preparing sketch order with deliveryInfo:', deliveryInfo);
        
        const formData = new FormData();
        sketchFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('deliveryInfo', JSON.stringify(deliveryInfo));
        formData.append('paymentId', paymentId); // ✅ Include payment ID
        formData.append('paymentMethod', paymentMethod);
        console.log(' Delivery info string:', JSON.stringify(deliveryInfo));
        
        if (orderNotes) {
          formData.append('notes', orderNotes);
        }
        if (discountCode) {
          formData.append('discountCode', discountCode);
        }

        // Simulate upload progress for sketch files
        for (let i = 0; i < sketchFiles.length; i++) {
          setUploadProgress({
            filesCount: sketchFiles.length,
            currentFileIndex: i + 1,
            currentFileName: sketchFiles[i].name,
            isComplete: false,
          });
          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const response = await fetch(
          `https://${await import('./utils/supabase/info').then(m => m.projectId)}.supabase.co/functions/v1/make-server-8927474f/create-sketch-order`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: formData,
          }
        );

        const result = await response.json();
        console.log('📦 Sketch order server response:', result);
        
        if (!result.success) {
          console.log('❌ Server returned error:', result.error);
          throw new Error(result.error);
        }

        setUploadProgress(prev => ({ ...prev, isComplete: true }));
        await new Promise(resolve => setTimeout(resolve, 500));

        setOrderId(result.orderId);
        Analytics.trackPurchase(result.orderId, 0, 'Sketch Service');
        
      } else {
        // DXF order - upload file first, then create order
        let uploadedFilePath = filePath;
        
        // Only upload if we have a file and no filePath yet
        if (file && !filePath) {
          setUploadProgress({
            filesCount: 1,
            currentFileIndex: 1,
            currentFileName: fileName,
            isComplete: false,
          });

          try {
            const uploadResult = await uploadDXF(file);
            
            if (!uploadResult.success) {
              throw new Error(uploadResult.error || 'File upload failed');
            }
            
            uploadedFilePath = uploadResult.filePath;
            setFilePath(uploadedFilePath); // Update state for potential reuse
            
            setUploadProgress(prev => ({ ...prev, isComplete: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (uploadError: any) {
            // If it's a JWT error, throw a specific message
            if (uploadError.message?.includes('Invalid JWT')) {
              throw new Error('Unauthorized: Invalid JWT');
            }
            throw uploadError;
          }
        }
        
        const orderData = {
          orders: [{
            fileName,
            filePath: uploadedFilePath,
            material: selectedMaterial,
            thickness: selectedThickness,
            price,
            quantity: orderQuantity,
            dxfData,
            isSketchService: false,
            color: selectedColor || null,   // Colour selection for non-metal materials
          }],
          deliveryInfo,
          paymentMethod,
          discountCode,
          discountAmount: pricingData.discountAmount || 0, // ✅ ADD: Send discount amount
          pointsUsed,
          notes: orderNotes || '',
          shippingCost,
          shippingCarrier,
          totalWeight: totalWeight || 0,
          // Payment transaction details
          paymentId: paymentId,
          paymentStatus: 'paid',
          paymentGateway: paymentMethod.toLowerCase(),
          paymentAmount: finalAmount,
        };

        const result = await apiCall('/orders/batch', {
          method: 'POST',
          body: JSON.stringify(orderData),
        });

        if (!result.success) {
          // CRITICAL: Payment succeeded but order creation failed
          console.error('🚨 CRITICAL: Payment succeeded but order creation failed!');
          console.error('Payment ID:', paymentId);
          console.error('Amount charged:', finalAmount);
          console.error('Order error:', result.error);
          
          // Store failure info for support
          sessionStorage.setItem('failedOrderPaymentId', paymentId);
          sessionStorage.setItem('failedOrderError', result.error || 'Unknown error');
          
          throw new Error(`Order creation failed: ${result.error}. Payment ID: ${paymentId}. Please contact support immediately.`);
        }

        // For single orders, the batch endpoint returns batchId
        setOrderId(result.batchId || result.orderId);
        
        // Price already includes all costs from the pricing formula
        const finalTotal = price * orderQuantity;
        setPrice(finalTotal);
        
        Analytics.trackPurchase(result.batchId || result.orderId, finalTotal, selectedMaterial?.name || 'Unknown');
      }

      // Clear referral code from localStorage after successful order
      localStorage.removeItem('referralCode');

      startTransition(() => {
        setCurrentScreen('final');
        setCurrentStep(5);
      });
      setOrderQuantity(1); // Reset quantity for next order
      toast.success('Order placed successfully!');
    } catch (error: any) {
      console.error('❌ Order placement error:', error);
      
      // If this is a payment error, re-throw it so CheckoutScreen can handle button reset
      // Payment errors are already handled with toasts in the inner catch block
      if (error.message?.includes('cancelled by user') || 
          error.message?.includes('Payment') ||
          error.message?.includes('verification failed') ||
          error.message?.includes('SDK') ||
          error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.message?.includes('not configured')) {
        console.log('🔄 Re-throwing payment error to CheckoutScreen');
        throw error; // Re-throw to CheckoutScreen
      }
      
      // Handle session expiration
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid JWT')) {
        localStorage.removeItem('access_token');
        toast.error('Your session has expired. Please log in again.');
        setShowAuthModal(true);
      } else {
        // Only show toast for non-payment errors (payment errors already showed toast)
        toast.error(error.message || 'Failed to place order');
      }
    } finally {
      setIsUploading(false);
      setShowPaymentVerificationOverlay(false);
      setUploadProgress({
        filesCount: 0,
        currentFileIndex: 0,
        currentFileName: '',
        isComplete: false,
      });
    }
  };

  const handleCartCheckout = async (paymentMethod: string, discountCode?: string, deliveryInfo?: any, pointsUsed?: number, shippingCost: number = 0, shippingCarrier?: string, totalWeight?: number) => {
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    // Verify authentication is still valid before placing order
    if (!verifyAuth()) {
      toast.error('Your session has expired. Please log in again.');
      setShowAuthModal(true);
      return;
    }

    try {
      // ============================================
      // STEP 1: PROCESS PAYMENT FIRST! 💳
      // ============================================
      
      // Show payment verification overlay in background
      // It will be visible after Razorpay modal closes
      setShowPaymentVerificationOverlay(true);
      
      // Get final amount from CheckoutScreen's calculation
      const pricingData = JSON.parse(sessionStorage.getItem('orderPricing') || '{}');
      const finalAmount = pricingData.total || cartTotal;

      console.log(`💰 Final amount to charge: ₹${finalAmount}`);

      // Process payment through Razorpay/PayU
      let paymentId: string;
      try {
        paymentId = await processPayment(finalAmount, paymentMethod, deliveryInfo);
        console.log('✅ Payment successful! Payment ID:', paymentId);
        
        // CRITICAL: Store payment info immediately for recovery if order creation fails
        sessionStorage.setItem('orderPaymentStatus', 'paid');
        sessionStorage.setItem('lastPaymentId', paymentId);
        sessionStorage.setItem('lastPaymentAmount', finalAmount.toString());
        sessionStorage.setItem('lastPaymentTimestamp', new Date().toISOString());
      } catch (paymentError: any) {
        // ============================================
        // COMPREHENSIVE PAYMENT ERROR HANDLING
        // ============================================
        
        // Hide payment verification overlay on any error
        setShowPaymentVerificationOverlay(false);
        
        // Determine error type and show appropriate message
        const errorMessage = paymentError.message || '';
        
        // Use appropriate logging level based on error type
        if (errorMessage.includes('cancelled by user')) {
          console.log('ℹ️ Payment cancelled by user (expected behavior)');
        } else {
          console.error('❌ Payment error:', paymentError);
        }
        
        if (errorMessage.includes('cancelled by user')) {
          toast.error('Payment cancelled. You can try again when ready.', {
            duration: 4000,
            icon: 'ℹ️'
          });
        } else if (errorMessage.includes('Failed to load') || errorMessage.includes('SDK')) {
          toast.error('Failed to load payment gateway. Please check your internet connection and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('verification failed')) {
          toast.error('Payment verification failed. If money was deducted, please contact support.', {
            duration: 6000
          });
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          toast.error('Payment request timed out. Please check your connection and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          toast.error('Network error. Please check your internet connection.', {
            duration: 5000
          });
        } else if (errorMessage.includes('Invalid amount')) {
          toast.error('Invalid payment amount. Please refresh and try again.', {
            duration: 5000
          });
        } else if (errorMessage.includes('not configured') || errorMessage.includes('credentials')) {
          toast.error('Payment gateway is not properly configured. Please contact support.', {
            duration: 6000
          });
        } else {
          // Generic error message with the actual error
          toast.error(`Payment failed: ${errorMessage || 'Unknown error'}. Please try again or contact support.`, {
            duration: 6000
          });
        }
        
        // Log detailed error for debugging (only for non-cancellation errors)
        if (!errorMessage.includes('cancelled by user')) {
          console.log('📋 Payment error details:', {
            message: errorMessage,
            gateway: paymentMethod,
            amount: finalAmount,
            timestamp: new Date().toISOString()
          });
        }
        
        // Re-throw the error so CheckoutScreen's catch block can reset button state
        throw paymentError;
      }

      // ============================================
      // STEP 2: PAYMENT SUCCESSFUL - CREATE ORDER
      // ============================================

      // Hide payment verification overlay before showing upload screen
      setShowPaymentVerificationOverlay(false);

      setIsUploading(true);
      
      // Validate token with server before starting upload
      console.log('Validating authentication before cart checkout...');
      try {
        await refreshUser();
        console.log('Authentication validated successfully');
      } catch (error) {
        // Token is invalid - refreshUser already cleared it
        console.log('Authentication validation failed - token expired');
        setIsUploading(false);
        toast.error('Your session has expired. Please log in again.');
        setShowAuthModal(true);
        return;
      }

      // Count total files to upload (DXF files + sketch files)
      const dxfFilesToUpload = cartItems.filter((item: any) => 
        item.file && !item.filePath && !item.isSketchService
      );
      const sketchItemsToUpload = cartItems.filter((item: any) => 
        item.isSketchService && item.sketchFiles && item.sketchFiles.length > 0
      );
      
      // Check if there are sketch items without files (lost after page reload)
      const sketchItemsWithoutFiles = cartItems.filter((item: any) => 
        item.isSketchService && (!item.sketchFiles || item.sketchFiles.length === 0)
      );
      
      if (sketchItemsWithoutFiles.length > 0) {
        setIsUploading(false);
        toast.error('Some sketch service items lost their files (likely due to page reload). Please remove them and re-add the sketch service.');
        return;
      }
      
      const totalSketchFiles = sketchItemsToUpload.reduce((sum: number, item: any) => 
        sum + (item.sketchFiles?.length || 0), 0
      );
      const totalFilesToUpload = dxfFilesToUpload.length + totalSketchFiles;

      if (totalFilesToUpload > 0) {
        setUploadProgress({
          filesCount: totalFilesToUpload,
          currentFileIndex: 0,
          currentFileName: '',
          isComplete: false,
        });
      }

      // Upload files sequentially for better progress tracking
      let uploadedCount = 0;
      const ordersWithUploadedFiles = [];
      
      for (const item of cartItems) {
        let uploadedFilePath = item.filePath;
        let uploadedSketchPaths = item.sketchFilePaths;
        
        // Upload DXF file if needed
        if (item.file && !item.filePath && !item.isSketchService) {
          uploadedCount++;
          setUploadProgress({
            filesCount: totalFilesToUpload,
            currentFileIndex: uploadedCount,
            currentFileName: item.fileName,
            isComplete: false,
          });

          try {
            const uploadResult = await uploadDXF(item.file);
            
            if (!uploadResult.success) {
              throw new Error(`Failed to upload ${item.fileName}: ${uploadResult.error}`);
            }
            
            uploadedFilePath = uploadResult.filePath;
          } catch (uploadError: any) {
            // If it's a JWT error, throw a specific message
            if (uploadError.message?.includes('Invalid JWT')) {
              throw new Error('Unauthorized: Invalid JWT');
            }
            throw uploadError;
          }
        }
        
        // Upload sketch files if this is a sketch service item
        if (item.isSketchService && item.sketchFiles && item.sketchFiles.length > 0) {
          const uploadedPaths: string[] = [];
          
          for (let i = 0; i < item.sketchFiles.length; i++) {
            const sketchFile = item.sketchFiles[i];
            uploadedCount++;
            setUploadProgress({
              filesCount: totalFilesToUpload,
              currentFileIndex: uploadedCount,
              currentFileName: sketchFile.name,
              isComplete: false,
            });

            try {
              // Upload sketch file to Supabase Storage
              const { projectId } = await import('./utils/supabase/info');
              const timestamp = Date.now();
              const randomStr = Math.random().toString(36).substring(7);
              const filePath = `${user?.id}/${timestamp}-${randomStr}-${sketchFile.name}`;
              
              const formData = new FormData();
              formData.append('file', sketchFile);
              formData.append('path', filePath);
              formData.append('bucket', 'make-8927474f-sketch-files');
              
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-8927474f/upload-sketch-file`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                  },
                  body: formData,
                }
              );

              const result = await response.json();
              
              if (!result.success) {
                throw new Error(`Failed to upload sketch file ${sketchFile.name}: ${result.error}`);
              }
              
              uploadedPaths.push(result.filePath);
            } catch (uploadError: any) {
              // If it's a JWT error, throw a specific message
              if (uploadError.message?.includes('Invalid JWT')) {
                throw new Error('Unauthorized: Invalid JWT');
              }
              throw uploadError;
            }
          }
          
          uploadedSketchPaths = uploadedPaths;
        }
        
        ordersWithUploadedFiles.push({
          fileName: item.fileName,
          filePath: uploadedFilePath,
          material: item.material,
          thickness: item.thickness,
          price: item.price,
          quantity: item.quantity || 1, // Include quantity from cart item
          dxfData: item.dxfData,
          isSketchService: item.isSketchService,
          sketchFilePaths: uploadedSketchPaths,
          sketchFileNames: item.sketchFileNames,
          color: item.color || null,    // Colour selection for non-metal materials
        });
      }

      if (totalFilesToUpload > 0) {
        setUploadProgress(prev => ({ ...prev, isComplete: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const orderData = {
        orders: ordersWithUploadedFiles,
        deliveryInfo,
        paymentMethod: paymentMethod || 'razorpay',
        discountCode,
        discountAmount: pricingData.discountAmount || 0, // ✅ ADD: Send discount amount
        pointsUsed: pointsUsed || 0,
        notes: orderNotes || '',
        shippingCost,
        shippingCarrier,
        totalWeight: totalWeight || 0,
        // Payment transaction details
        paymentId: paymentId,
        paymentStatus: 'paid',
        paymentGateway: paymentMethod.toLowerCase(),
        paymentAmount: finalAmount,
      };

      const result = await apiCall('/orders/batch', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      if (!result.success) {
        // CRITICAL: Payment succeeded but order creation failed
        console.error('🚨 CRITICAL: Payment succeeded but cart order creation failed!');
        console.error('Payment ID:', paymentId);
        console.error('Amount charged:', finalAmount);
        console.error('Order error:', result.error);
        
        // Store failure info for support
        sessionStorage.setItem('failedOrderPaymentId', paymentId);
        sessionStorage.setItem('failedOrderError', result.error || 'Unknown error');
        
        throw new Error(`Order creation failed: ${result.error}. Payment ID: ${paymentId}. Please contact support immediately.`);
      }

      Analytics.trackPurchase(result.batchId, cartTotal, 'Batch Order');
      
      clearCart();
      setOrderId(result.batchId);
      
      // Price already includes all costs from the pricing formula
      setPrice(cartTotal);
      
      // Clear referral code from localStorage after successful order
      localStorage.removeItem('referralCode');
      
      startTransition(() => {
        setCurrentScreen('final');
        setCurrentStep(5);
      });
      toast.success('Batch order placed successfully!');
    } catch (error: any) {
      // If this is a payment error, re-throw it so CheckoutScreen can handle button reset
      // Payment errors are already handled with toasts in the inner catch block
      if (error.message?.includes('cancelled by user') || 
          error.message?.includes('Payment') ||
          error.message?.includes('verification failed') ||
          error.message?.includes('SDK') ||
          error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.message?.includes('not configured')) {
        console.log('🔄 Re-throwing payment error to CheckoutScreen');
        throw error; // Re-throw to CheckoutScreen
      }
      
      // Log non-payment errors
      console.error('❌ Cart checkout error:', error);
      
      // Handle session expiration
      if (error.message?.includes('Unauthorized') || error.message?.includes('Invalid JWT')) {
        localStorage.removeItem('access_token');
        toast.error('Your session has expired. Please log in again.');
        setShowAuthModal(true);
      } else {
        // Only show toast for non-payment errors (payment errors already showed toast)
        toast.error(error.message || 'Failed to place batch order');
      }
    } finally {
      setIsUploading(false);
      setShowPaymentVerificationOverlay(false);
      setUploadProgress({
        filesCount: 0,
        currentFileIndex: 0,
        currentFileName: '',
        isComplete: false,
      });
    }
  };

  const handleViewCart = () => {
    startTransition(() => {
      setCurrentScreen('cart');
      setIsCartCheckout(false);
    });
  };

  const handleCartCheckoutStart = () => {
    if (!user) {
      toast.error('Please login to checkout');
      setShowAuthModal(true);
      return;
    }
    if (cartItemCount === 0) {
      toast.error('Your cart is empty');
      return;
    }
    Analytics.trackInitiateCheckout(cartTotal, cartItemCount);
    setIsCartCheckout(true);
    startTransition(() => {
      setCurrentScreen('checkout');
    });
  };

  const showConfirmDialog = (title: string, description: string, onConfirm: () => void, isDestructive = false) => {
    setConfirmDialog({
      open: true,
      title,
      description,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
      isDestructive,
    });
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'landing':
        return (
          <LandingPage
            onGetStarted={handleGetStarted}
            onLogin={handleShowLogin}
            onViewOrders={handleViewOrders}
            user={user}
          />
        );

      case 'service-selection':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ServiceSelectionScreen
              onNext={handleServiceSelection}
              onCancel={() => startTransition(() => setCurrentScreen('landing'))}
            />
          </Suspense>
        );

      case 'sketch-checklist':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SketchChecklistScreen
              onNext={() => startTransition(() => {
                setCurrentScreen('sketch-upload');
                setCurrentStep(0);
              })}
              onBack={() => startTransition(() => setCurrentScreen('service-selection'))}
              onCancel={() => startTransition(() => setCurrentScreen('landing'))}
            />
          </Suspense>
        );

      case 'sketch-upload':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SketchUploadScreen
              onNext={(files) => startTransition(() => {
                setSketchFiles(files);
                setPrice(150); // Default sketch service price (will be validated by server)
                setCurrentScreen('summary');
                setCurrentStep(3);
              })}
              onBack={() => startTransition(() => setCurrentScreen('sketch-checklist'))}
              onCancel={() => startTransition(() => setCurrentScreen('landing'))}
            />
          </Suspense>
        );

      case 'upload':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UploadScreen
              onNext={(data) => handleFileUpload(data.file, data.filePath, data.file.name, data.dxfData)}
              onBack={() => startTransition(() => setCurrentScreen('service-selection'))}
            />
          </Suspense>
        );

      case 'material':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <MaterialScreen
              onNext={handleMaterialSelect}
              onBack={() => startTransition(() => {
                setCurrentScreen('upload');
                setCurrentStep(0);
              })}
            />
          </Suspense>
        );

      case 'thickness':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ThicknessScreen
              material={selectedMaterial}
              onNext={handleThicknessSelect}
              onBack={() => startTransition(() => {
                setCurrentScreen('material');
                setCurrentStep(1);
              })}
              dxfData={dxfData}
            />
          </Suspense>
        );

      case 'summary':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SummaryScreen
              file={file}
              fileName={fileName}
              material={selectedMaterial}
              thickness={selectedThickness}
              selectedColor={selectedColor}
              price={price}
              dxfData={dxfData}
              onAddToCart={handleAddToCart}
              onConfirm={handleProceedToCheckout}
              onBack={() => startTransition(() => {
                if (isSketchWorkflow) {
                  setCurrentScreen('sketch-upload');
                  setCurrentStep(0);
                } else {
                  setCurrentScreen('thickness');
                  setCurrentStep(2);
                }
              })}
              isSketchWorkflow={isSketchWorkflow}
              sketchFiles={sketchFiles}
              isLoggedIn={!!user}
              isUploading={false}
            />
          </Suspense>
        );

      case 'checkout':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <CheckoutScreen
              file={file}
              fileName={fileName}
              material={selectedMaterial}
              thickness={selectedThickness}
              dxfData={dxfData}
              price={isCartCheckout ? cartTotal : price}
              quantity={orderQuantity}
              cartItems={isCartCheckout ? cartItems : undefined}
              onPlaceOrder={isCartCheckout ? handleCartCheckout : handlePlaceOrder}
              onBack={() => startTransition(() => {
                if (isCartCheckout) {
                  setCurrentScreen('cart');
                  setIsCartCheckout(false);
                } else {
                  setCurrentScreen('summary');
                  setCurrentStep(3);
                }
              })}
              isUploading={isUploading}
              user={user}
              isCartCheckout={isCartCheckout}
              cartItemCount={cartItemCount}
              orderNotes={orderNotes}
              onOrderNotesChange={setOrderNotes}
              selectedColor={selectedColor}
              selectedColorHex={(selectedColor && selectedMaterial?.colors?.find(c => c.name === selectedColor)?.hex) || null}
            />
          </Suspense>
        );

      case 'final':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <FinalScreen
              orderId={orderId}
              price={price}
              subtotal={sessionStorage.getItem('orderOriginalTotal') ? parseFloat(sessionStorage.getItem('orderOriginalTotal')!) : undefined}
              wasAdjusted={sessionStorage.getItem('orderWasAdjusted') === 'true'}
              onStartNew={handleResetOrder}
              onViewOrders={handleViewOrders}
            />
          </Suspense>
        );

      case 'cart':
        return (
          <CartScreen
            onBack={() => startTransition(() => setCurrentScreen('landing'))}
            onCheckout={handleCartCheckoutStart}
          />
        );

      case 'orders':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <OrdersScreen
              onBack={() => startTransition(() => setCurrentScreen('landing'))}
              onReorder={handleReorderFile}
            />
          </Suspense>
        );

      case 'dashboard':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <UserDashboard
              user={user}
              onBack={() => startTransition(() => setCurrentScreen('landing'))}
              onReorderFile={handleReorderFile}
            />
          </Suspense>
        );

      case 'admin':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AdminPanel
              onBack={() => startTransition(() => setCurrentScreen('landing'))}
            />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <NotFoundPage
              onGoHome={() => startTransition(() => setCurrentScreen('landing'))}
            />
          </Suspense>
        );
    }
  };

  const showHeader = currentScreen !== 'landing' && currentScreen !== 'admin';
  const showStepIndicator = ['upload', 'material', 'thickness', 'summary', 'checkout', 'final'].includes(currentScreen) && !isCartCheckout;

  return (
    <div className="min-h-screen bg-[rgb(25,25,25)]">
      {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
      {showHeader && (
        <Header
          user={user}
          onLogin={handleShowLogin}
          onLogout={handleLogout}
          onCartClick={handleViewCart}
          onDashboardClick={handleViewOrders}
          onAdminClick={() => startTransition(() => setCurrentScreen('admin'))}
          onLogoClick={() => startTransition(() => setCurrentScreen('landing'))}
          cartItemCount={cartItemCount}
          cartAnimationTrigger={cartAnimationTrigger}
        />
      )}

      {showStepIndicator && <StepIndicator currentStep={currentStep} steps={STEPS} />}

      {renderScreen()}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        onSuccess={() => {
          setShowResetPasswordModal(false);
          toast.success('Your password has been reset successfully! You can now log in with your new password.');
          setShowAuthModal(true); // Show login modal after password reset
        }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        isDestructive={confirmDialog.isDestructive}
      />

      {/* Upload Progress Overlay */}
      {isUploading && uploadProgress.filesCount > 0 && (
        <UploadProgressScreen
          filesCount={uploadProgress.filesCount}
          currentFileIndex={uploadProgress.currentFileIndex}
          currentFileName={uploadProgress.currentFileName}
          isComplete={uploadProgress.isComplete}
        />
      )}

      <Toaster position="top-right" expand={true} />
      {currentScreen !== 'landing' && <WhatsAppFloatingButton />}
      {showOutageNotification && <ServerOutageNotification onClose={dismissOutageNotification} />}
      <PaymentVerificationOverlay isVisible={showPaymentVerificationOverlay} />
    </div>
  );
}

// App wrapper with all providers
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <OrderProvider>
          <NavigationProvider>
            <SupportProvider>
              <ServerOutageProvider>
                <AppContent />
              </ServerOutageProvider>
            </SupportProvider>
          </NavigationProvider>
        </OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
}