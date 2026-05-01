import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { AuthScreen } from './AuthScreen';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: any) => void;
  onClose: () => void;
}

export function AuthModal({ isOpen, onSuccess, onClose }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#1a1a1a] border-gray-800">
        <DialogTitle className="sr-only">Login or Sign Up</DialogTitle>
        <DialogDescription className="sr-only">
          Enter your credentials to access your account
        </DialogDescription>
        <AuthScreen onAuthSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}