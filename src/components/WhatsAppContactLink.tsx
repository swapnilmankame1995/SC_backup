import { MessageCircle } from 'lucide-react';
import { useSupport } from '../contexts/SupportContext';

interface WhatsAppContactLinkProps {
  className?: string;
  showIcon?: boolean;
}

export function WhatsAppContactLink({ className = '', showIcon = true }: WhatsAppContactLinkProps) {
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
      className={`text-blue-400 hover:text-blue-300 transition-colors inline-flex items-left gap-1.5 ${className}`}
    >
      {/* {showIcon && <MessageCircle className="w-4 h-4" />} */}
      <span>Having issues? or have a Bulk order, Click here to get in touch with us</span>
    </button>
  );
}