import { useState, useEffect } from 'react';
import { Artwork } from '@/types/gallery';
import { resolveArtworkImage, resolveArtworkImages } from '@/lib/image-resolver';
import { auth } from '@/lib/firebase';

export function useArtworkImage(artwork: Artwork | null, size: 'small' | 'large' = 'large') {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!artwork) {
            setImageUrl(null);
            setImages([]);
            return;
        }

        // Wait for Firebase Auth to serve the request
        let unsubscribe: (() => void) | undefined;

        try {
            if (auth) {
                unsubscribe = auth.onAuthStateChanged((user) => {
                    if (user) {
                        if (artwork.image_location) {
                            setIsLoading(true);

                            if (size === 'small') {
                                resolveArtworkImage(artwork, 'small')
                                    .then(url => {
                                        setImageUrl(url);
                                        setImages(url ? [url] : []);
                                    })
                                    .catch(err => console.error(err))
                                    .finally(() => setIsLoading(false));
                            } else {
                                resolveArtworkImages(artwork)
                                    .then(urls => {
                                        setImages(urls);
                                        setImageUrl(urls.length > 0 ? urls[0] : null);
                                    })
                                    .catch(err => {
                                        console.error('Error resolving images', err);
                                        setIsLoading(false);
                                    })
                                    .finally(() => setIsLoading(false));
                            }

                        } else if (artwork.image_url) {
                            setImageUrl(artwork.image_url);
                            setImages([artwork.image_url]);
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Error in useArtworkImage auth hook:', e);
            setIsLoading(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [artwork, size]);

    return { imageUrl, images, isLoading };
}
