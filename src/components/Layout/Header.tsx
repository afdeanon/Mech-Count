import { Button } from '@/components/ui/button';
import { Settings, FileText, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { signOutUser } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  showAuthButtons?: boolean;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export function Header({ showAuthButtons, onLoginClick, onSignUpClick }: HeaderProps) {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log('🚪 Logout button clicked');
      await signOutUser();
      
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
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-6xl">
      <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg">
        <div className="px-8 py-3 flex items-center justify-between">
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
              {/* <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                About Us
              </a> */}
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
                  size="sm"
                >
                  Login
                </Button>
                <Button 
                  onClick={onSignUpClick}
                  className="btn-tech"
                  size="sm"
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
      </div>
    </header>
  );
}