import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getSupabaseClient } from '../utils/supabase/client';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { projectId } from '../utils/supabase/info';
import { Validation } from '../utils/validation';
import { rateLimiter, RateLimits, formatTimeUntilReset } from '../utils/rateLimiter';
import { logError, logInfo } from '../utils/errorLogger';
import { Analytics } from '../utils/analytics';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const supabase = getSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email format
      if (!Validation.isValidEmail(loginEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Check rate limit
      const rateLimitKey = `login:${loginEmail}`;
      if (!rateLimiter.isAllowed(rateLimitKey, RateLimits.LOGIN)) {
        const timeUntilReset = rateLimiter.getTimeUntilReset(rateLimitKey, RateLimits.LOGIN);
        toast.error(`Too many login attempts. Please try again in ${formatTimeUntilReset(timeUntilReset)}`);
        logError('Rate limit exceeded', 'login', loginEmail);
        return;
      }

      logInfo('Login attempt started', { email: loginEmail });
      
      // Call server-side login endpoint
      const result = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      }, false); // Don't use auth for login call

      if (result.success && result.session) {
        localStorage.setItem('access_token', result.session.access_token);
        localStorage.setItem('refresh_token', result.session.refresh_token);
        
        // Clear rate limit on successful login
        rateLimiter.clear(rateLimitKey);
        
        Analytics.userLogin('email');
        onAuthSuccess(result.user);
        toast.success('Login successful!');
        setLoginError(false);
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error: any) {
      // Only log unexpected errors, not user credential failures
      const isUserError = error.message?.toLowerCase().includes('invalid') || 
                         error.message?.toLowerCase().includes('password') ||
                         error.message?.toLowerCase().includes('credentials');
      
      if (!isUserError) {
        logError(error, 'login', loginEmail);
      }
      
      Analytics.error(error.message || 'Login failed', 'authentication');
      
      // Provide user-friendly error messages
      let errorMessage = 'Invalid email or password. Please try again.';
      
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('failed to fetch') || msg.includes('network')) {
          errorMessage = 'Connection error. Please check your internet connection and try again.';
        } else if (msg.includes('unauthorized') || msg.includes('invalid')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (msg.includes('too many')) {
          errorMessage = error.message; // Keep rate limit message as-is
        }
      }
      
      toast.error(errorMessage);
      setLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!Validation.isValidEmail(signupEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }

      const passwordCheck = Validation.isValidPassword(signupPassword);
      if (!passwordCheck.valid) {
        toast.error(passwordCheck.message || 'Password is too weak');
        return;
      }

      if (signupName.trim().length < 2) {
        toast.error('Please enter your full name');
        return;
      }

      // Check rate limit
      const rateLimitKey = `signup:${signupEmail}`;
      if (!rateLimiter.isAllowed(rateLimitKey, RateLimits.SIGNUP)) {
        const timeUntilReset = rateLimiter.getTimeUntilReset(rateLimitKey, RateLimits.SIGNUP);
        toast.error(`Too many signup attempts. Please try again in ${formatTimeUntilReset(timeUntilReset)}`);
        return;
      }

      logInfo('Signup attempt started', { email: signupEmail });

      const result = await apiCall('/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          name: Validation.sanitizeString(signupName),
        }),
      }, false);

      if (result.success) {
        // Now login using server-side endpoint
        const loginResult = await apiCall('/login', {
          method: 'POST',
          body: JSON.stringify({
            email: signupEmail,
            password: signupPassword,
          }),
        }, false);

        if (loginResult.success && loginResult.session) {
          localStorage.setItem('access_token', loginResult.session.access_token);
          localStorage.setItem('refresh_token', loginResult.session.refresh_token);
          
          // Clear rate limit on successful signup
          rateLimiter.clear(rateLimitKey);
          
          Analytics.userSignUp('email');
          onAuthSuccess(loginResult.user);
          
          if (result.isAdmin) {
            toast.success('Account created! You are the first user and have admin access.');
          } else {
            toast.success('Account created successfully!');
          }
        }
      }
    } catch (error: any) {
      logError(error, 'signup', signupEmail);
      Analytics.error(error.message || 'Signup failed', 'authentication');
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('failed to fetch') || msg.includes('network')) {
          errorMessage = 'Connection error. Please check your internet connection and try again.';
        } else if (msg.includes('already registered') || msg.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (msg.includes('password')) {
          errorMessage = error.message; // Keep password validation message as-is
        } else if (msg.includes('email')) {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else if (error.message.length < 100) {
          // Use the original message if it's reasonably short
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-logo {
          font-family: 'Brush Script MT', cursive;
          font-size: 48px;
          color: white;
          font-weight: normal;
          font-style: italic;
          margin-bottom: 16px;
        }

        .input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.4) !important;
          animation: pulse-red 2s infinite;
        }

        @keyframes pulse-red {
          0%, 100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 1), 0 0 40px rgba(239, 68, 68, 0.6);
          }
        }
      `}</style>
      
      <Card className="w-full max-w-md px-[33px] border-0 px-[8px] rounded-[16px] py-[0px]">
        <CardHeader className="text-center pt-[4px] pr-[21px] pb-[0px] pl-[15px] mt-[-30px] mr-[-11px] mb-[-33px] ml-[0px]">
          <div className="auth-logo text-center mt-[15px] mr-[0px] mb-[0px] ml-[8px] text-white text-[48px] px-[0px] py-[-14px]">SheetCutters</div>

        </CardHeader>
      <CardContent className="mx-[3px] pt-[0px] pr-[24px] pb-[24px] pl-[34px] my-[0px]">
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 mt-[13px] mr-[0px] mb-[16px] ml-[0px]">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(false);
                  }}
                  required
                  className={loginError ? 'input-error' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError(false);
                  }}
                  required
                  className={loginError ? 'input-error' : ''}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <Button 
                type="button" 
                variant="ghost"
                className="w-full text-gray-400 hover:text-gray-200" 
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    <ForgotPasswordModal
      open={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
    />
    </>
  );
}