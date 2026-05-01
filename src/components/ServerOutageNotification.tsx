import { X, AlertTriangle, MessageCircle, Mail, Clock } from 'lucide-react';
import { useSupport } from '../contexts/SupportContext';

interface ServerOutageNotificationProps {
  onClose: () => void;
}

export function ServerOutageNotification({ onClose }: ServerOutageNotificationProps) {
  const { settings } = useSupport();
  
  const handleWhatsApp = () => {
    // Use WhatsApp number from settings, fallback to default if not set
    const phoneNumber = settings.whatsappNumber || '918217553454';
    const message = encodeURIComponent(
      'Hi! I\'m experiencing server connectivity issues on Sheetcutters.com. Could you please help?'
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    const email = settings.supportEmail || 'support@sheetcutters.com';
    const subject = encodeURIComponent('Server Connectivity Issue - Sheetcutters.com');
    const body = encodeURIComponent(
      'Hello,\n\nI\'m experiencing connectivity issues while using Sheetcutters.com. The system is showing server outage notifications.\n\nPlease let me know when this is resolved.\n\nThank you!'
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border-2 border-gray-200 relative animate-fadeIn">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 mb-2">
                  Connectivity Issue Detected
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We're experiencing temporary connectivity issues with our servers. This may be due to:
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-[#dc0000] mr-2">•</span>
                    <span>Cloudflare infrastructure maintenance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#dc0000] mr-2">•</span>
                    <span>Supabase server updates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#dc0000] mr-2">•</span>
                    <span>Network connectivity problems</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>What's happening?</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Our system automatically retries failed requests. Most issues resolve within 15-30 minutes.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              <strong>You have three options:</strong>
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Contact via WhatsApp</span>
              </button>

              {/* Email Button */}
              <button
                onClick={handleEmail}
                className="w-full flex items-center justify-center space-x-2 bg-[#dc0000] hover:bg-[#b30000] text-white py-3 px-4 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Email Support</span>
              </button>

              {/* Wait Button */}
              <button
                onClick={onClose}
                className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-3 px-4 rounded-lg transition-colors"
              >
                I'll wait for the issue to resolve
              </button>
            </div>

            {/* Footer Note */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                We apologize for the inconvenience. Your data is safe and we're working to restore full service.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}