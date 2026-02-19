import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useApp();
  const { toast } = useToast();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let user;
      if (mode === 'login') {
        user = await signInWithEmail(email, password);
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
      } else {
        user = await signUpWithEmail(email, password, name);
        toast({
          title: "Account created!",
          description: "Your account has been successfully created.",
        });
      }
      
      dispatch({ type: 'LOGIN', payload: user });
      resetForm();
      onClose();
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const user = await signInWithGoogle();
      dispatch({ type: 'LOGIN', payload: user });
      toast({
        title: "Welcome!",
        description: "You have been successfully signed in with Google.",
      });
      resetForm();
      onClose();
    } catch (error) {
      toast({
        title: "Google Sign-In Error",
        description: error instanceof Error ? error.message : "Failed to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden [&>button]:text-white [&>button]:opacity-90 [&>button]:bg-black/30 [&>button]:hover:bg-black/45 [&>button]:hover:text-white">
        <div className="flex">
          {/* Left Side - Form */}
          <div className="flex-1 p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold">
                {mode === 'login' ? 'Login now!' : 'Sign up now!'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Google Sign In */}
              <Button 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline" 
                className="w-full justify-center gap-3 h-12"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full btn-tech h-12">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center">
                <span className="text-muted-foreground">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="flex-1 bg-gradient-tech relative overflow-hidden">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px]" />
            <img 
              src="/blueprint-detections.png"
              alt="Mechanical blueprint analysis preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-8 max-w-md">
                <h3 className="text-2xl font-bold mb-4">
                  Advanced Blueprint Analysis
                </h3>
                <p className="text-lg opacity-95">
                  Detect and count mechanical symbols with precision using AI-powered computer vision
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
