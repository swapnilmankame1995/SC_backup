import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner@2.0.3';
import { initializeAnalytics, trackAddToCart, trackInitiateCheckout, trackPurchase } from './utils/analytics';
import { apiCall } from './utils/api';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { OrderProvider, useOrder } from './contexts/OrderContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';

// Components
import { LandingPage } from './components/LandingPage';
import { StepIndicator } from './components/StepIndicator';
import { FinalScreen } from './components/FinalScreen';
import { OrdersScreen } from './components/OrdersScreen';
import { UploadScreen } from './components/UploadScreen';
import { MaterialScreen } from './components/MaterialScreen';
import { ThicknessScreen } from './components/ThicknessScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { CartScreen } from './components/CartScreen';
import { AdminPanel } from './components/AdminPanel';
import { ServiceSelectionScreen } from './components/ServiceSelectionScreen';
import { SketchChecklistScreen } from './components/SketchChecklistScreen';
import { SketchUploadScreen } from './components/SketchUploadScreen';
import { UserDashboard } from './components/UserDashboard';
import { AuthModal } from './components/AuthModal';
import { Header } from './components/Header';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DXFData } from './utils/dxf-parser';

const STEPS = ['Upload', 'Material', 'Thickness', 'Summary', 'Checkout', 'Complete'];

interface Material {
  id: string;
  name: string;
  category: string;
  pricing: {
    thickness: number;
    pricePerMm: number;
  }[];
}

