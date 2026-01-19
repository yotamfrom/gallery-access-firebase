import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { useCollections } from '@/contexts/CollectionsContext';
import { filemakerApi } from '@/lib/filemaker-api';
import { Artwork } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Trash2,
  FolderPlus,
  Plus,
  ImageOff,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickCollectionPageItem } from '@/components/QuickCollectionPageItem';

export default function QuickCollectionPage() {
  const navigate = useNavigate();
  const { items, removeItem, clearAll } = useQuickCollection();
  const { collections, createCollection, addItemToCollection } = useCollections();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');

  useEffect(() => {
    loadArtworks();
  }, [items]);

  const loadArtworks = async () => {
    if (items.length === 0) {
      setArtworks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await filemakerApi.getArtworks({}, 100, 0);
      const filtered = result.artworks.filter(a => items.includes(Number(a.work_id))) as Artwork[];
      setArtworks(filtered);
    } catch (err) {
      console.error('Error loading artworks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }
    const newCol = await createCollection(newCollectionName.trim(), newCollectionDesc.trim(), items);
    if (newCol) {
      toast.success(`Collection "${newCollectionName}" created with ${items.length} artworks`);
      clearAll();
      setIsCreateDialogOpen(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      navigate(`/collections/${newCol.id}`);
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollectionId) {
      toast.error('Please select a collection');
      return;
    }
    const collection = collections.find(c => c.id === selectedCollectionId);
    if (!collection) return;

    let addedCount = 0;

    // We need to wait for all adds to complete
    const params = items.filter(workId => !collection.items.some(i => i.workId === workId));

    for (const workId of params) {
      await addItemToCollection(selectedCollectionId, workId);
      addedCount++;
    }

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} artworks to "${collection.name}"`);
      clearAll();
      setIsAddDialogOpen(false);
      navigate(`/collections/${selectedCollectionId}`);
    } else {
      toast.info('Selected items are already in this collection');
      setIsAddDialogOpen(false);
    }
  };

  const handleClearAll = () => {
    clearAll();
    toast.success('Quick Collection cleared');
  };

  return (
    <div className="min-h-screen bg-secondary">
      <Navigation />

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
              <ShoppingBag className="h-8 w-8" />
              Quick Collection
            </h1>
            <p className="text-muted-foreground mt-1">
              Your temporary selection of artworks
            </p>
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <Card className="text-center py-16">
            <CardContent>
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-4">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground">
                Your Quick Collection is empty
              </h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Browse artworks and click the checkbox to add them to your Quick
                Collection for easy comparison and organization.
              </p>
              <Button
                variant="default"
                className="mt-6"
                onClick={() => navigate('/search')}
              >
                Browse Artworks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Create New Collection */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Collection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Collection</DialogTitle>
                    <DialogDescription>
                      Save these {items.length} artworks to a new collection
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Collection Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Summer Exhibition 2024"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Add notes about this collection..."
                        value={newCollectionDesc}
                        onChange={(e) => setNewCollectionDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCollection}>
                      Create Collection
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add to Existing Collection */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={collections.length === 0}>
                    <FolderPlus className="h-4 w-4" />
                    Add to Existing Collection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to Collection</DialogTitle>
                    <DialogDescription>
                      Select a collection to add these {items.length} artworks
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collections.map(col => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name} ({col.items.length} items)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddToCollection}>Add to Collection</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="flex-1" />

              {/* Clear All */}
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive gap-2"
                onClick={handleClearAll}
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            </div>

            <Separator />

            {/* Artwork List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading artworks...</div>
            ) : (
              <div className="space-y-3">
                {artworks.map((artwork) => (
                  <QuickCollectionPageItem
                    key={artwork.work_id}
                    artwork={artwork}
                    onRemove={(id) => {
                      removeItem(id);
                      toast.success('Removed from Quick Collection');
                    }}
                  />
                ))}
              </div>
            )}

            {/* Info Note */}
            <p className="text-sm text-muted-foreground text-center pt-4">
              Quick Collection is stored in your browser and will be cleared on logout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
