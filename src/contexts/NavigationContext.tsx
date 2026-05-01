import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type Screen = 'landing' | 'auth' | 'service-selection' | 'sketch-checklist' | 'sketch-upload' | 'upload' | 'material' | 'thickness' | 'summary' | 'cart' | 'checkout' | 'final' | 'orders' | 'admin' | 'dashboard';

interface NavigationContextType {
  currentScreen: Screen;
  currentStep: number;
  isCartCheckout: boolean;
  
  setCurrentScreen: (screen: Screen) => void;
  setCurrentStep: (step: number) => void;
  setIsCartCheckout: (isCartCheckout: boolean) => void;
  
  navigateToScreen: (screen: Screen, step?: number) => void;
  goBack: () => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isCartCheckout, setIsCartCheckout] = useState<boolean>(false);

  const navigateToScreen = useCallback((screen: Screen, step?: number) => {
    setCurrentScreen(screen);
    if (step !== undefined) {
      setCurrentStep(step);
    }
  }, []);

  const goBack = useCallback(() => {
    // Simple back navigation - can be enhanced based on screen
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const resetNavigation = useCallback(() => {
    setCurrentScreen('landing');
    setCurrentStep(0);
    setIsCartCheckout(false);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentScreen,
        currentStep,
        isCartCheckout,
        setCurrentScreen,
        setCurrentStep,
        setIsCartCheckout,
        navigateToScreen,
        goBack,
        resetNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
