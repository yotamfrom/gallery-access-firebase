import { DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from '@/components/Badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Artwork } from '@/types/gallery';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, FileText, Download, X } from 'lucide-react';
import { ImageViewer } from '../ImageViewer';

interface MobileArtworkDetailProps {
    artwork: Artwork;
    images: string[];
    currentImageIndex: number;
    setCurrentImageIndex: (index: number) => void;
    isLoading: boolean;
    isSelected: boolean;
    handleSelect: (checked: boolean) => void;
    handleDownloadImage: (e?: React.MouseEvent) => void;
    handleDownloadZIP: (e?: React.MouseEvent) => void;
    handleExportPDF: (e?: React.MouseEvent) => void;
    onClose: () => void;
    showQuickCollection?: boolean;
    isGuest?: boolean;
}

export function MobileArtworkDetail({
    artwork,
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
    showQuickCollection = true,
    isGuest = false
}: MobileArtworkDetailProps) {
    if (!artwork) return null;

    return (
        <DialogContent className="max-w-full w-screen h-[100dvh] p-0 border-none rounded-none flex flex-col overflow-hidden bg-background">
            <div className="sr-only">
                <DialogTitle>{artwork.work_name || 'Artwork Detail'}</DialogTitle>
                <DialogDescription>
                    Artwork details for {artwork.work_name || 'this artwork'}
                </DialogDescription>
            </div>
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex flex-col min-w-0">
                    <h1 className="text-base font-bold truncate pr-4">{artwork.work_name}</h1>
                    <p className="text-[10px] text-muted-foreground uppercase">{artwork.creation_year || 'Recent Work'}</p>
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 border border-zinc-200 rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </DialogClose>
            </div>

            {/* Main Scrollable Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Image Area */}
                <div className="w-full h-[45vh] bg-zinc-50 flex flex-col p-2">
                    <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center bg-zinc-100 animate-pulse">
                                <ImageIcon className="h-10 w-10 opacity-10" />
                            </div>
                        ) : images.length > 0 ? (
                            <ImageViewer
                                images={images}
                                currentIndex={currentImageIndex}
                                onIndexChange={setCurrentImageIndex}
                                artworkName={artwork.work_name}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-zinc-100">
                                <ImageIcon className="h-10 w-10 opacity-20" />
                                <span className="text-[10px] uppercase font-bold opacity-30">No Image</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details section */}
                <div className="p-5 space-y-8 pb-32">
                    {/* Caption */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About the work</h3>
                        <p className="text-sm leading-relaxed font-medium">
                            {[artwork.indd_caption_line_1, artwork.indd_caption_line_2, artwork.indd_caption_line_3]
                                .filter(Boolean)
                                .join(' ')}
                        </p>
                        {artwork.edition_info && (
                            <p className="text-xs text-muted-foreground pt-1">{artwork.edition_info}</p>
                        )}
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <div>
                            <h4 className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Year</h4>
                            <p className="text-sm font-semibold">{artwork.creation_year || '—'}</p>
                        </div>
                        {!isGuest && (
                            <div>
                                <h4 className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Series</h4>
                                <p className="text-sm font-semibold">{artwork.work_series || '—'}</p>
                            </div>
                        )}
                        <div className="col-span-2">
                            <h4 className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Materials</h4>
                            <p className="text-sm font-semibold leading-snug">{artwork.materials || '—'}</p>
                        </div>
                        <div className="col-span-2">
                            <h4 className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Dimensions</h4>
                            <p className="text-sm font-semibold">{artwork.dimensions || '—'}</p>
                        </div>
                        {artwork.current_edition_price && (
                            <div className="col-span-2 pt-2 border-t border-zinc-200">
                                <h4 className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Current Price</h4>
                                <p className="text-lg font-bold">€{Number(artwork.current_edition_price).toLocaleString()}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <Accordion type="single" collapsible className="w-full" defaultValue={isGuest ? "about" : ""}>
                        {showQuickCollection && !isGuest && (
                            <AccordionItem value="qc" className="border-zinc-200">
                                <AccordionTrigger className="text-sm font-bold">Quick Collection</AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-4 bg-zinc-100 rounded-lg flex items-center gap-3">
                                        <Checkbox
                                            id="qc-mobile"
                                            checked={isSelected}
                                            onCheckedChange={(c) => handleSelect(c === true)}
                                            className="h-5 w-5"
                                        />
                                        <label htmlFor="qc-mobile" className="text-sm font-bold">
                                            {isSelected ? 'Ready to collect' : 'Add to collection'}
                                        </label>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}

                        {!isGuest && (
                            <AccordionItem value="export" className="border-zinc-200">
                                <AccordionTrigger className="text-sm font-bold">Export Options</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-3 pt-2">
                                        <Button variant="outline" className="w-full h-12 justify-between border-zinc-200" onClick={handleDownloadImage}>
                                            <span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Image</span>
                                            <Download className="h-4 w-4 opacity-30" />
                                        </Button>
                                        {images.length > 1 && (
                                            <Button variant="outline" className="w-full h-12 justify-between border-zinc-200" onClick={handleDownloadZIP}>
                                                <span className="flex items-center gap-2"><Download className="h-4 w-4" /> All Images (ZIP)</span>
                                                <Download className="h-4 w-4 opacity-30" />
                                            </Button>
                                        )}
                                        <Button variant="outline" className="w-full h-12 justify-between border-zinc-200" onClick={handleExportPDF}>
                                            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> PDF Sheet</span>
                                            <Download className="h-4 w-4 opacity-30" />
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}

                        {artwork.work_text && (
                            <AccordionItem value="about" className="border-none">
                                <AccordionTrigger className="text-sm font-bold">About this Work</AccordionTrigger>
                                <AccordionContent>
                                    <div className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">
                                        {artwork.work_text}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}
                    </Accordion>
                </div>
            </div>
        </DialogContent>
    );
}
