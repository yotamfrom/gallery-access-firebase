import { useState, useEffect } from 'react';
import { saveAs, robustFetch } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { MobileNavigation } from '@/components/mobile/MobileNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollections, Collection } from '@/contexts/CollectionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  FolderOpen,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Share2,
  Download,
  FileText,
  Copy,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { filemakerApi } from '@/lib/filemaker-api';
import { resolveArtworkImage, resolveArtworkImages } from '@/lib/image-resolver';
import { PdfGenerator } from '@/lib/pdf-generator';
import { Artwork } from '@/types/gallery';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { collections, isLoading, createCollection, updateCollection, deleteCollection, refreshCollections } = useCollections();
  const isMobile = useIsMobile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Share Dialog State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [sharingCollection, setSharingCollection] = useState<Collection | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    refreshCollections();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    const result = await createCollection(newName.trim(), newDescription.trim());
    if (result) {
      toast.success(`Collection "${newName}" created`);
      setNewName('');
      setNewDescription('');
      setIsCreateOpen(false);
    } else {
      toast.error('Failed to create collection');
    }
  };

  const handleEdit = async () => {
    if (!editingCollection || !newName.trim()) return;
    await updateCollection(editingCollection.id, {
      name: newName.trim(),
      description: newDescription.trim()
    });
    toast.success('Collection updated');
    setIsEditOpen(false);
    setEditingCollection(null);
    setNewName('');
    setNewDescription('');
  };

  const handleDelete = async (collection: Collection) => {
    await deleteCollection(collection.id);
    toast.success(`Collection "${collection.name}" deleted`);
  };

  const openEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setNewName(collection.name);
    setNewDescription(collection.description);
    setIsEditOpen(true);
  };

  const handleGenerateShareLink = async (collection: Collection) => {
    try {
      toast.info('Generating secure share link...');
      const { shareToken } = await filemakerApi.createShareLink(collection.uuid);
      const link = `${window.location.origin}/share/${shareToken}`;
      setShareLink(link);
      setSharingCollection(collection);
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

  const fetchCollectionArtworks = async (collection: Collection): Promise<Artwork[]> => {
    if (collection.items.length === 0) return [];

    const result = await filemakerApi.getArtworks({
      ids: collection.items.map(i => String(i.workId))
    }, 100, 0);

    const collectionArtworks = result.artworks;

    // Sort by collection order
    return collection.items.map(item =>
      collectionArtworks.find(a => String(a.work_id) === String(item.workId))
    ).filter(Boolean) as Artwork[];
  };

  const handleExportPDF = async (collection: Collection) => {
    if (collection.items.length === 0) {
      toast.error('No artworks in collection to export');
      return;
    }

    toast.info('Preparing collection PDF...');

    try {
      const artworks = await fetchCollectionArtworks(collection);
      const artworksWithImages = await Promise.all(
        artworks.map(async (artwork) => {
          const imageUrl = await resolveArtworkImage(artwork, 'large');
          return { artwork, imageUrl };
        })
      );

      const generator = new PdfGenerator();
      await generator.generateCollectionPdf(collection.name, artworksWithImages);
      toast.success('Collection PDF generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate collection PDF');
    }
  };

  const handleDownloadZIP = async (collection: Collection) => {
    if (collection.items.length === 0) {
      toast.error('No artworks in collection to download');
      return;
    }

    toast.info('Preparing collection ZIP archive...');

    try {
      const artworks = await fetchCollectionArtworks(collection);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let processedCount = 0;
      const totalWorks = artworks.length;

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

      const filename = `${collection.name.replace(/[^a-z0-9]/gi, '_')}_images.zip`;
      console.log(`[Export] Triggering Collection ZIP download: ${filename}`);
      const loadingToast = toast.info('Finalizing Collection ZIP...');
      await saveAs(zipBlob, filename);
      toast.dismiss(loadingToast);
      toast.success('Collection ZIP download started');
    } catch (error) {
      console.error('ZIP generation failed:', error);
      toast.error('Failed to generate ZIP archive');
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      {isMobile ? <MobileNavigation /> : <Navigation />}

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-8 gap-4`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-semibold text-foreground`}>My Collections</h1>
            <p className="text-muted-foreground mt-1">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <div className={`flex ${isMobile ? 'flex-col-reverse' : 'flex-row'} gap-2 w-full sm:w-auto`}>
              <DialogTrigger asChild>
                <Button className={`gap-2 ${isMobile ? 'w-full mb-2' : ''}`}>
                  <Plus className="h-4 w-4" />
                  New Collection
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
                <DialogDescription>
                  Create a new collection to organize artworks
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Collection Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Exhibition 2024"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add notes about this collection..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Collection</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Collections Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-4">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground">No collections yet</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Create a collection to save and organize artworks for presentations,
                sharing, and export.
              </p>
              <Button className="mt-6 gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Your First Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => navigate(`/collections/${collection.id}`)}
                    >
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {collection.name}
                      </h3>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <span>{collection.items.length} artworks</span>
                        <span>Updated {format(collection.modifiedAt, 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(collection)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateShareLink(collection)}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportPDF(collection)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Export PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadZIP(collection)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download ZIP
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(collection)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Collection</DialogTitle>
              <DialogDescription>
                Share "{sharingCollection?.name}" with a guest view link. The link expires in 7 days.
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
      </div>
    </div>
  );
}
