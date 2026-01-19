import { Artwork, SearchFilters, Collection } from '@/types/gallery';

export interface SearchLayoutProps {
    artworks: Artwork[];
    totalCount: number;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    currentFilters: SearchFilters;
    allCategories: string[];
    allSeries: string[];

    // Actions
    handleSearch: (filters: SearchFilters) => void;
    handleSeriesSearch: (series: string) => void;
    handleSelect: (id: string | number, selected: boolean) => void;
    handleLoadMore: () => void;
    setSelectedArtwork: (artwork: Artwork | null) => void;

    // Quick Collection / Dialogs
    selectedArtworksList: Artwork[];
    hasItem: (id: number) => boolean;
    setIsCreateDialogOpen: (open: boolean) => void;
    openAddToDialog: () => void;
    clearAll: () => void;
    setIsDiagnosticsOpen?: (open: boolean) => void;
}