// Main App Component (now using contexts)
function AppContent() {
  const { user, logout } = useAuth();
  const { cartItems, cartItemCount, cartTotal, cartAnimationTrigger, addToCart, clearCart } = useCart();
  const { 
    file, fileName, filePath, dxfData, selectedMaterial, selectedThickness, price, orderNotes, orderId,
    sketchFiles, isSketchWorkflow,
    setFile, setFileName, setFilePath, setDxfData, setSelectedMaterial, setSelectedThickness, 
    setPrice, setOrderNotes, setOrderId, setSketchFiles, setIsSketchWorkflow, resetOrder
  } = useOrder();
  const { currentScreen, currentStep, isCartCheckout, setCurrentScreen, setCurrentStep, setIsCartCheckout } = useNavigation();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  // Initialize analytics on mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  const handleLogout = async () => {
    await logout();
    resetOrder();
    setCurrentScreen('landing');
    setCurrentStep(0);
  };

  const handleResetOrder = () => {
    resetOrder();
    setCurrentScreen('landing');
    setCurrentStep(0);
  };

  const handleGetStarted = () => {
    setCurrentScreen('service-selection');
    setCurrentStep(0);
  };

  const handleServiceSelection = (serviceType: 'dxf' | 'sketch') => {
    if (serviceType === 'dxf') {
      setCurrentScreen('upload');
      setCurrentStep(0);
      setIsSketchWorkflow(false);
    } else {
      setCurrentScreen('sketch-checklist');
      setCurrentStep(0);
      setIsSketchWorkflow(true);
    }
  };

  const handleShowLogin = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);
    if (currentScreen === 'summary') {
      toast.success('Login successful! You can now complete your order.');
    } else if (currentScreen === 'landing' || currentScreen === 'auth') {
      setCurrentScreen('upload');
      setCurrentStep(0);
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
      
      setCurrentScreen('material');
      setCurrentStep(1);
      toast.success('File loaded! Select your material and thickness.');
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to load file for reorder');
    }
  };

  const handleViewOrders = () => {
    setCurrentScreen('dashboard');
  };

  const handleFileUpload = (uploadedFile: File, uploadedFilePath: string, uploadedFileName: string, uploadedDxfData: DXFData) => {
    setFile(uploadedFile);
    setFilePath(uploadedFilePath);
    setFileName(uploadedFileName);
    setDxfData(uploadedDxfData);
    setCurrentScreen('material');
    setCurrentStep(1);
  };

  const handleSketchFilesUploaded = (files: File[], paths: string[], names: string[]) => {
    setSketchFiles(files);
    setCurrentScreen('summary');
    setCurrentStep(3);
  };

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material);
    setCurrentScreen('thickness');
    setCurrentStep(2);
  };

  const handleThicknessSelect = (thickness: number, calculatedPrice: number) => {
    setSelectedThickness(thickness);
    setPrice(calculatedPrice);
    setCurrentScreen('summary');
    setCurrentStep(3);
  };

  const handleAddToCart = () => {
    if (isSketchWorkflow) {
      // Sketch service workflow
      const cartItem = {
        fileName: `Sketch Service (${sketchFiles.length} files)`,
        material: { id: 'sketch', name: 'Sketch Service', category: 'service' },
        thickness: 0,
        price: 0,
        dxfData: { width: 0, height: 0, cuttingLength: 0 },
        filePath: '',
        isSketchService: true,
        sketchFilePaths: sketchFiles.map((_, i) => `sketch-${i}`),
        sketchFileNames: sketchFiles.map(f => f.name),
      };
      addToCart(cartItem);
      trackAddToCart(cartItem.fileName, cartItem.price, 'Sketch Service');
    } else {
      // DXF workflow
      if (!selectedMaterial || !dxfData) return;
      
      const cartItem = {
        fileName,
        material: {
          id: selectedMaterial.id,
          name: selectedMaterial.name,
          category: selectedMaterial.category,
        },
        thickness: selectedThickness || 0,
        price,
        dxfData: {
          width: dxfData.width,
          height: dxfData.height,
          cuttingLength: dxfData.cuttingLength,
        },
        filePath,
        file,
      };
      addToCart(cartItem);
      trackAddToCart(fileName, price, selectedMaterial.name);
    }
    
    resetOrder();
    setCurrentScreen('landing');
    setCurrentStep(0);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      toast.error('Please login to place an order');
      setShowAuthModal(true);
      return;
    }

    if (isSketchWorkflow) {
      setCurrentScreen('checkout');
      setCurrentStep(4);
    } else {
      if (!selectedMaterial || !selectedThickness) {
        toast.error('Please select material and thickness');
        return;
      }
      setCurrentScreen('checkout');
      setCurrentStep(4);
    }
  };

  const handlePlaceOrder = async (deliveryInfo: any, discountCode?: string) => {
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    try {
      setIsUploading(true);

      if (isSketchWorkflow) {
        // Sketch service order
        const formData = new FormData();
        sketchFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('deliveryInfo', JSON.stringify(deliveryInfo));
        if (orderNotes) {
          formData.append('notes', orderNotes);
        }
        if (discountCode) {
          formData.append('discountCode', discountCode);
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
        if (!result.success) throw new Error(result.error);

        setOrderId(result.orderId);
        trackPurchase(result.orderId, 0, 'Sketch Service');
        
      } else {
        // DXF order
        const orderData = {
          fileName,
          filePath,
          material: selectedMaterial,
          thickness: selectedThickness,
          price,
          deliveryInfo,
          dxfData,
          notes: orderNotes,
          discountCode,
        };

        const result = await apiCall('/create-order', {
          method: 'POST',
          body: JSON.stringify(orderData),
        });

        if (!result.success) throw new Error(result.error);

        setOrderId(result.orderId);
        trackPurchase(result.orderId, price, selectedMaterial?.name || 'Unknown');
      }

      setCurrentScreen('final');
      setCurrentStep(5);
      toast.success('Order placed successfully!');
    } catch (error: any) {
      console.error('Order placement error:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCartCheckout = async (deliveryInfo: any, discountCode?: string) => {
    if (!user) {
      toast.error('Please login to place an order');
      return;
    }

    try {
      setIsUploading(true);

      const orderData = {
        items: cartItems.map(item => ({
          fileName: item.fileName,
          filePath: item.filePath,
          material: item.material,
          thickness: item.thickness,
          price: item.price,
          dxfData: item.dxfData,
          isSketchService: item.isSketchService,
          sketchFilePaths: item.sketchFilePaths,
          sketchFileNames: item.sketchFileNames,
        })),
        deliveryInfo,
        totalPrice: cartTotal,
        discountCode,
      };

      const result = await apiCall('/create-batch-order', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      if (!result.success) throw new Error(result.error);

      trackPurchase(result.batchId, cartTotal, 'Batch Order');
      
      clearCart();
      setOrderId(result.batchId);
      setCurrentScreen('final');
      setCurrentStep(5);
      toast.success('Batch order placed successfully!');
    } catch (error: any) {
      console.error('Cart checkout error:', error);
      toast.error(error.message || 'Failed to place batch order');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewCart = () => {
    setCurrentScreen('cart');
    setIsCartCheckout(false);
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
    trackInitiateCheckout(cartTotal, cartItemCount);
    setIsCartCheckout(true);
    setCurrentScreen('checkout');
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
          <ServiceSelectionScreen
            onSelectService={handleServiceSelection}
            onBack={() => setCurrentScreen('landing')}
          />
        );

      case 'sketch-checklist':
        return (
          <SketchChecklistScreen
            onContinue={() => {
              setCurrentScreen('sketch-upload');
              setCurrentStep(0);
            }}
            onBack={() => setCurrentScreen('service-selection')}
          />
        );

      case 'sketch-upload':
        return (
          <SketchUploadScreen
            onFilesUploaded={handleSketchFilesUploaded}
            onBack={() => setCurrentScreen('sketch-checklist')}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        );

      case 'upload':
        return (
          <UploadScreen
            onFileUpload={handleFileUpload}
            onBack={() => setCurrentScreen('service-selection')}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        );

      case 'material':
        return (
          <MaterialScreen
            onMaterialSelect={handleMaterialSelect}
            onBack={() => {
              setCurrentScreen('upload');
              setCurrentStep(0);
            }}
            dxfData={dxfData}
          />
        );

      case 'thickness':
        return (
          <ThicknessScreen
            material={selectedMaterial}
            onThicknessSelect={handleThicknessSelect}
            onBack={() => {
              setCurrentScreen('material');
              setCurrentStep(1);
            }}
            dxfData={dxfData}
          />
        );

      case 'summary':
        return (
          <SummaryScreen
            fileName={fileName}
            material={selectedMaterial}
            thickness={selectedThickness}
            price={price}
            dxfData={dxfData}
            onAddToCart={handleAddToCart}
            onProceedToCheckout={handleProceedToCheckout}
            onBack={() => {
              if (isSketchWorkflow) {
                setCurrentScreen('sketch-upload');
                setCurrentStep(0);
              } else {
                setCurrentScreen('thickness');
                setCurrentStep(2);
              }
            }}
            isSketchService={isSketchWorkflow}
            sketchFiles={sketchFiles}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
          />
        );

      case 'checkout':
        return (
          <CheckoutScreen
            price={isCartCheckout ? cartTotal : price}
            onPlaceOrder={isCartCheckout ? handleCartCheckout : handlePlaceOrder}
            onBack={() => {
              if (isCartCheckout) {
                setCurrentScreen('cart');
                setIsCartCheckout(false);
              } else {
                setCurrentScreen('summary');
                setCurrentStep(3);
              }
            }}
            isUploading={isUploading}
            user={user}
            isCartCheckout={isCartCheckout}
            cartItemCount={cartItemCount}
          />
        );

      case 'final':
        return (
          <FinalScreen
            orderId={orderId}
            onStartNew={handleResetOrder}
            onViewOrders={handleViewOrders}
          />
        );

      case 'cart':
        return (
          <CartScreen
            onBack={() => setCurrentScreen('landing')}
            onCheckout={handleCartCheckoutStart}
          />
        );

      case 'orders':
        return (
          <OrdersScreen
            onBack={() => setCurrentScreen('landing')}
            onReorder={handleReorderFile}
          />
        );

      case 'dashboard':
        return (
          <UserDashboard
            user={user}
            onBack={() => setCurrentScreen('landing')}
            onReorder={handleReorderFile}
          />
        );

      case 'admin':
        return (
          <AdminPanel
            onBack={() => setCurrentScreen('landing')}
          />
        );

      default:
        return <LandingPage onGetStarted={handleGetStarted} onLogin={handleShowLogin} onViewOrders={handleViewOrders} user={user} />;
    }
  };

  const showHeader = currentScreen !== 'landing' && currentScreen !== 'admin';
  const showStepIndicator = ['upload', 'material', 'thickness', 'summary', 'checkout', 'final'].includes(currentScreen) && !isCartCheckout;

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <Header
          user={user}
          onLogin={handleShowLogin}
          onLogout={handleLogout}
          onViewCart={handleViewCart}
          onViewDashboard={handleViewOrders}
          onViewAdmin={() => setCurrentScreen('admin')}
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

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        isDestructive={confirmDialog.isDestructive}
      />

      <Toaster position="top-right" />
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
            <AppContent />
          </NavigationProvider>
        </OrderProvider>
      </CartProvider>
    </AuthProvider>
  );
}