import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, FolderHeart, Settings, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

export function MobileNavigation() {
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
        <nav className="bg-background border-b border-border px-4 py-3 sticky top-0 z-50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-bold text-foreground leading-tight">Gallery Access</h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{userName}</p>
                </div>

                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 border border-zinc-200">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[280px] overflow-y-auto">
                        <SheetHeader className="text-left pb-4 border-b">
                            <SheetTitle>Menu</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col gap-2 mt-6">
                            <Button
                                variant={isActive('/search') ? 'secondary' : 'ghost'}
                                onClick={() => handleNavigation('/search')}
                                className="w-full justify-start gap-3 h-14 text-base"
                            >
                                <Search className="w-5 h-5" />
                                Search & Discovery
                            </Button>
                            <Button
                                variant={isActive('/collections') ? 'secondary' : 'ghost'}
                                onClick={() => handleNavigation('/collections')}
                                className="w-full justify-start gap-3 h-14 text-base"
                            >
                                <FolderHeart className="w-5 h-5" />
                                Collections
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant={isActive('/sys-admin-config') ? 'secondary' : 'ghost'}
                                    onClick={() => handleNavigation('/sys-admin-config')}
                                    className="w-full justify-start gap-3 h-14 text-base"
                                >
                                    <Settings className="w-5 h-5" />
                                    Settings
                                </Button>
                            )}

                            <div className="border-t border-border my-4" />

                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="w-full justify-start gap-3 h-14 text-base text-destructive"
                            >
                                <LogOut className="w-5 h-5" />
                                Sign Out
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    );
}
