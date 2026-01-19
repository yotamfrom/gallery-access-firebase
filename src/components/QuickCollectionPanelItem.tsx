import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageOff } from 'lucide-react';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';

interface QuickCollectionPanelItemProps {
    artwork: Artwork;
    onRemove: (id: string | number) => void;
}

export function QuickCollectionPanelItem({ artwork, onRemove }: QuickCollectionPanelItemProps) {
    const { imageUrl } = useArtworkImage(artwork, 'small');

    return (
        <div className="flex gap-3 group">
            <div className="flex items-start gap-3 flex-1">
                <Checkbox
                    checked={true}
                    onCheckedChange={() => onRemove(artwork.work_id)}
                />
                <div className="w-16 h-20 bg-secondary rounded overflow-hidden flex-shrink-0">
                    {imageUrl || artwork.thumbnail_url ? (
                        <img
                            src={imageUrl || artwork.thumbnail_url || ''}
                            alt={artwork.work_name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageOff className="w-6 h-6" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{artwork.work_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                        {artwork.creation_year || 'Unknown year'}
                    </p>
                    {artwork.dimensions && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {artwork.dimensions}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
