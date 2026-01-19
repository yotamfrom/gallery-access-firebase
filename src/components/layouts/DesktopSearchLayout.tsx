import React from 'react';
import { Navigation } from '@/components/Navigation';
import { FilterPanel } from '@/components/FilterPanel';
import { QuickCollectionSidebar } from '@/components/QuickCollectionSidebar';
import { ArtworkGridItem } from '@/components/ArtworkGridItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { SearchLayoutProps } from './SearchLayoutTypes';

export function DesktopSearchLayout({
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
    return (
        <div className="min-h-screen bg-secondary pb-12">
            <Navigation />

            <div className="max-w-[1440px] mx-auto p-6">
                <div className="flex gap-8 items-start">
                    {/* Main Content Area (Left) */}
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                        <FilterPanel
                            onSearch={handleSearch}
                            categories={allCategories}
                            series={allSeries}
                            initialFilters={currentFilters}
                            showLoanFilter={true}
                        />

                        {/* Results Count */}
                        <div className="flex justify-between items-center px-1">
                            <p className="text-sm text-muted-foreground">
                                Showing {artworks.length} of {totalCount} artworks available
                            </p>
                        </div>

                        {/* Error State */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        {error}
                                        <Button variant="link" className="ml-2 p-0 h-auto text-destructive underline" onClick={() => handleSearch(currentFilters)}>
                                            Retry
                                        </Button>
                                    </div>
                                    {setIsDiagnosticsOpen && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive"
                                            onClick={() => setIsDiagnosticsOpen(true)}
                                        >
                                            Run Diagnostics
                                        </Button>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Artworks Grid */}
                        {isLoading && artworks.length === 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <div key={i} className="space-y-3">
                                        <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : artworks.length === 0 ? (
                            <div className="text-center py-24 bg-background rounded-lg border border-border">
                                <p className="text-muted-foreground text-lg">No artworks found</p>
                                <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {artworks.map((artwork) => (
                                        <ArtworkGridItem
                                            key={artwork.work_id}
                                            artwork={artwork}
                                            isSelected={hasItem(Number(artwork.work_id))}
                                            onSelect={handleSelect}
                                            hasItem={hasItem}
                                            onSeriesClick={handleSeriesSearch}
                                            onArtworkClick={setSelectedArtwork}
                                        />
                                    ))}
                                </div>

                                {/* Load More */}
                                {artworks.length < totalCount && (
                                    <div className="mt-12 flex justify-center">
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="min-w-[200px]"
                                            onClick={handleLoadMore}
                                            disabled={isLoadingMore}
                                        >
                                            {isLoadingMore ? 'Loading...' : 'Load More Artworks'}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Quick Collection Sidebar (Right - Sticky) */}
                    <div className="w-[300px] shrink-0 sticky top-6">
                        <QuickCollectionSidebar
                            artworks={selectedArtworksList}
                            onCreateCollection={() => setIsCreateDialogOpen(true)}
                            onAddToCollection={openAddToDialog}
                            onClearAll={clearAll}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
