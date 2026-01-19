import { DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Image as ImageIcon, FileText, Download } from 'lucide-react';
import { ImageViewer } from './ImageViewer';

interface DesktopArtworkDetailProps {
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

export function DesktopArtworkDetail({
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
}: DesktopArtworkDetailProps) {
    if (!artwork) return null;

    return (
        <DialogContent className={cn(
            "max-w-screen-xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col",
            isGuest ? "bg-white rounded-none border-zinc-100 shadow-none" : "bg-background rounded-lg"
        )}>
            <div className="sr-only">
                <DialogTitle>{artwork.work_name || 'Artwork Detail'}</DialogTitle>
                <DialogDescription>
                    Artwork details for {artwork.work_name || 'this artwork'}
                </DialogDescription>
            </div>
            {/* Header Bar */}
            <div className={cn(
                "flex items-center justify-between px-6 py-4 border-b shrink-0",
                isGuest ? "border-zinc-100 py-6" : "border-border"
            )}>
                <div className="flex flex-col">
                    <h1 className={cn(
                        "tracking-tight",
                        isGuest ? "text-xl font-normal italic" : "text-xl font-bold"
                    )}>{artwork.work_name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        {!isGuest && (
                            <Badge variant="category" className="text-[10px] py-0 px-2 h-5">{artwork.work_category || 'Artwork'}</Badge>
                        )}
                        {artwork.creation_year && (
                            <span className={cn(
                                "text-muted-foreground",
                                isGuest ? "text-[11px] font-light uppercase tracking-widest" : "text-xs"
                            )}>{artwork.creation_year}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-row flex-1 overflow-hidden">
                {/* Left: Image Area */}
                <div className={cn(
                    "flex-1 overflow-hidden flex flex-col p-4",
                    isGuest ? "bg-white" : "bg-secondary/5"
                )}>
                    <div className="flex-1 min-h-0">
                        {isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center bg-secondary/10 rounded-lg animate-pulse">
                                <ImageIcon className="h-12 w-12 mb-2 opacity-10 text-muted-foreground" />
                            </div>
                        ) : images.length > 0 ? (
                            <ImageViewer
                                images={images}
                                currentIndex={currentImageIndex}
                                onIndexChange={setCurrentImageIndex}
                                artworkName={artwork.work_name}
                            />
                        ) : (
                            <div className={cn(
                                "h-full flex flex-col items-center justify-center",
                                isGuest ? "bg-zinc-50 rounded-none" : "bg-secondary/10 rounded-lg"
                            )}>
                                <ImageIcon className="h-12 w-12 mb-2 opacity-20 text-muted-foreground" />
                                <span className="text-xs uppercase tracking-wider opacity-50">No Image</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details Area */}
                <div className={cn(
                    "w-[420px] shrink-0 border-l overflow-y-auto flex flex-col",
                    isGuest ? "border-zinc-100 bg-white" : "border-border bg-background"
                )}>
                    <div className={cn(
                        "p-6 space-y-8",
                        isGuest && "text-black"
                    )}>
                        {/* Content exactly as before */}
                        <div>
                            <h3 className={cn(
                                "mb-2",
                                isGuest ? "text-[11px] uppercase tracking-widest font-medium text-zinc-400" : "text-sm font-semibold"
                            )}>Caption</h3>
                            <p className={cn(
                                "leading-relaxed",
                                isGuest ? "text-[13px] font-light" : "text-sm"
                            )}>
                                {[artwork.indd_caption_line_1, artwork.indd_caption_line_2, artwork.indd_caption_line_3]
                                    .filter(Boolean)
                                    .join(' ')}
                            </p>
                        </div>

                        {artwork.edition_info && (
                            <div className="space-y-1">
                                <h3 className={cn(
                                    isGuest ? "text-[11px] uppercase tracking-widest font-medium text-zinc-400" : "text-sm font-semibold"
                                )}>Edition Information</h3>
                                <p className={cn(
                                    isGuest ? "text-[13px] font-light" : "text-sm text-muted-foreground"
                                )}>{artwork.edition_info}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <h4 className={cn(
                                    "mb-1",
                                    isGuest ? "text-[10px] uppercase tracking-widest font-normal text-zinc-300" : "text-xs text-muted-foreground"
                                )}>Year</h4>
                                <p className={cn(
                                    isGuest ? "text-[13px] font-light" : "text-sm font-medium"
                                )}>{artwork.creation_year || '—'}</p>
                            </div>
                            {!isGuest && (
                                <div>
                                    <h4 className={cn(
                                        "mb-1",
                                        isGuest ? "text-[10px] uppercase tracking-widest font-normal text-zinc-300" : "text-xs text-muted-foreground"
                                    )}>Series</h4>
                                    <p className={cn(
                                        isGuest ? "text-[13px] font-light" : "text-sm font-medium"
                                    )}>{artwork.work_series || '—'}</p>
                                </div>
                            )}
                            {artwork.current_edition_price && (
                                <div className="col-span-2 pt-4 border-t border-zinc-100">
                                    <h4 className={cn(
                                        "mb-1",
                                        isGuest ? "text-[10px] uppercase tracking-widest font-normal text-zinc-300" : "text-xs text-muted-foreground"
                                    )}>Current Price</h4>
                                    <p className={cn(
                                        "font-bold",
                                        isGuest ? "text-xl text-black" : "text-sm"
                                    )}>€{Number(artwork.current_edition_price).toLocaleString()}</p>
                                </div>
                            )}
                        </div>

                        <Accordion type="single" collapsible className="w-full" defaultValue={isGuest ? "about-work" : (showQuickCollection ? "quick-collection" : "")}>
                            {artwork.work_text && (
                                <AccordionItem value="about-work" className={cn(isGuest && "border-zinc-100")}>
                                    <AccordionTrigger className={cn(
                                        "hover:no-underline",
                                        isGuest ? "text-[11px] uppercase tracking-widest font-medium text-zinc-400" : "text-sm font-semibold"
                                    )}>About this Work</AccordionTrigger>
                                    <AccordionContent>
                                        <div className={cn(
                                            "whitespace-pre-wrap leading-relaxed",
                                            isGuest ? "text-[13px] font-light text-zinc-600" : "text-sm text-muted-foreground"
                                        )}>
                                            {artwork.work_text}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                            {showQuickCollection && !isGuest && (
                                <AccordionItem value="quick-collection">
                                    <AccordionTrigger className="hover:no-underline text-sm font-semibold">Quick Collection</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-secondary/30 rounded-lg flex items-center gap-3">
                                            <Checkbox
                                                id="qc-modal-desktop"
                                                checked={isSelected}
                                                onCheckedChange={(c) => handleSelect(c === true)}
                                            />
                                            <label htmlFor="qc-modal-desktop" className="text-sm font-medium cursor-pointer">
                                                Add to Quick Collection
                                            </label>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {!isGuest && (
                                <AccordionItem value="export-options">
                                    <AccordionTrigger className="hover:no-underline text-sm font-semibold">Export Options</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-1">
                                            <Button variant="outline" className="w-full justify-start h-10 px-4" onClick={handleDownloadImage}>
                                                <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                Export Current Image
                                            </Button>
                                            {images.length > 1 && (
                                                <Button variant="outline" className="w-full justify-start h-10 px-4" onClick={handleDownloadZIP}>
                                                    <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                                                    Download All Images (ZIP)
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
                        </Accordion>
                    </div>
                </div>
            </div>
        </DialogContent>
    );
}
