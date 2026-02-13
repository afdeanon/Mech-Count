import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Upload, History, FolderOpen, FileText, LogOut, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { signOutUser } from '@/services/authService';
import { getDefaultAvatar } from '@/lib/avatar';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Upload Blueprint',
    href: '/dashboard',
    icon: Upload
  },
  {
    name: 'History',
    href: '/history/blueprints',
    icon: History
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen
  }
];

export function Sidebar() {
  const { state, dispatch } = useApp();
  const [showLogout, setShowLogout] = useState(false);
  const user = state.auth.user;

  const handleLogout = async () => {
    try {
      console.log('🚪 Sidebar logout clicked');
      await signOutUser();
    } catch (error) {
      console.error('❌ Sidebar logout error:', error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 w-56 bg-card border-r border-border h-screen flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gradient">MechCount</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 flex-1">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'nav-link',
                    isActive && 'nav-link-active'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-border">
        <div 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => setShowLogout(!showLogout)}
        >
          <img 
            src={user?.avatar || getDefaultAvatar(user?.name, user?.email)}
            alt={user?.name || 'User avatar'}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getDefaultAvatar(user?.name, user?.email);
            }}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          {showLogout ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        
        {showLogout && (
          <div className="mt-2 animate-fade-in">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
