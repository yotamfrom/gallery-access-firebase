import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageOff, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';

interface QuickCollectionPageItemProps {
    artwork: Artwork;
    onRemove: (id: number) => void;
}

export function QuickCollectionPageItem({ artwork, onRemove }: QuickCollectionPageItemProps) {
    const { imageUrl } = useArtworkImage(artwork, 'small');

    return (
        <Card className="overflow-hidden hover:shadow-medium transition-shadow">
            <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="h-24 w-24 flex-shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {imageUrl || artwork.thumbnail_url ? (
                        <img
                            src={imageUrl || artwork.thumbnail_url || ''}
                            alt={artwork.work_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageOff className="h-8 w-8" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <Link
                        to={`/artwork/${artwork.work_id}`}
                        className="block hover:text-accent transition-colors"
                    >
                        <h3 className="font-medium text-foreground truncate">
                            {artwork.work_name}
                        </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {artwork.creation_year} • {artwork.materials || 'Mixed media'} • {artwork.dimensions || 'Dimensions vary'}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                        {artwork.work_category || 'Uncategorized'}
                    </Badge>
                </div>

                {/* Remove Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(Number(artwork.work_id))}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </Card>
    );
}
