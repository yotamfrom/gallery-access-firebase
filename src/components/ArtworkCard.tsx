import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/Badge';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtworkCardProps {
  id: string | number;
  thumbnailUrl?: string | null;
  title: string;
  description?: string | null;
  year?: number | null;
  category?: string | null;
  series?: string | null;
  materials?: string | null;
  dimensions?: string | null;
  price?: number | null;
  selected?: boolean;
  onSelect?: (id: string | number, selected: boolean) => void;
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
  hold?: {
    galleryName: string;
    isCurrentGallery: boolean;
    expiresAt?: Date;
  };
  onLoan?: {
    loaneeName: string;
    startDate?: Date;
    endDate?: Date;
  };
  // Caption lines from FileMaker
  captionLine1?: string | null;
  captionLine2?: string | null;
  captionLine3?: string | null;
  editionInfo?: string | null;
  producedEdition?: string | null;
  onSeriesClick?: (series: string) => void;
  variant?: 'default' | 'minimal';
}

export function ArtworkCard({
  id,
  thumbnailUrl,
  title,
  description,
  year,
  category,
  series,
  materials,
  dimensions,
  price,
  selected = false,
  onSelect,
  onClick,
  showRemove = false,
  onRemove,
  hold,
  onLoan,
  captionLine1,
  captionLine2,
  captionLine3,
  editionInfo,
  producedEdition,
  onSeriesClick,
  variant = 'default',
}: ArtworkCardProps) {
  // Build display info from caption lines
  const displayLines = [captionLine1, captionLine2, captionLine3].filter(Boolean);
  const hasCaption = displayLines.length > 0;

  // Normalize produced edition for comparison
  const normalizedProduced = producedEdition?.toLowerCase();
  const isLoan = normalizedProduced === 'loan';
  const isStored = normalizedProduced === 'yes';

  return (
    <div
      className={cn(
        'group relative flex flex-col h-full transition-all cursor-pointer',
        variant === 'default' ? 'bg-background rounded-lg border border-border shadow-sm overflow-hidden hover:shadow-md' : 'bg-white rounded-none border-none shadow-none',
        selected && variant === 'default' && 'ring-2 ring-primary border-transparent'
      )}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={cn(
        "aspect-[4/3] relative overflow-hidden flex items-center justify-center",
        variant === 'default' ? "bg-muted" : "bg-white"
      )}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              variant === 'default' && "group-hover:scale-105"
            )}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="h-10 w-10 mb-2 opacity-20" />
            <span className="text-[10px] uppercase font-medium tracking-wider opacity-30">No Image</span>
          </div>
        )}

        {/* Selection Checkbox overlay */}
        {variant === 'default' && (
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}

        {/* Availability Tag overlay - Top Left */}
        {(isLoan || isStored) && (
          <div className="absolute top-3 left-3 z-10">
            <Badge
              variant={isLoan ? 'onLoan' : 'category'}
              className="bg-background/80 backdrop-blur-sm shadow-sm"
            >
              {isLoan ? 'On Loan' : 'Stored'}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        variant === 'default' ? "p-3 pb-3" : "p-0 pt-2"
      )}>
        {/* Caption line 1 as bold title - larger */}
        <h3 className={cn(
          "text-foreground line-clamp-1 mb-0.5",
          variant === 'default' ? "text-sm font-semibold" : "text-[11px] font-normal italic"
        )}>
          {captionLine1 || title}
        </h3>

        {/* Caption lines 2 & 3 OR materials/dimensions - smaller text */}
        <div className={cn(
          "leading-tight text-muted-foreground space-y-0",
          variant === 'default' ? "text-[10px] mb-1.5" : "text-[10px] mb-1"
        )}>
          {captionLine2 ? (
            <p className="line-clamp-1">{captionLine2}</p>
          ) : materials ? (
            <p className="line-clamp-1">{materials}</p>
          ) : null}
          {captionLine3 ? (
            <p className="line-clamp-1">{captionLine3}</p>
          ) : dimensions ? (
            <p className="line-clamp-1">{dimensions}</p>
          ) : null}
        </div>

        {/* Edition info */}
        {editionInfo && (
          <p className="text-[10px] text-muted-foreground mb-1">{editionInfo}</p>
        )}

        {/* Price - Euro sign */}
        {price && variant === 'default' && (
          <p className="text-xs font-medium text-foreground">
            €{price.toLocaleString()}
          </p>
        )}

        {/* Quick Collection checkbox */}
        {onSelect && (
          <div className="border-t border-border mt-2 pt-2">
            <label
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(id, checked === true)}
              />
              <span className="text-[10px] text-muted-foreground">Quick Collection</span>
            </label>
          </div>
        )}

        {/* Series Tag - Bottom */}
        {series && variant === 'default' && (
          <div className="mt-2">
            <Badge
              variant="series"
              className="cursor-pointer hover:bg-secondary/80 transition-colors text-[10px] py-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onSeriesClick?.(series);
              }}
            >
              Series: {series}
            </Badge>
          </div>
        )}
      </div>

      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 w-6 h-6 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}
