import { CheckCircle2, Plus, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { WhatsAppContactLink } from './WhatsAppContactLink';
import { useEffect, useState } from 'react';

interface FinalScreenProps {
  orderId: string;
  price?: number;
  onAddMore?: () => void;
  onStartNew?: () => void;
  onViewOrders: () => void;
  subtotal?: number; // Original subtotal before threshold adjustment
  wasAdjusted?: boolean; // Whether threshold was applied
}

interface PricingBreakdown {
  rawTotal: number;
  basePrice: number;
  minimumApplied: boolean;
  discountAmount: number;
  discountCode?: string;
  pointsUsed: number;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  shippingCarrier: string;
  total: number;
  totalWeight: number;
}

export function FinalScreen({ orderId, price, onAddMore, onStartNew, onViewOrders, subtotal, wasAdjusted }: FinalScreenProps) {
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  
  // Load pricing breakdown and payment status from sessionStorage
  useEffect(() => {
    const storedPricing = sessionStorage.getItem('orderPricing');
    if (storedPricing) {
      try {
        const parsed = JSON.parse(storedPricing);
        setPricing(parsed);

      } catch (error) {
        console.error('Failed to parse pricing breakdown:', error);
      }
    }
    
    // Load payment status
    const storedPaymentStatus = sessionStorage.getItem('orderPaymentStatus');
    if (storedPaymentStatus) {
      setPaymentStatus(storedPaymentStatus);
    }
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-950 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>

        <div>
          <h2 className="text-emerald-400 mb-2">Order Confirmed!</h2>
          <p className="text-gray-400">Your laser cutting order has been successfully placed</p>
        </div>

        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Order ID:</span>
              <span className="text-gray-200">{orderId}</span>
            </div>
            
            {/* If we have detailed pricing breakdown from checkout, show it */}
            {pricing ? (
              <>
                {/* Base Price */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Base Price:</span>
                  <span className="text-gray-300">₹{pricing.basePrice.toFixed(2)}</span>
                </div>
                
                {/* Discount */}
                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      Discount {pricing.discountCode ? `(${pricing.discountCode})` : ''}:
                    </span>
                    <span className="text-emerald-400">-₹{pricing.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Loyalty Points */}
                {pricing.pointsUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Loyalty Points ({pricing.pointsUsed}):</span>
                    <span className="text-purple-400">-₹{pricing.pointsUsed.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Tax */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Taxes (GST):</span>
                  <span className="text-gray-300">₹{pricing.taxAmount.toFixed(2)}</span>
                </div>
                
                {/* Shipping */}
                <div className="flex justify-between text-sm pb-3 border-b border-gray-700">
                  <span className="text-gray-400">Shipping:</span>
                  <span className="text-gray-300">
                    {pricing.shippingCost === 0 ? 'Free' : `₹${pricing.shippingCost.toFixed(2)}`}
                  </span>
                </div>
                
                {/* Total */}
                <div className="flex justify-between pt-2">
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="text-blue-500 text-xl">₹{pricing.total.toFixed(2)}</span>
                </div>
              </>
            ) : (
              /* Fallback to old display if no pricing breakdown available */
              <>
                {price !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Amount:</span>
                    <span className="text-blue-500 text-xl">₹{price.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                paymentStatus === 'paid' 
                  ? 'text-emerald-400 bg-emerald-950' 
                  : 'text-orange-400 bg-orange-950'
              }`}>
                {paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </Card>

        <div className="bg-blue-950 border border-blue-800 rounded-lg p-6">
          <h3 className="text-gray-200 mb-2">What's Next?</h3>
          <p className="text-gray-400 text-sm">
            We'll review your order and contact you shortly with production details and payment
            instructions. You can track your order status from your orders page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <Button onClick={onAddMore || onStartNew} size="lg" variant="outline" className="w-full border-gray-700 text-gray-200 hover:bg-gray-800">
            <Plus className="w-5 h-5 mr-2" />
            {onAddMore ? 'Add More Files' : 'Start New Order'}
          </Button>
          <Button onClick={onViewOrders} size="lg" className="w-full">
            <FileText className="w-5 h-5 mr-2" />
            View My Orders
          </Button>
        </div>

        <div className="mt-4">
          <WhatsAppContactLink />
        </div>
      </div>
    </div>
  );
}
