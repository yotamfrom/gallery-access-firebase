import { useState, useEffect } from 'react';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { Artwork } from '@/types/gallery';
import { useArtworkImage } from '@/hooks/useArtworkImage';
import { useQuickCollection } from '@/contexts/QuickCollectionContext';
import { toast } from 'sonner';
import { PdfGenerator } from '@/lib/pdf-generator';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileArtworkDetail } from './mobile/MobileArtworkDetail';
import { DesktopArtworkDetail } from './DesktopArtworkDetail';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { filemakerApi } from '@/lib/filemaker-api';
import { saveAs, robustFetch } from '@/lib/utils';

interface ArtworkDetailModalProps {
    artwork: Artwork | null;
    isOpen: boolean;
    onClose: () => void;
    showQuickCollection?: boolean;
    isGuest?: boolean;
}

export function ArtworkDetailModal({
    artwork: initialArtwork,
    isOpen,
    onClose,
    showQuickCollection = true,
    isGuest = false
}: ArtworkDetailModalProps) {
    const { hasItem, toggleItem } = useQuickCollection();
    const isMobile = useIsMobile();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [internalArtwork, setInternalArtwork] = useState<Artwork | null>(initialArtwork);

    // Update internal artwork when initial prop changes
    useEffect(() => {
        setInternalArtwork(initialArtwork);
        setCurrentImageIndex(0);

        // Fetch full details if work_text is missing (common in list view)
        if (initialArtwork && !initialArtwork.work_text) {
            const fetchFullDetails = async () => {
                try {
                    const fullArtwork = await filemakerApi.getArtwork(initialArtwork.work_id);
                    if (fullArtwork) {
                        setInternalArtwork(prev => ({ ...prev, ...fullArtwork }));
                    }
                } catch (err) {
                    console.error('Failed to fetch full artwork details:', err);
                }
            };
            fetchFullDetails();
        }
    }, [initialArtwork?.work_id, initialArtwork]); // Re-run if ID or object changes

    // Removal of focus diagnostics for simplicity as we return to standard flow
    const { imageUrl, images, isLoading } = useArtworkImage(internalArtwork, 'large');
    const isSelected = internalArtwork ? hasItem(Number(internalArtwork.work_id)) : false;

    if (!internalArtwork) return null;

    const handleSelect = (checked: boolean) => {
        toggleItem(Number(internalArtwork.work_id));
    };

    const handleDownloadImage = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const imageToDownload = images[currentImageIndex];
        if (!imageToDownload) {
            toast.error('No image to download');
            return;
        }

        try {
            const loadingToast = toast.info('Preparing image download...');

            const response = await robustFetch(imageToDownload);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const blob = await response.blob();
            const filename = `${internalArtwork.work_name}_${currentImageIndex + 1}.jpg`;
            console.log(`[Export] Image blob fetched: ${blob.size} bytes`);

            toast.dismiss(loadingToast);
            await saveAs(blob, filename);
            toast.success('Image download started');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download image');
        }
    };

    const handleDownloadZIP = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (images.length === 0) {
            toast.error('No images to download');
            return;
        }

        try {
            const loadingToast = toast.info(`Preparing ZIP archive for ${images.length} image(s)...`);
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();

            const downloadPromises = images.map(async (imageUrl, index) => {
                try {
                    const response = await robustFetch(imageUrl);

                    if (!response.ok) {
                        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                    }

                    const blob = await response.blob();
                    const filename = `${internalArtwork.work_name.replace(/[^a-z0-9]/gi, '_')}_${index + 1}.jpg`;
                    zip.file(filename, blob);
                } catch (err) {
                    console.error(`[Export] Failed to add image ${index} to ZIP:`, err);
                    // Continue with other images even if one fails
                }
            });

            await Promise.all(downloadPromises);

            // Check if any files were actually added
            if (Object.keys(zip.files).length === 0) {
                throw new Error("No images could be downloaded for the archive. Please check your network or CORS settings.");
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });

            const filename = `${internalArtwork.work_name}_images.zip`;
            console.log(`[Export] ZIP generated: ${zipBlob.size} bytes`);

            toast.dismiss(loadingToast);
            await saveAs(zipBlob, filename);
            toast.success('ZIP download started');
        } catch (error: any) {
            console.error('ZIP download failed:', error);
            toast.dismiss();
            toast.error(error.message || 'Failed to create ZIP archive');
        }
    };

    const handleExportPDF = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!internalArtwork) return;
        console.log(`[Export] PDF requested for: ${internalArtwork.work_name}`);
        const loadingToast = toast.info('Generating PDF Sheet...');
        try {
            const generator = new PdfGenerator();
            const imgToUse = images[currentImageIndex] || imageUrl || null;
            await generator.generateArtworkPdf(internalArtwork, imgToUse);
            toast.dismiss(loadingToast);
            toast.success('PDF download started');
        } catch (e) {
            console.error('[Export] PDF failed:', e);
            toast.error('Failed to generate PDF');
        }
    };

    const commonProps = {
        artwork: internalArtwork,
        images,
        currentImageIndex,
        setCurrentImageIndex,
        isLoading,
        isSelected,
        handleSelect,
        handleDownloadImage,
        handleDownloadZIP,
        handleExportPDF,
        onClose,
        showQuickCollection,
        isGuest
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <ErrorBoundary fallback={
                <div className="p-8 flex items-center justify-center text-center">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Unavailable</h3>
                        <p className="text-muted-foreground">This artwork cannot be displayed right now.</p>
                        <button onClick={onClose} className="mt-4 text-primary hover:underline">Close</button>
                    </div>
                </div>
            }>
                {isMobile ? (
                    <MobileArtworkDetail {...commonProps} />
                ) : (
                    <DesktopArtworkDetail {...commonProps} />
                )}
            </ErrorBoundary>
        </Dialog>
    );
}
