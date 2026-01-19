import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ImageOff } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ImageViewer } from '@/components/ImageViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/Badge';
import { Checkbox } from '@/components/ui/checkbox';
import { QuickCollectionPanel } from '@/components/QuickCollectionPanel';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { filemakerApi } from '@/lib/filemaker-api';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';
import { toast } from 'sonner';
import { PdfGenerator } from '@/lib/pdf-generator';

export default function ArtworkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, hasItem, toggleItem, clearAll } = useQuickCollection();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [holdStatus, setHoldStatus] = useState<'none' | 'yours' | 'other'>('none');

  // Load artwork image regardless of loading state (hook rule)
  const { imageUrl: resolvedImageUrl, images } = useArtworkImage(artwork, 'large');

  useEffect(() => {
    async function loadArtwork() {
      if (!id) return;
      setIsLoading(true);
      try {
        const result = await filemakerApi.getArtwork(id);
        setArtwork(result as Artwork);
      } catch (err) {
        console.error('Error loading artwork:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadArtwork();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Artwork not found</h2>
          <Button onClick={() => navigate('/search')} className="mt-4">
            Back to Search
          </Button>
        </div>
      </div>
    );
  }



  const isSelected = hasItem(Number(artwork.work_id));

  const handleSelect = (checked: boolean) => {
    toggleItem(Number(artwork.work_id));
  };

  const handlePlaceHold = () => {
    setHoldStatus('yours');
    toast.success('30-day hold placed successfully');
  };

  const handleReleaseHold = () => {
    setHoldStatus('none');
    toast.success('Hold released');
  };

  const handleDownloadImage = () => {
    toast.success('Image download started');
  };

  const handleDownloadZIP = () => {
    toast.success('ZIP archive download started');
  };

  const handleExportPDF = async () => {
    if (!artwork) return;
    toast.info('Generating PDF...');
    try {
      const generator = new PdfGenerator();
      // Use the currently displayed image or the resolved one
      const imgToUse = images[currentImageIndex] || resolvedImageUrl || null;
      await generator.generateArtworkPdf(artwork, imgToUse);
      toast.success('PDF downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  const selectedArtworksList = artwork && hasItem(Number(artwork.work_id)) ? [artwork] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-[1440px] mx-auto p-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/search')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Images */}
          <div>
            {images.length > 0 ? (
              <ImageViewer
                images={images}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                artworkName={artwork.work_name}
              />
            ) : (
              <div className="aspect-[3/4] bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageOff className="w-24 h-24 mx-auto mb-4" />
                  <p>No image available</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-8">
            {/* Title and metadata */}
            <div>
              <h1 className="text-2xl font-semibold mb-2">{artwork.work_name}</h1>
              <p className="text-lg text-muted-foreground">
                {artwork.creation_year || 'Unknown year'}
              </p>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-border">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="mt-1">{artwork.work_category || 'N/A'}</p>
              </div>
              {artwork.work_series && (
                <div>
                  <p className="text-sm text-muted-foreground">Series</p>
                  <p className="mt-1">{artwork.work_series}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Inventory Number</p>
                <p className="mt-1">{artwork.work_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="mt-1">{artwork.materials || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dimensions</p>
                <p className="mt-1">{artwork.dimensions || 'N/A'}</p>
              </div>
              {artwork.current_edition_price && (
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="mt-1">€{artwork.current_edition_price.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Edition Info */}
            {artwork.edition_info && (
              <div className="py-4">
                <h3 className="text-sm font-semibold mb-2">Edition Information</h3>
                <p className="text-sm text-muted-foreground">{artwork.edition_info}</p>
              </div>
            )}

            {/* Work Text - Collapsible */}
            {artwork.work_text && (
              <Accordion type="single" collapsible className="border-y border-border">
                <AccordionItem value="work-text" className="border-none">
                  <AccordionTrigger className="py-4 text-sm font-semibold hover:no-underline">
                    About this Work
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 whitespace-pre-wrap">
                    {artwork.work_text}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}


            {/* Quick Collection */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="quick-collection"
                checked={isSelected}
                onCheckedChange={handleSelect}
              />
              <label htmlFor="quick-collection" className="text-sm cursor-pointer">
                Add to Quick Collection
              </label>
            </div>

            {/* Export actions */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4">Export</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadImage}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadZIP}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Collection Panel */}
      <QuickCollectionPanel
        isOpen={quickPanelOpen}
        onClose={() => setQuickPanelOpen(false)}
        artworks={selectedArtworksList}
        onRemove={(artId) => toggleItem(Number(artId))}
        onClear={clearAll}
        onCreateCollection={() => setQuickPanelOpen(false)}
        onAddToCollection={() => setQuickPanelOpen(false)}
      />
    </div>
  );
}
