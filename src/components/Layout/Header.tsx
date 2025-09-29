import { Button } from '@/components/ui/button';
import { Settings, FileText, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { signOutUser } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  showAuthButtons?: boolean;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export function Header({ showAuthButtons, onLoginClick, onSignUpClick }: HeaderProps) {
  const { state, dispatch } = useApp();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOutUser();
      dispatch({ type: 'LOGOUT' });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: error instanceof Error ? error.message : "Failed to log out.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gradient">MechCount</h1>
        </div>

        {/* Navigation - only show on landing */}
        {showAuthButtons && (
          <nav className="hidden md:flex items-center gap-8">
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </a>
          </nav>
        )}

        {/* Auth Buttons or User Menu */}
        <div className="flex items-center gap-3">
          {showAuthButtons ? (
            <>
              <Button 
                variant="outline" 
                onClick={onLoginClick}
                className="btn-outline-tech"
              >
                Login
              </Button>
              <Button 
                onClick={onSignUpClick}
                className="btn-tech"
              >
                Sign Up
              </Button>
            </>
          ) : state.auth.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img 
                  src={state.auth.user?.avatar} 
                  alt={state.auth.user?.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="hidden md:block text-sm font-medium">
                  {state.auth.user?.name}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}