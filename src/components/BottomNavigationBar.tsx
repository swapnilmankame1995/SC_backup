import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';

interface BottomNavigationBarProps {
  onBack?: () => void;
  onNext?: () => void;
  onAddToCart?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}

export function BottomNavigationBar({
  onBack,
  onNext,
  onAddToCart,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  isLoading = false,
  loadingLabel = 'Loading...',
}: BottomNavigationBarProps) {
  // Shorten long labels for mobile view
  const getMobileLabel = (label: string) => {
    if (label.includes('Continue to Material Selection')) return 'Continue';
    if (label.includes('Continue to Thickness Selection')) return 'Continue';
    if (label.includes('Continue to Summary')) return 'Continue';
    if (label.includes('Continue to')) return 'Continue';
    return label;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800 py-4 px-4 sm:px-6 z-50">
      <div className="container mx-auto max-w-7xl">
        {/* Mobile View - Stacked Buttons */}
        <div className="flex md:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBack && onBack && !isLoading && (
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-800 flex-1 min-w-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">BACK</span>
              </Button>
            )}
            
            {onAddToCart && !isLoading && (
              <Button
                onClick={onAddToCart}
                variant="outline"
                className="border-blue-600 text-blue-500 hover:bg-blue-950 flex-1 min-w-0"
              >
                <ShoppingCart className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">ADD TO CART</span>
              </Button>
            )}
          </div>
          
          {onNext && (
            <Button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className={`text-white w-full ${
                isLoading ? 'animate-pulse' : ''
              }`}
            >
              {isLoading ? loadingLabel : getMobileLabel(nextLabel)}
            </Button>
          )}
        </div>

        {/* Desktop View - Original Layout */}
        <div className="hidden md:flex justify-between items-center">
          <div className="text-gray-500 text-sm">
            {/* Optional left side content can go here */}
          </div>
          
          <div className="flex gap-4">
            {showBack && onBack && !isLoading && (
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                BACK
              </Button>
            )}
            
            {onAddToCart && !isLoading && (
              <Button
                onClick={onAddToCart}
                variant="outline"
                className="border-blue-600 text-blue-500 hover:bg-blue-950"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                ADD TO CART
              </Button>
            )}
            
            {onNext && (
              <Button
                onClick={onNext}
                disabled={nextDisabled || isLoading}
                className={`text-white px-6 ${
                  isLoading ? 'animate-pulse' : ''
                }`}
              >
                {isLoading ? loadingLabel : nextLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
