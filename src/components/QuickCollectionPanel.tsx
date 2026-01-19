import React from 'react';
import { X, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Artwork } from '@/types/gallery';
import { QuickCollectionPanelItem } from './QuickCollectionPanelItem';

interface QuickCollectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  artworks: Artwork[];
  onRemove: (id: string | number) => void;
  onClear: () => void;
  onCreateCollection: () => void;
  onAddToCollection: () => void;
}

export function QuickCollectionPanel({
  isOpen,
  onClose,
  artworks,
  onRemove,
  onClear,
  onCreateCollection,
  onAddToCollection,
}: QuickCollectionPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-background shadow-elevated z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold">Quick Collection</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {artworks.length} {artworks.length === 1 ? 'artwork' : 'artworks'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Artworks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {artworks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No artworks selected</p>
              <p className="text-sm text-muted-foreground mt-2">
                Select artworks to add them to Quick Collection
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {artworks.map((artwork) => (
                <QuickCollectionPanelItem
                  key={artwork.work_id}
                  artwork={artwork}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {artworks.length > 0 && (
          <div className="p-6 border-t border-border space-y-3">
            <Button
              onClick={onCreateCollection}
              className="w-full"
            >
              Create New Collection
            </Button>
            <Button
              variant="outline"
              onClick={onAddToCollection}
              className="w-full"
            >
              Add to Existing Collection
            </Button>
            <Button
              variant="ghost"
              onClick={onClear}
              className="w-full text-muted-foreground"
            >
              Clear Quick Collection
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
