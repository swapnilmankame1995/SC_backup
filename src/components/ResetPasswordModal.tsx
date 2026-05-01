import { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPasswordModal({ isOpen, onClose, onSuccess }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      // Get the recovery tokens from localStorage
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken) {
        throw new Error('Auth session missing! Please request a new password reset link.');
      }

      // Set the session using the recovery tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) {
        throw new Error('Failed to authenticate. Please request a new password reset link.');
      }

      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Clean up tokens from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      setSuccess(true);
      toast.success('Password reset successfully!');
      
      // Wait 2 seconds then close and trigger success callback
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password');
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !success) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[rgb(30,30,30)] rounded-lg shadow-xl w-full max-w-md border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#dc0000]" />
            Reset Your Password
          </h2>
          {!success && (
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="py-4">
              <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-4 mb-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-300 font-medium">Password reset successful!</p>
                  <p className="text-emerald-400/80 text-sm mt-1">
                    You can now log in with your new password.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-6">
                Please enter your new password. Make sure it's strong and secure.
              </p>

              {error && (
                <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* New Password */}
              <div className="mb-4">
                <label htmlFor="new-password" className="block text-sm text-gray-400 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 pr-12 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#dc0000] transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm text-gray-400 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2.5 pr-12 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#dc0000] transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 mb-6">
                <p className="text-blue-300 text-sm font-medium mb-2">Password Requirements:</p>
                <ul className="text-blue-400/80 text-xs space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-emerald-400' : ''}>
                    • At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-emerald-400' : ''}>
                    • One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-emerald-400' : ''}>
                    • One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-emerald-400' : ''}>
                    • One number
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-[#dc0000] hover:bg-[#b00000] text-white py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}