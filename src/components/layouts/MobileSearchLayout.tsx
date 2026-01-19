import React, { useState } from 'react';
import { MobileNavigation } from '../mobile/MobileNavigation';
import { FilterPanel } from '@/components/FilterPanel';
import { QuickCollectionSidebar } from '@/components/QuickCollectionSidebar';
import { ArtworkGridItem } from '@/components/ArtworkGridItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import { QuickCollectionPanel } from '../QuickCollectionPanel';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { SearchLayoutProps } from './SearchLayoutTypes';
import { SearchFilters } from '@/types/gallery';

export function MobileSearchLayout({
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
}: SearchLayoutProps) {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(false);

    const handleMobileSearch = (filters: SearchFilters) => {
        handleSearch(filters);
        setIsFilterOpen(false);
    };

    return (
        <div className="min-h-screen bg-secondary pb-20">
            <MobileNavigation />

            <div className="p-4">
                {/* Mobile Header & Filter Trigger */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold">Discovery</h2>
                        <p className="text-xs text-muted-foreground">{totalCount} items</p>
                    </div>

                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 h-10 border-zinc-300">
                                <SlidersHorizontal className="h-4 w-4" />
                                Filters
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90vh] p-0 overflow-hidden flex flex-col rounded-t-xl">
                            <SheetHeader className="p-4 border-b shrink-0">
                                <SheetTitle>Search Filters</SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-4 bg-white">
                                <FilterPanel
                                    onSearch={handleMobileSearch}
                                    categories={allCategories}
                                    series={allSeries}
                                    initialFilters={currentFilters}
                                    showLoanFilter={true}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Error State */}
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs flex flex-col gap-2">
                            <span>{error}</span>
                            <div className="flex gap-2 mt-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive font-bold text-[10px]"
                                    onClick={() => handleSearch(currentFilters)}
                                >
                                    Retry
                                </Button>
                                {setIsDiagnosticsOpen && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive font-bold text-[10px]"
                                        onClick={() => setIsDiagnosticsOpen(true)}
                                    >
                                        Run Diagnostics
                                    </Button>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Artwork List (1 column for mobile) */}
                {isLoading && artworks.length === 0 ? (
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-3 bg-white p-3 rounded-lg border border-border">
                                <Skeleton className="aspect-square w-full rounded" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-4">
                            {artworks.map((artwork) => (
                                <ArtworkGridItem
                                    key={artwork.work_id}
                                    artwork={artwork}
                                    isSelected={hasItem(Number(artwork.work_id))}
                                    onSelect={handleSelect}
                                    hasItem={hasItem}
                                    onSeriesClick={handleSeriesSearch}
                                    onArtworkClick={setSelectedArtwork}
                                    variant="default"
                                />
                            ))}
                        </div>

                        {/* Load More */}
                        {artworks.length < totalCount && (
                            <Button
                                variant="outline"
                                className="w-full h-12 border-zinc-300"
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading...' : 'Show More'}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Quick Collection Bar */}
            {selectedArtworksList.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Button
                        onClick={() => setIsQuickPanelOpen(true)}
                        className="w-full h-14 bg-foreground text-background shadow-2xl rounded-2xl flex items-center justify-between px-6 hover:bg-foreground/90 transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-background/20 rounded-full w-7 h-7 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                            <span className="font-semibold">Quick Collection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-background text-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                                {selectedArtworksList.length}
                            </span>
                        </div>
                    </Button>
                </div>
            )}

            <QuickCollectionPanel
                isOpen={isQuickPanelOpen}
                onClose={() => setIsQuickPanelOpen(false)}
                artworks={selectedArtworksList}
                onRemove={(id) => handleSelect(id, false)}
                onClear={clearAll}
                onCreateCollection={() => {
                    setIsQuickPanelOpen(false);
                    setIsCreateDialogOpen(true);
                }}
                onAddToCollection={() => {
                    setIsQuickPanelOpen(false);
                    openAddToDialog();
                }}
            />
        </div>
    );
}
