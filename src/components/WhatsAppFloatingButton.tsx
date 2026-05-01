import { MessageCircle } from 'lucide-react';
import { useSupport } from '../contexts/SupportContext';

export function WhatsAppFloatingButton() {
  const { settings, isLoading } = useSupport();

  const handleClick = () => {
    const url = `https://wa.me/${settings.whatsappNumber}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Don't render until settings are loaded to avoid suspension errors
  if (isLoading) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-32 md:bottom-24 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 group"
      aria-label="Contact us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
      
      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Chat with us on WhatsApp
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-900"></div>
      </div>
    </button>
  );
}