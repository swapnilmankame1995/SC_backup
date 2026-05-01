import { Loader2, AlertTriangle } from 'lucide-react';

interface PaymentVerificationOverlayProps {
  isVisible: boolean;
}

export function PaymentVerificationOverlay({ isVisible }: PaymentVerificationOverlayProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Full-screen backdrop - sits behind Razorpay modal */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999]" />
      
      {/* Centered modal - sits behind Razorpay modal */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-fadeIn">
          {/* Spinning loader */}
          <div className="relative inline-flex items-center justify-center mb-6">
            {/* Outer spinning ring */}
            <div className="absolute w-24 h-24 border-4 border-[#dc0000]/20 border-t-[#dc0000] rounded-full animate-spin"></div>
            
            {/* Inner icon */}
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-[#dc0000] animate-spin" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl text-gray-900 mb-3">
            Processing...
          </h2>
          
          {/* Subheading */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Please wait while we process your order. This usually takes a few seconds.
          </p>

          {/* Warning box */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-yellow-900">
                  <strong>Please do not close this window</strong>
                </p>
                <p className="text-xs text-yellow-800 mt-1">
                  Closing now may cause issues. You'll be redirected automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prevent body scroll */}
      <style>{`
        body {
          overflow: hidden;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}