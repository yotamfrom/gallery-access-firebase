import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { useCollections } from '@/contexts/CollectionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Artwork, SearchFilters } from '@/types/gallery';
import { filemakerApi } from '@/lib/filemaker-api';
import { CreateCollectionDialog, AddToCollectionDialog } from '@/components/CollectionDialogs';
import { SERIES_LIST } from '@/data/series-list';
import { CATEGORY_LIST } from '@/data/categories-list';
import { ArtworkDetailModal } from '@/components/ArtworkDetailModal';
import { DiagnosticsDialog } from '@/components/DiagnosticsDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DesktopSearchLayout } from '@/components/layouts/DesktopSearchLayout';
import { MobileSearchLayout } from '@/components/layouts/MobileSearchLayout';
import { SearchLayoutProps } from '@/components/layouts/SearchLayoutTypes';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SearchPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { items, hasItem, toggleItem, clearAll } = useQuickCollection();
  const {
    collections,
    isLoading: isCollectionsLoading,
    createCollection,
    addItemsToCollection
  } = useCollections();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  // Collection Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddToDialogOpen, setIsAddToDialogOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Filter Options State
  const [allCategories, setAllCategories] = useState<string[]>(['all', ...CATEGORY_LIST]);
  const [allSeries, setAllSeries] = useState<string[]>(['all', ...SERIES_LIST]);

  // Current applied filters
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});

  const handleCreateCollection = async (name: string, description: string) => {
    if (!session?.gallery_id || items.length === 0) return;

    // useCollections handles the API call and toasts
    const result = await createCollection(name, description, items);

    if (result) {
      toast.success(`Collection "${name}" created successfully.`);
      setIsCreateDialogOpen(false);
      clearAll();
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (items.length === 0) return;

    await addItemsToCollection(collectionId, items);
    setIsAddToDialogOpen(false);
    clearAll();
  };

  const openAddToDialog = () => {
    setIsAddToDialogOpen(true);
  };

  // Fetch filter options on mount (Dynamic for Series, Static for Categories)
  useEffect(() => {
    async function fetchFilterOptions() {
      const CACHE_KEY = 'gallery_filter_options_v4'; // Upgraded key to clear stale category data
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, series } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            if (series) setAllSeries(series);
            return;
          }
        }

        // Categories are now static from CATEGORY_LIST, so we only fetch dynamic series
        const { series: apiSeries } = await filemakerApi.getFilterOptions();
        const newSeries = ['all', ...apiSeries] as string[];

        setAllSeries(newSeries);

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          series: newSeries
        }));
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    }
    fetchFilterOptions();
  }, []);

  const loadArtworks = useCallback(async (filters?: SearchFilters, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      clearAll(); // Reset Quick Collection on new search or initial load
    }
    setError(null);

    try {
      // If no filters are provided, we ask for 25 random artworks from our predefined list
      let finalFilters = filters;

      // Check if filters are empty or only have 'all' values
      const isEmptyFilter = !filters || Object.keys(filters).length === 0 ||
        (Object.values(filters).every(v => v === undefined || v === 'all' || v === ''));

      let currentTotalCount = 0;

      if (isEmptyFilter) {
        // Dynamic import to avoid including large JSON in initial bundle if possible (though here it's small enough)
        const availableWorks = (await import('@/data/available_works.json')).default;
        currentTotalCount = availableWorks.length;

        // Pick 25 random IDs
        const randomIds: string[] = [];
        const worksCopy = [...availableWorks];

        // For random selection, we only do one "page" of random items
        // If it's a load more, we just pick another 25 random ones that aren't already there
        const existingIds = isLoadMore ? artworks.map(a => String(a.work_id)) : [];
        const availableToPick = worksCopy.filter(w => !existingIds.includes(String(w.id)));

        for (let i = 0; i < 25 && availableToPick.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * availableToPick.length);
          randomIds.push(availableToPick[randomIndex].id);
          availableToPick.splice(randomIndex, 1); // Remove to avoid duplicates
        }

        finalFilters = { ...(filters || {}), ids: randomIds };
        console.log('Selected IDs:', randomIds);
      }

      // Handle "Loaned to My Gallery" filter logic
      if (finalFilters?.loanedToMyGallery && session?.galleryName) {
        console.log('Applying Loaned to My Gallery filter for:', session.galleryName);
        finalFilters = {
          ...finalFilters,
          status: 'loan',
          loan_to: session.galleryName
        };
      }

      const offset = isLoadMore ? artworks.length : 0;
      const result = await filemakerApi.getArtworks(finalFilters, 25, offset);

      if ((result as any).debugError) {
        console.error('Debug Error:', (result as any).debugError);
        setError(`Backend Error: ${(result as any).debugError}`);
      }

      if (isLoadMore) {
        setArtworks(prev => [...prev, ...result.artworks as Artwork[]]);
      } else {
        setArtworks(result.artworks as Artwork[]);
      }

      setTotalCount(isEmptyFilter ? currentTotalCount : result.totalCount);
    } catch (err) {
      console.error('Error loading artworks:', err);
      setError('Failed to load artworks. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [artworks]);

  // Listen for global open-diagnostics event
  useEffect(() => {
    const handleOpenDiagnostics = () => setIsDiagnosticsOpen(true);
    window.addEventListener('open-diagnostics', handleOpenDiagnostics);
    return () => window.removeEventListener('open-diagnostics', handleOpenDiagnostics);
  }, []);

  // Initial load
  useEffect(() => {
    loadArtworks();
  }, []); // Only once on mount

  const handleSearch = (filters: SearchFilters) => {
    setCurrentFilters(filters);
    setArtworks([]); // Reset list for new search
    loadArtworks(filters, false);
  };

  const handleSeriesSearch = (series: string) => {
    const filters: SearchFilters = { series };
    setCurrentFilters(filters);
    setArtworks([]); // Reset list for new search
    loadArtworks(filters, false);
  };

  const handleSelect = (id: string | number, selected: boolean) => {
    toggleItem(Number(id));
  };

  const handleLoadMore = () => {
    loadArtworks(currentFilters, true);
  };

  const selectedArtworksList = useMemo(() => {
    return artworks.filter((a) => hasItem(Number(a.work_id)));
  }, [artworks, items, hasItem]);

  const layoutProps: SearchLayoutProps = {
    artworks,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    currentFilters,
    allCategories,
    allSeries,
    handleSearch,
    handleSeriesSearch,
    handleSelect,
    handleLoadMore,
    setSelectedArtwork,
    selectedArtworksList,
    hasItem,
    setIsCreateDialogOpen,
    openAddToDialog,
    clearAll,
    setIsDiagnosticsOpen
  };

  const isMobile = useIsMobile();

  return (
    <>
      {isMobile ? (
        <MobileSearchLayout {...layoutProps} />
      ) : (
        <DesktopSearchLayout {...layoutProps} />
      )}

      <CreateCollectionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateCollection}
      />

      <AddToCollectionDialog
        open={isAddToDialogOpen}
        onOpenChange={setIsAddToDialogOpen}
        collections={collections.map(c => ({
          collection_id: c.uuid,
          gallery_id_fk: '', // Not needed for display
          CollectionName: c.name,
          Description: c.description,
          IsActive: true,
          CreatedAt: c.createdAt,
          ModifiedAt: c.modifiedAt,
          itemCount: c.items.length
        }))}
        isLoading={isCollectionsLoading}
        onSubmit={handleAddToCollection}
      />

      <DiagnosticsDialog
        open={isDiagnosticsOpen}
        onOpenChange={setIsDiagnosticsOpen}
      />

      <ErrorBoundary fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background border border-destructive p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold text-destructive mb-2">Error</h3>
            <p className="text-sm text-foreground mb-4">Something went wrong while opening the artwork.</p>
            <Button variant="outline" onClick={() => setSelectedArtwork(null)}>Close</Button>
          </div>
        </div>
      }>
        <ArtworkDetailModal
          artwork={selectedArtwork}
          isOpen={!!selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
        />
      </ErrorBoundary>
    </>
  );
}
