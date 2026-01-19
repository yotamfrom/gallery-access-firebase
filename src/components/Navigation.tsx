import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, FolderHeart, Settings, LogOut, Menu, X, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const userName = session?.galleryName || 'User';

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background border-b border-border px-6 py-4">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Left: Title + Welcome */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gallery Access Platform</h1>
          <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
        </div>

        {/* Desktop Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant={isActive('/search') ? 'secondary' : 'ghost'}
            onClick={() => navigate('/search')}
            className="gap-2"
          >
            <Search className="w-4 h-4" />
            Search & Discovery
          </Button>
          <Button
            variant={isActive('/collections') ? 'secondary' : 'ghost'}
            onClick={() => navigate('/collections')}
            className="gap-2"
          >
            <FolderHeart className="w-4 h-4" />
            Collections
          </Button>

          {isAdmin && (
            <>
              <Button
                variant={isActive('/sys-admin-config') ? 'secondary' : 'ghost'}
                onClick={() => navigate('/sys-admin-config')}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.dispatchEvent(new CustomEvent('open-diagnostics'))}
                title="Run Diagnostics"
              >
                <Terminal className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
