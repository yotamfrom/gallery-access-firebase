import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';

interface QuickCollectionSidebarProps {
  artworks: Artwork[];
  onCreateCollection?: () => void;
  onAddToCollection?: () => void;
  onClearAll?: () => void;
}

// Sub-component to handle image resolution
const QuickCollectionItem = ({ artwork }: { artwork: Artwork }) => {
  const { imageUrl } = useArtworkImage(artwork, 'small');

  return (
    <div className="flex gap-3">
      <div className="w-12 h-16 bg-secondary rounded overflow-hidden flex-shrink-0">
        {(imageUrl || artwork.thumbnail_url) && (
          <img
            src={imageUrl || artwork.thumbnail_url}
            alt={artwork.work_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{artwork.work_name}</p>
        <p className="text-xs text-muted-foreground">{artwork.creation_year}</p>
      </div>
    </div>
  );
};

export function QuickCollectionSidebar({
  artworks,
  onCreateCollection,
  onAddToCollection,
  onClearAll
}: QuickCollectionSidebarProps) {
  return (
    <div className="w-full md:w-[280px] flex-shrink-0">
      <div className="bg-background border border-border rounded-lg p-6 sticky top-6">
        <h3 className="text-base font-semibold mb-6">Quick Collection</h3>

        {artworks.length === 0 ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select artworks using checkboxes to add them to Quick Collection
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {artworks.slice(0, 5).map((artwork) => (
              <QuickCollectionItem key={artwork.work_id} artwork={artwork} />
            ))}
            {artworks.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{artworks.length - 5} more
              </p>
            )}

            <div className="pt-4 space-y-2">
              <Button onClick={onCreateCollection} className="w-full">
                Create New Collection
              </Button>
              <Button variant="outline" onClick={onAddToCollection} className="w-full">
                Add to Existing Collection
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearAll} className="w-full text-muted-foreground">
                Clear All
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
