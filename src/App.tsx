import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QuickCollectionProvider } from "@/contexts/QuickCollectionContext";
import { CollectionsProvider } from "@/contexts/CollectionsContext";

// Pages
import LoginPage from "@/pages/LoginPage";
import SearchPage from "@/pages/SearchPage";
import ArtworkDetailPage from "@/pages/ArtworkDetailPage";
import QuickCollectionPage from "@/pages/QuickCollectionPage";
import CollectionsPage from "@/pages/CollectionsPage";
import CollectionDetailPage from "@/pages/CollectionDetailPage";
import GuestCollectionPage from "@/pages/GuestCollectionPage";
import ImageManagerPage from "@/pages/ImageManagerPage";
import SettingsPage from "@/pages/SettingsPage";


import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Must be authenticated AND an admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/search" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/search" replace /> : <LoginPage />}
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/artwork/:id"
        element={
          <ProtectedRoute>
            <ArtworkDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quick-collection"
        element={
          <ProtectedRoute>
            <QuickCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections"
        element={
          <ProtectedRoute>
            <CollectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections/:id"
        element={
          <ProtectedRoute>
            <CollectionDetailPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/images"
        element={
          <AdminRoute>
            <ImageManagerPage />
          </AdminRoute>
        }
      />
      <Route
        path="/sys-admin-config"
        element={
          <AdminRoute>
            <SettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/share/:token"
        element={<GuestCollectionPage />}
      />
      <Route path="/" element={<Navigate to="/search" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <QuickCollectionProvider>
            <CollectionsProvider>
              <AppRoutes />
            </CollectionsProvider>
          </QuickCollectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
