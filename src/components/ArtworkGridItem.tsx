import React from 'react';
import { ArtworkCard } from './ArtworkCard';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';
import { useNavigate } from 'react-router-dom';

interface ArtworkGridItemProps {
    artwork: Artwork;
    isSelected?: boolean;
    onSelect?: (id: string | number, selected: boolean) => void;
    hasItem: (id: number) => boolean;
    onSeriesClick?: (series: string) => void;
    onArtworkClick?: (artwork: Artwork) => void;
    showRemove?: boolean;
    onRemove?: () => void;
    onClick?: () => void;
    variant?: 'default' | 'minimal';
}

export function ArtworkGridItem({
    artwork,
    isSelected,
    onSelect,
    hasItem,
    onSeriesClick,
    onArtworkClick,
    showRemove,
    onRemove,
    onClick,
    variant = 'default'
}: ArtworkGridItemProps) {
    const navigate = useNavigate();
    // DEBUG: Check if image_location is arriving
    // console.log(`Artwork: ${artwork.work_name}, Path: ${artwork.image_location}`);
    const { imageUrl, isLoading } = useArtworkImage(artwork, 'small');

    return (
        <ArtworkCard
            id={artwork.work_id}
            thumbnailUrl={imageUrl || artwork.thumbnail_url}
            // If we have a resolved URL, use it. Otherwise fall back to thumbnail_url (or show placeholder if null)
            title={artwork.work_name}
            year={artwork.creation_year}
            category={artwork.work_category}
            series={artwork.work_series}
            materials={artwork.materials}
            dimensions={artwork.dimensions}
            price={artwork.current_edition_price}
            captionLine1={artwork.indd_caption_line_1}
            captionLine2={artwork.indd_caption_line_2}
            captionLine3={artwork.indd_caption_line_3}
            editionInfo={artwork.edition_info}
            producedEdition={artwork.produced_edition}
            selected={isSelected}
            onSelect={onSelect}
            onSeriesClick={onSeriesClick}
            showRemove={showRemove}
            onRemove={onRemove}
            variant={variant}
            onClick={() => {
                if (onClick) {
                    onClick();
                } else if (onArtworkClick) {
                    onArtworkClick(artwork);
                } else {
                    navigate(`/artwork/${artwork.work_id}`);
                }
            }}
        />
    );
}
