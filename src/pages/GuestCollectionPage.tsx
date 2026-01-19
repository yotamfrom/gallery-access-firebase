import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtworkGridItem } from '@/components/ArtworkGridItem';
import { ArtworkDetailModal } from '@/components/ArtworkDetailModal';
import { Artwork } from '@/types/gallery';
import { filemakerApi } from '@/lib/filemaker-api';
import { toast } from 'sonner';

export default function GuestCollectionPage() {
    const { token } = useParams();
    const [collection, setCollection] = useState<any>(null);
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSharedCollection();
    }, [token]);

    const loadSharedCollection = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const result = await filemakerApi.getSharedCollection(token);
            setCollection(result.collection);
            setArtworks(result.collection.items || []);
        } catch (err: any) {
            console.error('Error loading shared collection:', err);
            setError(err.message || 'Failed to load collection');
            toast.error('Failed to load shared collection');
        } finally {
            setIsLoading(false);
        }
    };

    const getGalleryWebsite = (name: string) => {
        if (!name) return { name: 'Studio Sigalit Landau', url: 'https://www.sigalitlandau.com' };

        const lowerName = name.toLowerCase();
        if (lowerName.includes('alon segev')) return { name: 'Alon Segev Gallery', url: 'https://www.alonsegev.com' };
        if (lowerName.includes('dvir')) return { name: 'Dvir Gallery', url: 'https://www.dvirgallery.com' };
        if (lowerName.includes('hezi cohen')) return { name: 'Hezi Cohen Gallery', url: 'https://hezicohengallery.com/' };
        if (lowerName.includes('harel')) return { name: 'Harel Gallery', url: 'https://www.harelart.com/' };
        if (lowerName.includes('sigalit landau') || lowerName.includes('studio')) return { name: 'Studio Sigalit Landau', url: 'https://www.sigalitlandau.com' };

        return { name: name, url: 'https://www.sigalitlandau.com' }; // Default to studio if unknown
    };

    const galleryInfo = getGalleryWebsite(collection?.galleryName);

    if (error) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
                <div className="bg-background rounded-lg border border-border p-8 max-w-md w-full text-center">
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Unavailable</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <p className="text-sm text-muted-foreground mt-4">This share link may have expired or is invalid.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            <div className="max-w-[1600px] mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
                        <div>
                            <div className="text-[11px] text-zinc-400 uppercase tracking-[0.3em] font-medium mb-3">
                                {isLoading ? <Skeleton className="h-3 w-32 bg-gray-100" /> : galleryInfo.name}
                            </div>
                            <h1 className="text-3xl font-light tracking-tight mb-2">
                                {isLoading ? <Skeleton className="h-10 w-64 bg-gray-100" /> : collection?.name}
                            </h1>
                            <div className="text-[12px] text-zinc-400 uppercase tracking-widest font-light">
                                {isLoading ? <Skeleton className="h-4 w-32 bg-gray-100" /> : `${artworks.length} artworks`}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-right">
                            <div className="flex items-center gap-6 mb-1">
                                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-300">Shared Preview</span>
                                <div className="text-[10px] text-zinc-300 italic font-light">
                                    Link expires in 14 days
                                </div>
                            </div>
                            <a
                                href={galleryInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 hover:text-black transition-colors font-medium border-b border-transparent hover:border-zinc-200 pb-0.5"
                            >
                                {galleryInfo.url.replace('https://', '').replace('www.', '')}
                            </a>
                        </div>
                    </div>

                    {collection?.description && (
                        <div className="mt-8 max-w-2xl">
                            <p className="text-[14px] leading-relaxed text-zinc-600 font-light">
                                {collection.description}
                            </p>
                        </div>
                    )}

                    {/* Minimalist Divider */}
                    <div className="mt-12 border-b border-zinc-100" />
                </div>

                {/* Artworks Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="aspect-[4/3] w-full rounded-none bg-gray-50" />
                                <Skeleton className="h-3 w-3/4 bg-gray-50" />
                                <Skeleton className="h-3 w-1/2 bg-gray-50" />
                            </div>
                        ))}
                    </div>
                ) : artworks.length === 0 ? (
                    <div className="text-center py-32 border border-dashed border-zinc-100">
                        <p className="text-zinc-400 text-sm font-light uppercase tracking-widest">No artworks in this collection</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-10">
                        {artworks.map((artwork) => (
                            <ArtworkGridItem
                                key={artwork.work_id}
                                artwork={artwork}
                                hasItem={() => false}
                                onArtworkClick={(a) => setSelectedArtwork(a)}
                                onClick={() => setSelectedArtwork(artwork)}
                                variant="minimal"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Artwork Detail Modal */}
            <ArtworkDetailModal
                artwork={selectedArtwork}
                isOpen={!!selectedArtwork}
                onClose={() => setSelectedArtwork(null)}
                showQuickCollection={false}
                isGuest={true}
            />
        </div>
    );
}
