import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  FolderHeart, 
  Building2,
  LogOut, 
  User, 
  ExternalLink,
  FlaskConical,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { session, logout } = useAuth();
  const { count } = useQuickCollection();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border px-8 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/search')}
              className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
            >
              Gallery Access
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate('/search')}
                className={cn(
                  'text-sm transition-colors',
                  isActive('/search')
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Search
              </button>
              <button
                onClick={() => navigate('/collections')}
                className={cn(
                  'text-sm transition-colors',
                  isActive('/collections')
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                My Collections
              </button>
              <button
                onClick={() => navigate('/loaned')}
                className={cn(
                  'text-sm transition-colors',
                  isActive('/loaned')
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                On Loan
              </button>
              <button
                onClick={() => navigate('/api-test')}
                className={cn(
                  'text-sm transition-colors',
                  isActive('/api-test')
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                API Test
              </button>
            </div>
          </div>

          {/* Right: Quick Collection + User */}
          <div className="flex items-center gap-4">
            {/* Quick Collection */}
            <Link
              to="/quick-collection"
              className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent border border-accent rounded-md text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              Quick Collection
              {count > 0 && (
                <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                  {count}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{session?.galleryName || 'Gallery User'}</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showUserMenu && "rotate-180"
                )} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-medium z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{session?.galleryName}</p>
                      <p className="text-xs text-muted-foreground">ID: {session?.galleryId}</p>
                    </div>
                    <a
                      href="https://sigalitlandau.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Studio
                    </a>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 w-full text-sm text-destructive hover:bg-secondary transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-around mt-4 pt-4 border-t border-border">
          <button
            onClick={() => navigate('/search')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs',
              isActive('/search') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Search className="w-5 h-5" />
            Search
          </button>
          <button
            onClick={() => navigate('/collections')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs',
              isActive('/collections') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <FolderHeart className="w-5 h-5" />
            Collections
          </button>
          <button
            onClick={() => navigate('/loaned')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs',
              isActive('/loaned') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Building2 className="w-5 h-5" />
            On Loan
          </button>
          <button
            onClick={() => navigate('/api-test')}
            className={cn(
              'flex flex-col items-center gap-1 text-xs',
              isActive('/api-test') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <FlaskConical className="w-5 h-5" />
            API Test
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
