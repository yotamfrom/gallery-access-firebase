import { storage } from './firebase';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { Artwork } from '@/types/gallery';

function getStorageContext(artwork: Artwork, size: 'small' | 'large') {
    // 0. Resolve Category Slug
    let categorySlug = 'others';
    if (artwork.work_category) {
        const lowerCat = artwork.work_category.toLowerCase();
        const FOLDER_MAP: Record<string, string> = {
            'color prints': 'colorprints',
            'colorprints': 'colorprints',
            'etching painting': 'etching-painting',
            'etching-painting': 'etching-painting',
            'salt works': 'saltworks',
            'saltworks': 'saltworks',
            'sculptures': 'sculpters',
            'sculpters': 'sculpters',
            'others': 'others',
            'videos': 'videos'
        };

        if (FOLDER_MAP[lowerCat]) categorySlug = FOLDER_MAP[lowerCat];
        else if (FOLDER_MAP[lowerCat.replace(/\s+/g, '')]) categorySlug = FOLDER_MAP[lowerCat.replace(/\s+/g, '')];
        else categorySlug = lowerCat;
    }

    // 1. Determine Folder and Filename
    let folderPath = '';
    let filename = '';

    if (artwork.image_location) {
        const rawPath = artwork.image_location.replace(/\\/g, '/');
        const parts = rawPath.split('/');

        if (parts.length >= 2) {
            // Case 1: "folder/image.jpg"
            filename = parts.pop()!;
            folderPath = `${parts.join('/').toLowerCase()}/${size}`;
        } else {
            // Case 2: "image.jpg"
            filename = parts[0];
            folderPath = `${categorySlug}/${size}`;
        }
        return { folderPath, filename };
    }

    return null;
}

export async function resolveArtworkImage(artwork: Artwork, size: 'small' | 'large' = 'large'): Promise<string | null> {
    if (!storage) {
        console.warn('Firebase Storage not initialized');
        return null;
    }

    const context = getStorageContext(artwork, size);
    if (!context) return null;

    const { folderPath, filename } = context;
    const finalPath = `${folderPath}/${filename}`;

    try {
        const imageRef = ref(storage, finalPath);
        return await getDownloadURL(imageRef);
    } catch (error) {
        // Fallback: try lowercase filename
        if (filename !== filename.toLowerCase()) {
            try {
                const lowerPath = `${folderPath}/${filename.toLowerCase()}`;
                const retryRef = ref(storage, lowerPath);
                return await getDownloadURL(retryRef);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
}

export async function resolveArtworkImages(artwork: Artwork): Promise<string[]> {
    if (!storage) {
        console.warn('Firebase Storage not initialized');
        return [];
    }

    // We only look for multiple images in the 'large' size directory
    const context = getStorageContext(artwork, 'large');
    if (!context) return [];

    const { folderPath, filename } = context;

    // Base name matching logic:
    // If filename is "2024_adam_after_rodin_1.jpg", derive base as "2024_adam_after_rodin"
    // to match all variants: _1.jpg, _2.jpg, _3.jpg, etc.

    // Step 1: Remove extension
    let baseName = filename.substring(0, filename.lastIndexOf('.'));

    // Step 2: Remove trailing _<number> pattern if present
    // This handles cases like "2024_adam_after_rodin_1" -> "2024_adam_after_rodin"
    const trailingNumberPattern = /_\d+$/;
    if (trailingNumberPattern.test(baseName)) {
        baseName = baseName.replace(trailingNumberPattern, '');
    }

    const baseNameLower = baseName.toLowerCase();

    try {
        const folderRef = ref(storage, folderPath);
        const res = await listAll(folderRef);

        // Filter items that start with the base name (case insensitive)
        const matches = res.items.filter(itemRef => {
            const itemBase = itemRef.name.substring(0, itemRef.name.lastIndexOf('.')); // Strip extension
            return itemBase.toLowerCase().startsWith(baseNameLower);
            // stricter check: 
            // starts with baseName
            // AND (is exactly match, OR char after baseName is '_') 
            // This prevents "Title" matching "TitleDifferentWork"
            // But spec says: "2015_Work Name" matching "2015_Work Name_2"
            // So:
            // if (itemBase.toLowerCase() === baseNameLower) return true;
            // if (itemBase.toLowerCase().startsWith(baseNameLower + '_')) return true;
            // return false;
        });

        // Refined filter with separator check to avoid partial prefix matches on different works
        const exactMatches = matches.filter(itemRef => {
            const nameLower = itemRef.name.toLowerCase();
            const baseLower = baseNameLower;

            // It matches if:
            // 1. It starts with the base name
            if (!nameLower.startsWith(baseLower)) return false;

            // 2. The rest is either just extension OR starts with separator '_'
            const rest = nameLower.slice(baseLower.length);
            // rest might be ".jpg" or "_2.jpg"
            return rest.startsWith('.') || rest.startsWith('_');
        });

        // Sort: 
        // We want the main image (exact match baseName + extension) first.
        // Then others sorted alphabetically.
        exactMatches.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            // Check if one is the main file (e.g. "base.jpg")
            const aIsMain = aName.startsWith(baseNameLower + '.');
            const bIsMain = bName.startsWith(baseNameLower + '.');

            if (aIsMain && !bIsMain) return -1;
            if (!aIsMain && bIsMain) return 1;

            return aName.localeCompare(bName);
        });

        // Resolve all URLs
        const urls = await Promise.all(exactMatches.map(ref => getDownloadURL(ref)));
        return urls;

    } catch (e) {
        console.error('Error listing images for artwork:', artwork.work_name, e);
        // Fallback: just return the single resolved image if possible
        const single = await resolveArtworkImage(artwork, 'large');
        return single ? [single] : [];
    }
}
