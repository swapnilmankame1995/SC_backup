import { User, LogOut, Settings, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onLogin?: () => void;
  onAdminClick?: () => void;
  onDashboardClick?: () => void;
  onLogoClick?: () => void;
  onCartClick?: () => void;
  cartItemCount?: number;
  showHamburger?: boolean;
  cartAnimationTrigger?: number; // Timestamp to trigger animation
}

export function Header({ user, onLogout, onLogin, onAdminClick, onDashboardClick, onLogoClick, onCartClick, cartItemCount, showHamburger, cartAnimationTrigger }: HeaderProps) {
  return (
    <>
      <style>{`
        .header-logo {
          font-family: 'Brush Script MT', cursive;
          font-size: 32px;
          color: #fff;
          font-weight: normal;
          font-style: italic;
          text-decoration: none;
          cursor: pointer;
        }

        .header-logo:hover {
          opacity: 0.8;
        }

        /* Cart animation */
        @keyframes cart-glow-pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            transform: scale(1.2);
            box-shadow: 0 0 20px 10px rgba(59, 130, 246, 0.4);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .cart-animate {
          animation: cart-glow-pulse 0.6s ease-out;
        }

        /* Desktop layout */
        @media (min-width: 769px) {
          .header-main-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .header-actions-row {
            display: none;
          }

          .header-user-info {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #2a2a2a;
            border-radius: 8px;
          }

          .header-user-name {
            display: block;
          }
        }

        /* Mobile layout */
        @media (max-width: 768px) {
          .header-logo {
            font-size: 24px;
            margin-left: ${showHamburger ? '40px' : '0'};
          }

          .header-main-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 12px;
          }

          .header-actions-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-left: ${showHamburger ? '40px' : '0'};
          }

          .header-user-info {
            display: none; /* Hide user info in mobile - shown in action buttons */
          }

          .header-user-name {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .header-actions {
            display: flex;
            gap: 6px;
            width: 100%;
            justify-content: flex-end;
          }

          .header-actions button {
            font-size: 12px;
            padding: 6px 10px;
            white-space: nowrap;
          }

          .header-actions button svg {
            width: 14px;
            height: 14px;
          }
        }
      `}</style>
      
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          {/* Desktop: Single row | Mobile: First row with logo and user */}
          <div className="header-main-row">
            <div className="header-logo" onClick={onLogoClick}>
              SheetCutters
            </div>
            
            {/* Desktop: All actions here | Mobile: Only user info */}
            <div className="flex items-center gap-3">
              {/* Cart Icon - Always visible */}
              {onCartClick && (
                <button
                  onClick={onCartClick}
                  className={`relative p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors ${cartAnimationTrigger ? 'cart-animate' : ''}`}
                  aria-label="Shopping cart"
                  key={cartAnimationTrigger || 'cart-static'}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {(cartItemCount ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {cartItemCount! > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </button>
              )}
              
              {user ? (
                <>
                  <div className="header-user-info">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-200 header-user-name">{user.name || user.email}</span>
                  </div>
                  
                  {/* Desktop only buttons */}
                  <div className="hidden md:flex items-center gap-3">
                    {onDashboardClick && (
                      <Button variant="outline" size="sm" onClick={onDashboardClick} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                        <User className="w-4 h-4 mr-2" />
                        My Dashboard
                      </Button>
                    )}
                    
                    {user.isAdmin && onAdminClick && (
                      <Button variant="outline" size="sm" onClick={onAdminClick} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm" onClick={onLogout} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                onLogin && (
                  <Button variant="outline" size="sm" onClick={onLogin} className="border-blue-600 text-blue-500 hover:bg-blue-950">
                    Login
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Mobile only: Second row with action buttons */}
          {user && (
            <div className="header-actions-row md:hidden">
              <div className="header-actions ml-auto">
                {onDashboardClick && (
                  <Button variant="outline" size="sm" onClick={onDashboardClick} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                    <User className="w-4 h-4 mr-1" />
                    Dashboard
                  </Button>
                )}
                
                {user.isAdmin && onAdminClick && (
                  <Button variant="outline" size="sm" onClick={onAdminClick} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                    <Settings className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={onLogout} className="border-gray-700 text-gray-200 hover:bg-gray-800">
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}