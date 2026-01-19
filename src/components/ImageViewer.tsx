import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
    images: string[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    artworkName: string;
}

export function ImageViewer({ images, currentIndex, onIndexChange, artworkName }: ImageViewerProps) {
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

    const currentImage = images[currentIndex] || null;
    const hasMultiple = images.length > 1;

    // Navigate to previous image
    const goToPrevious = useCallback(() => {
        if (hasMultiple) {
            onIndexChange(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
        }
    }, [currentIndex, images.length, hasMultiple, onIndexChange]);

    // Navigate to next image
    const goToNext = useCallback(() => {
        if (hasMultiple) {
            onIndexChange(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
        }
    }, [currentIndex, images.length, hasMultiple, onIndexChange]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target !== document.body) return;

            switch (e.key) {
                case 'ArrowLeft':
                    goToPrevious();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    goToNext();
                    e.preventDefault();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext]);

    // Touch gestures for swipe navigation
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touchEnd = e.changedTouches[0];
        const deltaX = touchEnd.clientX - touchStart.x;
        const deltaY = Math.abs(touchEnd.clientY - touchStart.y);

        if (Math.abs(deltaX) > 50 && deltaY < 30) {
            if (deltaX > 0) {
                goToPrevious();
            } else {
                goToNext();
            }
        }

        setTouchStart(null);
    };

    // Preload adjacent images
    useEffect(() => {
        if (hasMultiple && currentImage) {
            const preloadIndexes = [
                currentIndex > 0 ? currentIndex - 1 : images.length - 1,
                currentIndex < images.length - 1 ? currentIndex + 1 : 0,
            ];

            preloadIndexes.forEach(index => {
                const img = new Image();
                img.src = images[index];
            });
        }
    }, [currentIndex, images, hasMultiple, currentImage]);

    if (!currentImage) {
        return (
            <div className="h-full w-full bg-secondary/10 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-sm opacity-50">Image unavailable</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div
                className="flex-1 min-h-0 bg-secondary rounded-lg overflow-hidden group relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    src={currentImage}
                    alt={artworkName}
                    className="w-full h-full object-contain"
                />

                {/* Navigation Arrows */}
                {hasMultiple && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={goToPrevious}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={goToNext}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </>
                )}
            </div>

            {/* Thumbnail strip */}
            {hasMultiple && (
                <div className="flex gap-2 overflow-x-auto py-2 mt-2 shrink-0">
                    {images.map((img, index) => (
                        <button
                            key={index}
                            onClick={() => onIndexChange(index)}
                            className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden transition-all ${currentIndex === index
                                ? 'ring-2 ring-primary'
                                : 'opacity-60 hover:opacity-100'
                                }`}
                        >
                            <img
                                src={img}
                                alt={`View ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
