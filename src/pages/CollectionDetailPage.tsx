import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { MobileNavigation } from '@/components/mobile/MobileNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArtworkGridItem } from '@/components/ArtworkGridItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCollections, CollectionItem } from '@/contexts/CollectionsContext';
import { filemakerApi } from '@/lib/filemaker-api';
import { saveAs, robustFetch } from '@/lib/utils';
import { Artwork } from '@/types/gallery';
import { toast } from 'sonner';
import { resolveArtworkImage, resolveArtworkImages } from '@/lib/image-resolver';
import { PdfGenerator } from '@/lib/pdf-generator';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Share2,
  Download,
  FileText,
  GripVertical,
  Link as LinkIcon,
  Copy
} from 'lucide-react';
import { ArtworkDetailModal } from '@/components/ArtworkDetailModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableArtworkItemProps {
  artwork: Artwork;
  onRemove: () => void;
  onClick: () => void;
}

function SortableArtworkItem({ artwork, onRemove, onClick }: SortableArtworkItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: String(artwork.work_id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-20 p-1.5 bg-background/90 border border-border rounded-md shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <ArtworkGridItem
        artwork={artwork}
        hasItem={() => false}
        showRemove
        onRemove={onRemove}
        onClick={onClick}
      />
    </div>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCollection, updateCollection, deleteCollection, removeItemFromCollection, reorderCollectionItems, refreshCollections } = useCollections();
  const isMobile = useIsMobile();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    refreshCollections();
  }, []);

  const collection = id ? getCollection(id) : undefined;

  useEffect(() => {
    if (!collection) return;
    setEditName(collection.name);
    setEditDescription(collection.description);
    loadArtworks();
  }, [collection?.id]);

  const loadArtworks = async () => {
    if (!collection || !collection.items.length) {
      setArtworks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch only the artworks that are in this collection
      const result = await filemakerApi.getArtworks({
        ids: collection.items.map(i => String(i.workId))
      }, 100, 0);

      const collectionArtworks = result.artworks;

      // Sort by collection order (as defined in items)
      const sortedArtworks = collection.items.map(item =>
        collectionArtworks.find(a => String(a.work_id) === String(item.workId))
      ).filter(Boolean) as Artwork[];

      setArtworks(sortedArtworks);
    } catch (err) {
      console.error('Error loading collection artworks:', err);
      toast.error('Failed to load collection artworks');
    } finally {
      setIsLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = artworks.findIndex(a => String(a.work_id) === String(active.id));
      const newIndex = artworks.findIndex(a => String(a.work_id) === String(over.id));

      const newArtworks = arrayMove(artworks, oldIndex, newIndex);
      setArtworks(newArtworks);

      // Map back to CollectionItem for persistence
      if (collection) {
        const newItems = newArtworks.map(a => {
          const originalItem = collection.items.find(i => String(i.workId) === String(a.work_id));
          return originalItem;
        }).filter(Boolean) as CollectionItem[];

        if (newItems.length !== artworks.length) {
          console.warn('Lost some items during reorder mapping', {
            original: artworks.length,
            mapped: newItems.length,
            artworkIds: artworks.map(a => a.work_id),
            itemIds: collection.items.map(i => i.workId)
          });
        }

        setIsReordering(true);
        try {
          await reorderCollectionItems(collection.id, newItems);
          toast.success('Collection order updated');
        } catch (e) {
          console.error('Failed to reorder:', e);
          toast.error('Failed to update order');
        }
        setIsReordering(false);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!collection || !editName.trim()) return;
    await updateCollection(collection.id, {
      name: editName.trim(),
      description: editDescription.trim()
    });
    toast.success('Collection updated');
    setIsEditOpen(false);
  };

  const handleDelete = async () => {
    if (!collection) return;
    await deleteCollection(collection.id);
    toast.success('Collection deleted');
    navigate('/collections');
  };

  const handleRemoveArtwork = async (workId: string | number) => {
    if (!collection) return;
    await removeItemFromCollection(collection.id, String(workId));
    setArtworks(prev => prev.filter(a => String(a.work_id) !== String(workId)));
    toast.success('Artwork removed from collection');
  };

  const handleGenerateShareLink = async () => {
    if (!collection) return;

    try {
      toast.info('Generating secure share link...');
      const { shareToken } = await filemakerApi.createShareLink(collection.uuid);
      const link = `${window.location.origin}/share/${shareToken}`;
      setShareLink(link);
      setIsShareOpen(true);
    } catch (error) {
      console.error('Failed to create share link:', error);
      toast.error('Failed to generate share link');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard');
  };

  const handleExportPDF = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!collection || artworks.length === 0) {
      toast.error('No artworks in collection to export');
      return;
    }

    toast.info('Preparing collection PDF...');

    try {
      const artworksWithImages = await Promise.all(
        artworks.map(async (artwork) => {
          const imageUrl = await resolveArtworkImage(artwork, 'large');
          return { artwork, imageUrl };
        })
      );

      console.log(`[Export] Triggering direct Collection PDF export: ${collection.name}`);
      const loadingToast = toast.info('Generating Collection PDF...');
      const generator = new PdfGenerator();
      await generator.generateCollectionPdf(collection.name, artworksWithImages);
      toast.dismiss(loadingToast);
      toast.success('Collection PDF download started');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate collection PDF');
    }
  };

  const handleDownloadZIP = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!collection || artworks.length === 0) {
      toast.error('No artworks in collection to download');
      return;
    }

    toast.info('Preparing collection ZIP archive...');

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let processedCount = 0;
      const totalWorks = artworks.length;

      // Group by work to handle multiple images per work
      const downloadTasks = artworks.map(async (artwork) => {
        const imageUrls = await resolveArtworkImages(artwork);

        const filePromises = imageUrls.map(async (url, index) => {
          try {
            const response = await robustFetch(url);
            const blob = await response.blob();
            const suffix = imageUrls.length > 1 ? `_${index + 1}` : '';
            const filename = `${artwork.work_name.replace(/[^a-z0-9]/gi, '_')}${suffix}.jpg`;
            zip.file(filename, blob);
          } catch (e) {
            console.warn(`Failed to fetch image for ZIP: ${url}`, e);
          }
        });

        await Promise.all(filePromises);
        processedCount++;
        if (processedCount % 5 === 0) {
          toast.info(`Processing: ${processedCount}/${totalWorks} artworks...`);
        }
      });

      await Promise.all(downloadTasks);

      toast.info('Generating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = `${collection.name}_images.zip`;
      console.log(`[Export] Collection ZIP generated: ${zipBlob.size} bytes`);

      console.log(`[Export] Triggering direct Collection ZIP download: ${filename}`);
      const loadingToast = toast.info('Finalizing Collection ZIP...');
      await saveAs(zipBlob, filename);
      toast.dismiss(loadingToast);
      toast.success('Collection ZIP download started');
    } catch (error) {
      console.error('ZIP generation failed:', error);
      toast.error('Failed to generate ZIP archive');
    }
  };

  if (!collection) {
    return (
      <div className="min-h-screen bg-secondary">
        <Navigation />
        <div className="max-w-6xl mx-auto p-6 text-center py-16">
          <h2 className="text-xl font-semibold">Collection not found</h2>
          <Button onClick={() => navigate('/collections')} className="mt-4">
            Back to Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {isMobile ? <MobileNavigation /> : <Navigation />}

      <div className="max-w-[1440px] mx-auto p-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/collections')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </button>

        {/* Header */}
        <div className="bg-background rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{collection.name}</h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1">{collection.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                {collection.items.length} artworks
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="justify-center">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateShareLink} className="justify-center">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="justify-center">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadZIP} className="justify-center">
                <Download className="h-4 w-4 mr-2" />
                ZIP
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive col-span-2 sm:col-span-1 justify-center">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{collection.name}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Artworks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground text-lg">This collection is empty</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add artworks from the search page
            </p>
            <Button onClick={() => navigate('/search')} className="mt-4">
              Browse Artworks
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={artworks.map(a => String(a.work_id))}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {artworks.map((artwork) => (
                  <SortableArtworkItem
                    key={artwork.work_id}
                    artwork={artwork}
                    onRemove={() => handleRemoveArtwork(artwork.work_id)}
                    onClick={() => setSelectedArtwork(artwork)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Collection Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Collection</DialogTitle>
            <DialogDescription>
              Share this collection with a guest view link. The link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                value={shareLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Guests can view artworks but cannot download or modify the collection.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsShareOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artwork Detail Modal */}
      <ArtworkDetailModal
        artwork={selectedArtwork}
        isOpen={!!selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
        showQuickCollection={false}
      />
    </div>
  );
}
