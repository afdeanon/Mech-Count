import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { signOutUser } from '@/services/authService';
import { getDefaultAvatar } from '@/lib/avatar';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/Layout/AppLogo';
import { cn } from '@/lib/utils';

interface HeaderProps {
  showAuthButtons?: boolean;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export function Header({ showAuthButtons, onLoginClick, onSignUpClick }: HeaderProps) {
  const { state } = useApp();
  const user = state.auth.user;
  const { toast } = useToast();
  const [showScrolledNav, setShowScrolledNav] = useState(false);

  useEffect(() => {
    if (!showAuthButtons) return;

    const onScroll = () => setShowScrolledNav(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAuthButtons]);

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

  const authButtons = (
    <>
      <Button
        variant="outline"
        onClick={onLoginClick}
        className={cn(
          'btn-outline-tech whitespace-nowrap h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm',
          !showScrolledNav ? 'bg-white/80' : ''
        )}
        size="sm"
      >
        Login
      </Button>
      <Button
        onClick={onSignUpClick}
        className="btn-tech whitespace-nowrap h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
        size="sm"
      >
        Sign Up
      </Button>
    </>
  );

  const landingNav = (
    <nav className="hidden md:flex items-center gap-6">
      <a
        href="#about"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        About
      </a>
    </nav>
  );

  if (showAuthButtons) {
    return (
      <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-6">
        <div
          className={cn(
            'mx-auto w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            showScrolledNav
              ? 'max-w-5xl mt-3 sm:mt-4 bg-card/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg'
              : 'max-w-none mt-3 sm:mt-5 bg-transparent border border-transparent rounded-none shadow-none'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              showScrolledNav ? 'px-3 py-2 sm:px-5' : 'px-0 py-0'
            )}
          >
            <AppLogo titleClassName="text-lg sm:text-xl" />
            {landingNav}
            <div className="flex items-center gap-2 sm:gap-3">{authButtons}</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-5xl">
      <div className="bg-card/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg">
        <div className="px-5 py-2 flex items-center justify-between">
          <AppLogo titleClassName="text-xl" />
          {state.auth.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={user?.avatar || getDefaultAvatar(user?.name, user?.email)}
                  alt={user?.name || 'User avatar'}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = getDefaultAvatar(user?.name, user?.email);
                  }}
                  className="w-8 h-8 rounded-full"
                />
                <span className="hidden md:block text-sm font-medium">
                  {user?.name}
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
          ) : (
            <div />
          )}
        </div>
      </div>
    </header>
  );
}
