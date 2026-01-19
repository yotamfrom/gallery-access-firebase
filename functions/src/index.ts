import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from 'firebase-admin';
import { TOTP, Secret } from 'otpauth';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Define Secrets
// Data mapping helpers
function mapArtwork(record: any): any {
    const fieldData = record.fieldData || record;
    const h = fieldData.dimensions_work_h;
    const w = fieldData.dimensions_work_w;
    const l = fieldData.dimensions_work_L;
    const dimensions = [h, w, l].filter(Boolean).join(' x ') || null;

    return {
        work_id: fieldData.studio_work_inventory_no_pk || record.recordId,
        work_name: fieldData.work_name || 'Untitled',
        creation_year: fieldData.creation_year || null,
        work_category: fieldData.work_category || null,
        work_series: fieldData['Work Series'] || null,
        materials: fieldData['materials_for caption'] || null,
        dimensions_h: h || null,
        dimensions_w: w || null,
        dimensions_l: l || null,
        dimensions: dimensions,
        current_edition_price: fieldData['current edition price'] || null,
        available_for_sale: fieldData['Available for sale'] === 'yes',
        image_url: fieldData.pic || fieldData.image_url || fieldData.ImageURL || null,
        image_location: fieldData['Work IMG Path'] || fieldData['work img path'] || fieldData['Work img path'] || fieldData['work_img_path'] || null,
        thumbnail_url: fieldData.pic || fieldData.thumbnail_url || fieldData.ThumbnailURL || null,
        indd_caption_line_1: fieldData['indd_caption_line 1'] || null,
        indd_caption_line_2: fieldData['indd_caption_line 2'] || null,
        indd_caption_line_3: fieldData['indd_caption_line 3'] || null,
        edition_info: fieldData['edition info'] || null,
        work_text: fieldData['Work Text'] || null,
        produced_edition: fieldData['produced Edition'] || null,
    };
}

function mapCollection(record: any): any {
    const fieldData = record.fieldData || record;
    return {
        recordId: record.recordId,
        collection_id: fieldData.collection_id || record.recordId,
        CollectionName: fieldData.CollectionName,
        Description: fieldData.Description,
        itemCount: fieldData.itemCount || 0,
        CreatedAt: fieldData.CreationTimestamp || fieldData.Created || fieldData['Creation Timestamp'] || fieldData.CreationTimestamp,
        gallery_id_fk: fieldData.gallery_id_fk
    };
}

const ADMIN_EMAIL = 'yotamfr@gmail.com';

function mapGallery(record: any): any {
    const fieldData = record.fieldData || record;
    const gallery_id = fieldData.gallery_id || record.recordId;
    return {
        gallery_id: gallery_id ? String(gallery_id) : '',
        GalleryName: fieldData.GalleryName || 'Unknown Gallery',
        Username: fieldData.Gallery_User_Name || '',
        Email: fieldData.Gallery_User_Name || '',
        Phone: fieldData.Phone || '',
        Notes: fieldData.Notes || '',
        User_uid: fieldData.User_uid || fieldData.User_uID || '',
        IsActive: true, // Default to true if authenticated
        lastSynced: new Date()
    };
}

function mapCollectionItem(record: any): any {
    const fieldData = record.fieldData || record;
    return {
        fm_record_id: record.recordId,
        collection_item_id: fieldData.collection_item_id || fieldData.primaryKey || record.recordId,
        collection_id_fk: fieldData.collection_id_fk,
        work_id_fk: fieldData.studio_work_inventory_no_fk || fieldData.work_inventory_no || fieldData.work_id_fk,
        SortOrder: fieldData.SortOrder || 0
    };
}

interface FileMakerResponse {
    response?: {
        data?: any[];
        recordId?: string;
        dataInfo?: {
            foundCount?: number;
        };
    };
    messages?: { code: string; message: string }[];
}

async function createCollection(
    token: string,
    name: string,
    description: string,
    galleryId: string
): Promise<any> {
    console.log('Creating collection:', name, 'for gallery:', galleryId);

    try {
        const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/records`;

        const body = {
            fieldData: {
                CollectionName: name,
                Description: description,
                gallery_id_fk: galleryId,
                IsActive: 1
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FM Error ${response.status}: ${errorText}`);
        }

        const data: FileMakerResponse = await response.json();
        const recordId = data.response?.recordId;

        // Fetch the record again to get the auto-generated collection_id (UUID)
        let collectionUuid = recordId;
        try {
            const getUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/records/${recordId}`;
            const getResp = await fetch(getUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getResp.ok) {
                const getData = await getResp.json();
                const fieldData = getData.response?.data?.[0]?.fieldData;
                collectionUuid = fieldData?.collection_id || recordId;
            }
        } catch (e) {
            console.warn('Failed to fetch newly created collection UUID, using recordId:', e);
        }

        return {
            success: true,
            recordId: recordId,
            collectionId: collectionUuid
        };

    } catch (error) {
        console.error('Error in createCollection:', error);
        throw error;
    }
}

async function addToCollection(
    token: string,
    collectionId: string,
    artworkIds: string[]
): Promise<any> {
    console.log(`Adding ${artworkIds.length} items to collection ${collectionId}`);

    try {
        const responseItems = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/_find`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: [{ collection_id_fk: collectionId }] })
        });

        let existingItems: any[] = [];
        if (responseItems.ok) {
            const dataItems = await responseItems.json();
            existingItems = dataItems.response?.data || [];
        }

        const existingWorkIds = new Set(existingItems.map(item => String(item.fieldData?.studio_work_inventory_no_fk)));
        const newArtworkIds = artworkIds.filter(id => !existingWorkIds.has(String(id)));

        if (newArtworkIds.length === 0) {
            return { success: true, addedCount: 0, message: 'All items already exist in collection' };
        }

        const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/records`;
        const results = await Promise.all(newArtworkIds.map(async (workId) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fieldData: { collection_id_fk: collectionId, studio_work_inventory_no_fk: workId } })
            });
            return { workId, success: res.ok };
        }));

        const failures = results.filter(r => !r.success);
        return { success: failures.length === 0, addedCount: results.length - failures.length, failures };
    } catch (error) {
        console.error('Error in addToCollection:', error);
        throw error;
    }
}

async function getGalleryIdFromUid(uid: string): Promise<string | null> {
    console.log(`[getGalleryIdFromUid] Looking up gallery for UID: ${uid}`);
    try {
        const galleriesRef = db.collection('galleries');
        const snapshot = await galleriesRef.where('User_uid', '==', uid).limit(1).get();

        if (snapshot.empty) {
            console.log(`[getGalleryIdFromUid] No gallery found for UID: ${uid}`);
            return null;
        }

        const doc = snapshot.docs[0];
        return doc.id; // The doc ID is the gallery_id
    } catch (error) {
        console.error('[getGalleryIdFromUid] Firestore lookup error:', error);
        return null;
    }
}

async function verifyCollectionOwnership(
    token: string,
    idOrUuid: string,
    galleryId: string
): Promise<{ recordId: string; collectionId: string } | null> {
    try {
        // 1. Try finding by UUID if it looks like one
        if (typeof idOrUuid === 'string' && idOrUuid.includes('-')) {
            const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/_find`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: [{ collection_id: `==${idOrUuid}`, gallery_id_fk: galleryId }] })
            });

            if (response.ok) {
                const data = await response.json();
                const record = data.response?.data?.[0];
                if (record) {
                    return {
                        recordId: String(record.recordId),
                        collectionId: String(record.fieldData.collection_id)
                    };
                }
            }
        }

        // 2. Try fetching by recordId
        const recordUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/records/${idOrUuid}`;
        const recordResponse = await fetch(recordUrl, { headers: { 'Authorization': `Bearer ${token}` } });

        if (recordResponse.ok) {
            const data = await recordResponse.json();
            const record = data.response?.data?.[0];
            const owner = record?.fieldData?.gallery_id_fk;

            if (String(owner) === String(galleryId)) {
                return {
                    recordId: String(record.recordId),
                    collectionId: String(record.fieldData.collection_id)
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error in verifyCollectionOwnership:', error);
        return null;
    }
}

async function updateCollection(token: string, collectionId: string, updates: any) {
    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/records/${collectionId}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fieldData: { CollectionName: updates.name, Description: updates.description } })
    });
    if (!response.ok) throw new Error(`Update failed: ${await response.text()}`);
    return { success: true };
}

async function deleteCollection(token: string, recordId: string, collectionUuid: string) {
    // 1. Clean up items
    const findItemsUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/_find`;
    const findItemsResponse = await fetch(findItemsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: [{ collection_id_fk: collectionUuid }] })
    });

    if (findItemsResponse.ok) {
        const itemsData = await findItemsResponse.ok ? await findItemsResponse.json() : { response: { data: [] } };
        const records = itemsData.response?.data || [];
        await Promise.all(records.map(async (r: any) => {
            await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/records/${r.recordId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }));
    }

    // 2. Delete collection
    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/records/${recordId}`;
    const response = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Delete failed: ${await response.text()}`);
    return { success: true };
}

async function removeFromCollection(token: string, collectionId: string, workId: string) {
    const findUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/_find`;
    const findResponse = await fetch(findUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: [{ collection_id_fk: collectionId, studio_work_inventory_no_fk: workId }] })
    });

    if (!findResponse.ok) return { success: false, message: 'Item not found' };

    const findData = await findResponse.json();
    const records = findData.response?.data || [];
    await Promise.all(records.map(async (r: any) => {
        await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/records/${r.recordId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }));

    return { success: true };
}

async function updateCollectionItemsOrder(token: string, items: { recordId: string, SortOrder: number }[]) {
    await Promise.all(items.map(async (item) => {
        const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/records/${item.recordId}`;
        await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ fieldData: { SortOrder: item.SortOrder } })
        });
    }));
    return { success: true, count: items.length };
}

async function createShareLink(token: string, collectionId: string) {
    const shareToken = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);
    const dateStr = `${(expiryDate.getMonth() + 1).toString().padStart(2, '0')}/${expiryDate.getDate().toString().padStart(2, '0')}/${expiryDate.getFullYear()}`;

    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Shares/records`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fieldData: { collection_id_fk: collectionId, share_token: shareToken, expiry_date: dateStr } })
    });

    if (!response.ok) throw new Error(`Share link creation failed: ${await response.text()}`);
    return { success: true, shareToken };
}

async function getCollectionItems(
    token: string,
    collectionId: string
): Promise<any[]> {
    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Items/_find`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            query: [{ collection_id_fk: collectionId }],
            sort: [{ fieldName: 'SortOrder', sortOrder: 'ascend' }],
            limit: 500
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            const data = JSON.parse(errorText);
            if (data.messages?.[0]?.code === '401') return [];
        } catch (e) { }
        throw new Error(`FM Error ${response.status}: ${errorText}`);
    }

    const data: FileMakerResponse = await response.json();
    const records = data.response?.data || [];
    return records.map(mapCollectionItem);
}

async function getSharedCollection(token: string, shareToken: string) {
    console.log('Fetching shared collection for token:', shareToken);

    // 1. Find share
    const findShareUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collection_Shares/_find`;
    const findShareResponse = await fetch(findShareUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: [{ share_token: shareToken }] })
    });

    if (!findShareResponse.ok) throw new Error('Invalid or expired share link');
    const shareData: FileMakerResponse = await findShareResponse.json();
    const shareRecord = shareData.response?.data?.[0]?.fieldData;
    if (!shareRecord) throw new Error('Share link not found');

    // 2. Check expiry
    const expiryDate = new Date(shareRecord.expiry_date);
    if (expiryDate < new Date()) {
        throw new Error('Share link has expired');
    }

    const collectionId = shareRecord.collection_id_fk;

    // 3. Get collection - try find by UUID first
    const findColUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/_find`;
    const findColResponse = await fetch(findColUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: [{ collection_id: collectionId }] })
    });

    if (!findColResponse.ok) throw new Error('Collection no longer exists');
    const findColData: FileMakerResponse = await findColResponse.json();
    const collectionRecord = findColData.response?.data?.[0]?.fieldData;
    const actualRecordId = findColData.response?.data?.[0]?.recordId;
    if (!collectionRecord) throw new Error('Collection details not found');

    // 4. Get items
    const rawItems = await getCollectionItems(token, collectionId);

    // 5. Fetch gallery info for branding
    const galleryId = collectionRecord.gallery_id_fk;
    let galleryName = 'Unknown Gallery';
    try {
        const galUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Galleries/_find`;
        const galResp = await fetch(galUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ query: [{ gallery_id: galleryId }] })
        });
        if (galResp.ok) {
            const galData = await galResp.json();
            galleryName = galData.response?.data?.[0]?.fieldData?.GalleryName || galleryName;
        }
    } catch (e) {
        console.warn('Failed to fetch gallery branding info:', e);
    }

    // 6. Fetch full artwork details for each item
    const artworkIds = rawItems.map(item => String(item.work_id_fk));
    let fullArtworks: any[] = [];
    if (artworkIds.length > 0) {
        const worksUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Work Info/_find`;
        const worksResp = await fetch(worksUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                query: artworkIds.map(id => ({ studio_work_inventory_no_pk: id })),
                limit: artworkIds.length.toString()
            })
        });
        if (worksResp.ok) {
            const worksData = await worksResp.json();
            const artworksRecords = worksData.response?.data || [];
            const artworksMap = new Map(artworksRecords.map((r: any) => [String(r.fieldData.studio_work_inventory_no_pk), mapArtwork(r)]));
            fullArtworks = rawItems.map((item: any) => ({
                ...(artworksMap.get(String(item.work_id_fk)) as object),
                SortOrder: item.SortOrder
            })).filter((a: any) => a?.work_id);
        }
    }

    return {
        collection: {
            id: collectionId,
            recordId: actualRecordId,
            name: collectionRecord.CollectionName,
            description: collectionRecord.Description,
            galleryName,
            items: fullArtworks
        }
    };
}

async function getLayoutMetadata(
    token: string,
    layout: string
): Promise<any> {
    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/${encodeURIComponent(layout)}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Metadata failed: ${await response.text()}`);
    const data = await response.json();
    return data.response?.fieldMetaData || [];
}

async function validateGalleryCredentials(
    token: string,
    username: string,
    password: string
): Promise<{ success: boolean; galleryId?: string; galleryName?: string; error?: string }> {
    console.log('Validating gallery credentials for:', username);

    try {
        const response = await fetch(
            `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Galleries/_find`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: [
                        {
                            Gallery_User_Name: `==${username}`,
                            Password: `==${password}`,
                        },
                    ],
                }),
            }
        );

        const data = await response.json() as any;

        if (!data.response?.data?.length) {
            const fmCode = data.messages?.[0]?.code || 'unknown';
            const fmMsg = data.messages?.[0]?.message || 'No records found';
            console.log(`Invalid credentials or FM error (Code: ${fmCode}): ${fmMsg}`);

            if (fmCode === '401') {
                return { success: false, error: 'Invalid username or password' };
            }
            return { success: false, error: `FileMaker Error (${fmCode}): ${fmMsg}` };
        }

        const gallery = data.response.data[0];
        const fieldData = gallery.fieldData || gallery;

        console.log('Gallery authenticated:', fieldData.GalleryName);

        return {
            success: true,
            galleryId: String(fieldData.gallery_id || gallery.recordId),
            galleryName: fieldData.GalleryName || 'Unknown Gallery',
        };
    } catch (error) {
        console.error('Error validating credentials:', error);
        return { success: false, error: 'Authentication error' };
    }
}

const FM_PASSWORD_SECRET = defineSecret('FM_PASSWORD');

// Constants from original Edge Function
const FM_API_VERSION = 'vLatest';
const POOL_ID = 'us-west-2_NqkuZcXQY';
const CLIENT_ID = '4l9rvl4mv5es1eep1qe97cautn';
const REGION = 'us-west-2';
const POOL_NAME = POOL_ID.split('_')[1];

// SRP Constants
const N_HEX = 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF';
const G_HEX = '2';
const N = BigInt('0x' + N_HEX);
const g = BigInt('0x' + G_HEX);
const HEX_MSB_REGEX = /^[89a-f]/i;

// Helper functions for SRP
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hash = await crypto.subtle.digest('SHA-256', data as any);
    return new Uint8Array(hash);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key as any, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data as any);
    return new Uint8Array(signature);
}

async function hexHash(hexStr: string): Promise<string> {
    const bytes = hexToBytes(hexStr);
    const hash = await sha256(bytes);
    return bytesToHex(hash).padStart(64, '0');
}

async function hashString(str: string): Promise<string> {
    const bytes = new TextEncoder().encode(str);
    const hash = await sha256(bytes);
    return bytesToHex(hash).padStart(64, '0');
}

function padHex(bigInt: bigint): string {
    let hexStr = bigInt.toString(16);
    if (hexStr.length % 2 !== 0) hexStr = '0' + hexStr;
    if (HEX_MSB_REGEX.test(hexStr)) hexStr = '00' + hexStr;
    return hexStr;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

async function computeHkdf(ikm: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
    const prk = await hmacSha256(salt, ikm);
    const infoBits = new TextEncoder().encode('Caldera Derived Key');
    const infoBitsWithCounter = new Uint8Array(infoBits.length + 1);
    infoBitsWithCounter.set(infoBits);
    infoBitsWithCounter[infoBits.length] = 1;
    const hmac = await hmacSha256(prk, infoBitsWithCounter);
    return hmac.slice(0, 16);
}

class AuthenticationHelper {
    private smallA: bigint;
    private largeA: bigint | null = null;
    private k: bigint | null = null;
    private poolName: string;

    constructor(poolName: string) {
        this.poolName = poolName;
        const randomValues = new Uint8Array(128);
        crypto.getRandomValues(randomValues);
        this.smallA = BigInt('0x' + bytesToHex(randomValues));
    }

    async init(): Promise<void> {
        const kHex = await hexHash(padHex(N) + padHex(g));
        this.k = BigInt('0x' + kHex);
        this.largeA = modPow(g, this.smallA, N);
    }

    getLargeA(): string {
        if (!this.largeA) throw new Error('Must call init() first');
        return padHex(this.largeA);
    }

    async getPasswordAuthenticationKey(
        username: string,
        password: string,
        serverBHex: string,
        saltHex: string
    ): Promise<Uint8Array> {
        if (!this.largeA || !this.k) throw new Error('Must call init() first');
        const serverB = BigInt('0x' + serverBHex);
        const salt = BigInt('0x' + saltHex);
        const uHex = await hexHash(padHex(this.largeA) + padHex(serverB));
        const u = BigInt('0x' + uHex);
        const usernamePassword = `${this.poolName}${username}:${password}`;
        const usernamePasswordHash = await hashString(usernamePassword);
        const xHex = await hexHash(padHex(salt) + usernamePasswordHash);
        const x = BigInt('0x' + xHex);
        const gModPowXN = modPow(g, x, N);
        let intValue2 = serverB - this.k * gModPowXN;
        intValue2 = ((intValue2 % N) + N) % N;
        const S = modPow(intValue2, this.smallA + u * x, N);
        return computeHkdf(hexToBytes(padHex(S)), hexToBytes(padHex(u)));
    }
}

// Global cached values
let configCache: Record<string, string> | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000;

let FM_HOST = '';
let FM_DATABASE = '';
let FM_USERNAME = '';
let FM_PASSWORD = '';

// Token caches
let cachedClarisIdToken: string | null = null;
let cachedClarisIdTokenExpiry = 0;
let cachedFmSessionToken: string | null = null;
let cachedFmSessionTokenExpiry = 0;

async function getSystemConfigs() {
    const now = Date.now();
    if (configCache && (now - lastCacheUpdate < CACHE_TTL)) return configCache;

    const configs: Record<string, string> = {
        FILEMAKER_HOST: process.env.FILEMAKER_HOST || '',
        FILEMAKER_DATABASE: process.env.FILEMAKER_DATABASE || '',
        FILEMAKER_USERNAME: process.env.FILEMAKER_USERNAME || '',
        FILEMAKER_PASSWORD: FM_PASSWORD_SECRET.value() || '', // Use Secret Manager
    };

    const snapshot = await db.collection('system_configs').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (doc.id !== 'FILEMAKER_PASSWORD') { // Skip if accidentally in Firestore
            configs[doc.id] = data.value;
        }
    });

    configCache = configs;
    lastCacheUpdate = now;
    FM_HOST = configs.FILEMAKER_HOST;
    FM_DATABASE = configs.FILEMAKER_DATABASE;
    FM_USERNAME = configs.FILEMAKER_USERNAME;
    FM_PASSWORD = configs.FILEMAKER_PASSWORD;

    return configs;
}

function getDateString(): string {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[now.getUTCDay()]} ${months[now.getUTCMonth()]} ${now.getUTCDate()} ${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC ${now.getUTCFullYear()}`;
}

async function getClarisIdToken(forceRefresh = false): Promise<string> {
    const now = Date.now();

    if (!forceRefresh && cachedClarisIdToken && now < cachedClarisIdTokenExpiry) return cachedClarisIdToken;

    if (!forceRefresh) {
        const doc = await db.collection('system_configs').doc('CACHED_CLARIS_ID_TOKEN').get();
        if (doc.exists) {
            const data = doc.data();
            if (data?.value && data.expires_at) {
                const expiry = data.expires_at.toMillis();
                if (now < (expiry - 5 * 60 * 1000)) {
                    cachedClarisIdToken = data.value;
                    cachedClarisIdTokenExpiry = expiry;
                    return data.value;
                }
            }
        }
    }

    const authHelper = new AuthenticationHelper(POOL_NAME);
    await authHelper.init();

    const cognitoUrl = `https://cognito-idp.${REGION}.amazonaws.com/`;
    const initiateAuthParams = {
        AuthFlow: 'USER_SRP_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: FM_USERNAME, SRP_A: authHelper.getLargeA() },
    };

    const initiateResponse = await fetch(cognitoUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(initiateAuthParams),
    });

    if (!initiateResponse.ok) {
        const errorText = await initiateResponse.text();
        console.error('InitiateAuth failed:', errorText);
        throw new Error(`InitiateAuth failed: ${initiateResponse.status} - ${errorText}`);
    }
    const initiateData = await initiateResponse.json() as { ChallengeParameters: any, ChallengeName?: string };

    if (initiateData.ChallengeName && initiateData.ChallengeName !== 'PASSWORD_VERIFIER') {
        console.warn('Initial Cognito Challenge:', initiateData.ChallengeName);
        throw new Error(`Initial Auth Challenge required: ${initiateData.ChallengeName}`);
    }

    const challengeParams = initiateData.ChallengeParameters;
    const hkdf = await authHelper.getPasswordAuthenticationKey(
        challengeParams.USER_ID_FOR_SRP,
        FM_PASSWORD,
        challengeParams.SRP_B,
        challengeParams.SALT
    );

    const dateString = getDateString();
    const secretBlockDecoded = Buffer.from(challengeParams.SECRET_BLOCK, 'base64');
    const message = Buffer.concat([
        Buffer.from(POOL_NAME),
        Buffer.from(challengeParams.USER_ID_FOR_SRP),
        secretBlockDecoded,
        Buffer.from(dateString)
    ]);

    const signature = await hmacSha256(hkdf, message);
    const signatureBase64 = Buffer.from(signature).toString('base64');

    const respondParams = {
        ChallengeName: 'PASSWORD_VERIFIER',
        ClientId: CLIENT_ID,
        ChallengeResponses: {
            USERNAME: challengeParams.USER_ID_FOR_SRP,
            PASSWORD_CLAIM_SECRET_BLOCK: challengeParams.SECRET_BLOCK,
            TIMESTAMP: dateString,
            PASSWORD_CLAIM_SIGNATURE: signatureBase64,
        },
    };

    const respondResponse = await fetch(cognitoUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(respondParams),
    });

    if (!respondResponse.ok) throw new Error(`RespondToAuthChallenge failed: ${await respondResponse.text()}`);
    const respondData = await respondResponse.json() as any;

    if (!respondData.AuthenticationResult) {
        console.error('Cognito Response missing AuthenticationResult:', JSON.stringify(respondData));
        if (respondData.ChallengeName) {
            throw new Error(`Auth Challenge required: ${respondData.ChallengeName}. Please ensure 2FA is disabled for the API user.`);
        }
        throw new Error(`Cognito Auth failed: AuthenticationResult missing. Response: ${JSON.stringify(respondData)}`);
    }

    const idToken = respondData.AuthenticationResult.IdToken;
    const expiry = Date.now() + (respondData.AuthenticationResult.ExpiresIn || 3600) * 1000;

    cachedClarisIdToken = idToken;
    cachedClarisIdTokenExpiry = expiry;

    await db.collection('system_configs').doc('CACHED_CLARIS_ID_TOKEN').set({
        value: idToken,
        expires_at: admin.firestore.Timestamp.fromMillis(expiry)
    });

    return idToken;
}

async function getSessionToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && cachedFmSessionToken && now < cachedFmSessionTokenExpiry) return cachedFmSessionToken;

    if (!forceRefresh) {
        const doc = await db.collection('system_configs').doc('CACHED_FM_SESSION_TOKEN').get();
        if (doc.exists) {
            const data = doc.data();
            if (data?.value && data.expires_at) {
                const expiry = data.expires_at.toMillis();
                if (now < (expiry - 2 * 60 * 1000)) {
                    cachedFmSessionToken = data.value;
                    cachedFmSessionTokenExpiry = expiry;
                    return data.value;
                }
            }
        }
    }

    const clarisIdToken = await getClarisIdToken(forceRefresh);
    const sessionUrl = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/sessions`;

    const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `FMID ${clarisIdToken}`,
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) throw new Error(`FileMaker Data API session failed: ${response.status} - ${await response.text()}`);
    const data = await response.json() as { response: { token: string } };
    const token = data.response.token;

    const expiry = Date.now() + (14 * 60 * 1000);
    cachedFmSessionToken = token;
    cachedFmSessionTokenExpiry = expiry;

    await db.collection('system_configs').doc('CACHED_FM_SESSION_TOKEN').set({
        value: token,
        expires_at: admin.firestore.Timestamp.fromMillis(expiry)
    });

    return token;
}

async function withSession<T>(actionFn: (token: string) => Promise<T>): Promise<T> {
    const token = await getSessionToken();
    try {
        return await actionFn(token);
    } catch (error: any) {
        if (error.status === 401 || String(error.message).includes('401')) {
            const freshToken = await getSessionToken(true);
            return await actionFn(freshToken);
        }
        throw error;
    }
}

export const filemakerApi = onRequest({
    secrets: [FM_PASSWORD_SECRET],
    region: "europe-west3",
    cors: true
}, async (req, res) => {
    try {
        await getSystemConfigs();

        // --- Proxy HTTP Handler ---
        if (req.query.action === 'proxyImage' || (req.body?.action === 'proxyImage')) {
            const imageUrl = (req.query.url || req.body?.body?.url) as string;
            console.log(`[proxyImage] Request for URL: ${imageUrl}`);

            if (!imageUrl) {
                res.status(400).send('URL required');
                return;
            }
            if (!imageUrl.startsWith('https://firebasestorage.googleapis.com/')) {
                res.status(403).send('Forbidden: Only Firebase Storage URLs are allowed');
                return;
            }

            // Security: Ensure URL belongs to this project's buckets
            const projectId = process.env.GCLOUD_PROJECT || 'gallery-access-firebase';
            if (!imageUrl.includes(projectId)) {
                res.status(403).send('Forbidden: Access limited to project storage');
                return;
            }

            try {
                const imgRes = await fetch(imageUrl);
                console.log(`[proxyImage] Fetch status: ${imgRes.status}`);

                if (!imgRes.ok) {
                    const errText = await imgRes.text();
                    console.error(`[proxyImage] Remote fetch failed: ${imgRes.status} ${errText}`);
                    throw new Error(`Remote fetch failed: ${imgRes.status} ${imgRes.statusText}`);
                }

                const contentType = imgRes.headers.get('content-type');
                const buffer = await imgRes.arrayBuffer();

                res.setHeader('Content-Type', contentType || 'image/jpeg');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.send(Buffer.from(buffer));
                return;
            } catch (error: any) {
                console.error('[proxyImage] Error:', error);
                res.status(500).send(`Proxy error: ${error.message}`);
                return;
            }
        }

        const { action, body } = req.body;

        // --- Auth Context Resolution ---
        // For protected actions, we verify the ID Token and resolve the authoritative galleryId
        const authHeader = req.headers.authorization;
        let authGalleryId: string | null = null;
        let authenticatedUid: string | null = null;
        let isAdmin = false;

        if (authHeader?.startsWith('Bearer ')) {
            try {
                const idToken = authHeader.split('Bearer ')[1];
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                authenticatedUid = decodedToken.uid;

                // Admin check (email-based for now as a fallback)
                isAdmin = decodedToken.email === ADMIN_EMAIL || decodedToken.email === 'yotamfr@gmail.com';

                if (authenticatedUid) {
                    authGalleryId = await getGalleryIdFromUid(authenticatedUid);
                }
            } catch (authError) {
                console.warn('[Auth] Token verification failed or expired');
            }
        }

        switch (action) {
            case 'testConnection': {
                const testLogs: string[] = [];
                testLogs.push('Starting diagnostic test...');
                await getClarisIdToken(true);
                testLogs.push('Claris ID token obtained.');
                await getSessionToken(true);
                testLogs.push('FileMaker session token obtained.');

                res.json({ success: true, message: 'Connection successful', logs: testLogs });
                break;
            }

            case 'login': {
                const { email: username, password } = body || {};
                if (!username || !password) {
                    res.status(400).json({ error: 'Username and password are required' });
                    break;
                }

                // Note: We deliberately don't log the password here for security.
                console.log(`[login] Attempt for user: ${username}`);

                try {
                    const result = await withSession(async (token) => {
                        const isLoggingInAsAdmin = (ADMIN_EMAIL && username?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

                        if (isLoggingInAsAdmin || isAdmin) {
                            console.log('Admin detected in login flow:', username);
                            return {
                                success: true,
                                galleryId: 'admin',
                                galleryName: 'Admin',
                                isAdmin: true,
                                token: 'firebase-auth-managed'
                            };
                        }

                        const validation = await validateGalleryCredentials(token, username, password);

                        if (validation.success) {
                            console.log(`[login] Credentials valid for ${username}.`);
                            return {
                                success: true,
                                galleryId: validation.galleryId,
                                galleryName: validation.galleryName,
                                token: 'firebase-auth-managed'
                            };
                        } else {
                            return {
                                success: false,
                                error: validation.error || 'Invalid credentials'
                            };
                        }
                    });
                    res.json(result);
                } catch (err: any) {
                    res.status(500).json({ error: err.message });
                }
                break;
            }

            case 'getArtworks': {
                const result = await withSession(async (token) => {
                    const { filters, limit, offset } = body || {};
                    const ignoreAvailability = filters?.ignoreAvailability === true;

                    // Map filters to FileMaker field names
                    const queryObject: any = {};
                    let query: any[] = [queryObject];

                    if (filters) {
                        if (filters.ids && Array.isArray(filters.ids) && filters.ids.length > 0) {
                            query = filters.ids.map((id: string) => {
                                const q: any = { 'studio_work_inventory_no_pk': id };
                                if (!ignoreAvailability) q['Available for sale'] = 'yes';
                                return q;
                            });
                        } else {
                            if (!ignoreAvailability) {
                                queryObject['Available for sale'] = 'yes';
                            }
                            if (filters.title) queryObject['work_name'] = `*${filters.title}*`;
                            if (filters.category) queryObject['work_category'] = filters.category;
                            if (filters.series) queryObject['Work Series'] = filters.series;
                            if (filters.materials) queryObject['materials_for caption'] = `*${filters.materials}*`;

                            if (filters.yearFrom !== undefined && filters.yearTo !== undefined) {
                                queryObject['creation_year'] = `${filters.yearFrom}...${filters.yearTo}`;
                            } else if (filters.yearFrom !== undefined) {
                                queryObject['creation_year'] = `>=${filters.yearFrom}`;
                            } else if (filters.yearTo !== undefined) {
                                queryObject['creation_year'] = `<=${filters.yearTo}`;
                            }

                            if (filters.gallery_id) queryObject['gallery_id'] = filters.gallery_id;
                            if (filters.work_id) queryObject['studio_work_inventory_no_pk'] = filters.work_id;
                            if (filters.status) queryObject['edition_catalog::Status'] = filters.status;
                            if (filters.loan_to) queryObject['edition_catalog::loan_to'] = filters.loan_to;

                            // Dimensions Filters
                            if (filters.dimensionHMin !== undefined && filters.dimensionHMax !== undefined) {
                                queryObject['dimensions_work_h'] = `${filters.dimensionHMin}...${filters.dimensionHMax}`;
                            } else if (filters.dimensionHMin !== undefined) {
                                queryObject['dimensions_work_h'] = `>=${filters.dimensionHMin}`;
                            } else if (filters.dimensionHMax !== undefined) {
                                queryObject['dimensions_work_h'] = `<=${filters.dimensionHMax}`;
                            }

                            if (filters.dimensionWMin !== undefined && filters.dimensionWMax !== undefined) {
                                queryObject['dimensions_work_w'] = `${filters.dimensionWMin}...${filters.dimensionWMax}`;
                            } else if (filters.dimensionWMin !== undefined) {
                                queryObject['dimensions_work_w'] = `>=${filters.dimensionWMin}`;
                            } else if (filters.dimensionWMax !== undefined) {
                                queryObject['dimensions_work_w'] = `<=${filters.dimensionWMax}`;
                            }

                            if (filters.dimensionLMin !== undefined && filters.dimensionLMax !== undefined) {
                                queryObject['dimensions_work_L'] = `${filters.dimensionLMin}...${filters.dimensionLMax}`;
                            } else if (filters.dimensionLMin !== undefined) {
                                queryObject['dimensions_work_L'] = `>=${filters.dimensionLMin}`;
                            } else if (filters.dimensionLMax !== undefined) {
                                queryObject['dimensions_work_L'] = `<=${filters.dimensionLMax}`;
                            }

                            // Price Filters
                            if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
                                queryObject['current edition price'] = `${filters.priceMin}...${filters.priceMax}`;
                            } else if (filters.priceMin !== undefined) {
                                queryObject['current edition price'] = `>=${filters.priceMin}`;
                            } else if (filters.priceMax !== undefined) {
                                queryObject['current edition price'] = `<=${filters.priceMax}`;
                            }

                            // Omit logic
                            const omitQueries: any[] = [];
                            const availFilter = ignoreAvailability ? {} : { 'Available for sale': 'yes' };
                            if (filters.excludeTitle && filters.title) {
                                omitQueries.push({ 'work_name': `*${filters.title}*`, ...availFilter, 'omit': 'true' });
                                delete queryObject['work_name'];
                            }
                            if (filters.excludeCategory && filters.category) {
                                omitQueries.push({ 'work_category': filters.category, ...availFilter, 'omit': 'true' });
                                delete queryObject['work_category'];
                            }
                            if (filters.excludeSeries && filters.series) {
                                omitQueries.push({ 'Work Series': filters.series, ...availFilter, 'omit': 'true' });
                                delete queryObject['Work Series'];
                            }
                            if (filters.excludeMaterials && filters.materials) {
                                omitQueries.push({ 'materials_for caption': `*${filters.materials}*`, ...availFilter, 'omit': 'true' });
                                delete queryObject['materials_for caption'];
                            }

                            if (omitQueries.length > 0) {
                                query = [queryObject, ...omitQueries];
                            }
                        }
                    } else if (!ignoreAvailability) {
                        queryObject['Available for sale'] = 'yes';
                    }

                    console.log('[getArtworks] Final FileMaker Query:', JSON.stringify(query, null, 2));

                    const response = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Work Info/_find`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            query: query,
                            sort: [
                                { fieldName: 'creation_year', sortOrder: 'descend' },
                                { fieldName: 'studio_work_inventory_no_pk', sortOrder: 'descend' }
                            ],
                            limit: limit?.toString() || '20',
                            offset: ((offset || 0) + 1).toString()
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        try {
                            const errData = JSON.parse(errText);
                            if (errData.messages?.[0]?.code === '401') {
                                return { artworks: [], totalCount: 0 };
                            }
                        } catch (e) { }
                        throw new Error(`FM Error ${response.status}: ${errText}`);
                    }

                    const data = await response.json();
                    const records = data.response?.data || [];
                    return {
                        artworks: records.map(mapArtwork),
                        totalCount: data.response?.dataInfo?.foundCount || records.length
                    };
                });
                res.json(result);
                break;
            }

            case 'getArtwork': {
                const result = await withSession(async (token) => {
                    const { id } = body || {};
                    const response = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Work Info/_find`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            query: [{
                                studio_work_inventory_no_pk: id,
                                'Available for sale': 'yes'
                            }]
                        })
                    });
                    if (!response.ok) {
                        const errText = await response.text();
                        if (response.status === 401 || errText.includes('401')) {
                            return { artwork: null };
                        }
                        throw new Error(`FM Error ${response.status}: ${errText}`);
                    }
                    const data = await response.json();
                    const record = data.response?.data?.[0];
                    return { artwork: record ? mapArtwork(record) : null };
                });
                res.json(result);
                break;
            }

            case 'getCollections': {
                const result = await withSession(async (token) => {
                    const { galleryId: bodyGalleryId } = body || {};
                    // Authorization: Users only see their own collections unless Admin
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) {
                        throw new Error('Unauthorized: No gallery identity resolved');
                    }

                    const response = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Gallery_Collections/_find`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            query: [{ gallery_id_fk: targetGalleryId }],
                            sort: [{ fieldName: 'CreationTimestamp', sortOrder: 'descend' }]
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        try {
                            const errData = JSON.parse(errText);
                            if (errData.messages?.[0]?.code === '401') return [];
                        } catch (e) { }
                        throw new Error(`FM Error ${response.status}: ${errText}`);
                    }

                    const data = await response.json();
                    const records = data.response?.data || [];
                    return records.map(mapCollection);
                });
                res.json(result);
                break;
            }

            case 'getCollectionItems': {
                const result = await withSession(async (token) => {
                    const { collectionId } = body || {};
                    return await getCollectionItems(token, collectionId);
                });
                res.json(result);
                break;
            }

            case 'createCollection': {
                const { name, description, galleryId: bodyGalleryId } = body || {};
                // Authorization: Admins can create for any gallery, users only for their own
                const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                if (!targetGalleryId) {
                    res.status(401).json({ error: 'Unauthorized: No verified gallery identity found' });
                    break;
                }

                const result = await withSession(async (token) => {
                    return await createCollection(token, name, description, targetGalleryId);
                });
                res.json(result);
                break;
            }

            case 'addToCollection': {
                const { collectionId, artworkIds, galleryId: bodyGalleryId } = body || {};
                const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                if (!targetGalleryId) {
                    res.status(401).json({ error: 'Unauthorized: No gallery identity resolved' });
                    break;
                }

                const result = await withSession(async (token) => {
                    const ids = await verifyCollectionOwnership(token, collectionId, targetGalleryId);
                    if (!ids) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await addToCollection(token, ids.collectionId, artworkIds);
                });
                res.json(result);
                break;
            }

            case 'removeFromCollection': {
                const result = await withSession(async (token) => {
                    const { collectionId, workId, galleryId: bodyGalleryId } = body || {};
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) {
                        throw new Error('Unauthorized: No gallery identity resolved');
                    }

                    const ids = await verifyCollectionOwnership(token, collectionId, targetGalleryId);
                    if (!ids) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await removeFromCollection(token, ids.collectionId, workId);
                });
                res.json(result);
                break;
            }

            case 'updateCollection': {
                const result = await withSession(async (token) => {
                    const { collectionId, updates, galleryId: bodyGalleryId } = body || {};
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) throw new Error('Unauthorized');

                    const ids = await verifyCollectionOwnership(token, collectionId, targetGalleryId);
                    if (!ids) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await updateCollection(token, ids.recordId, updates);
                });
                res.json(result);
                break;
            }

            case 'deleteCollection': {
                const result = await withSession(async (token) => {
                    const { collectionId, galleryId: bodyGalleryId } = body || {};
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) throw new Error('Unauthorized');

                    const ids = await verifyCollectionOwnership(token, collectionId, targetGalleryId);
                    if (!ids) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await deleteCollection(token, ids.recordId, ids.collectionId);
                });
                res.json(result);
                break;
            }

            case 'updateCollectionItemsOrder': {
                const result = await withSession(async (token) => {
                    const { items, collectionId, galleryId: bodyGalleryId } = body || {};
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) throw new Error('Unauthorized');

                    if (collectionId && !(await verifyCollectionOwnership(token, collectionId, targetGalleryId))) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await updateCollectionItemsOrder(token, items);
                });
                res.json(result);
                break;
            }

            case 'createShareLink': {
                const result = await withSession(async (token) => {
                    const { collectionId, galleryId: bodyGalleryId } = body || {};
                    const targetGalleryId = isAdmin ? (bodyGalleryId || authGalleryId) : authGalleryId;

                    if (!targetGalleryId) throw new Error('Unauthorized');

                    if (!(await verifyCollectionOwnership(token, collectionId, targetGalleryId))) {
                        throw new Error('Forbidden: You do not own this collection');
                    }
                    return await createShareLink(token, collectionId);
                });
                res.json(result);
                break;
            }

            case 'getSharedCollection': {
                const result = await withSession(async (token) => {
                    const { shareToken } = body || {};
                    return await getSharedCollection(token, shareToken);
                });
                res.json(result);
                break;
            }

            case 'getLayoutMetadata': {
                const result = await withSession(async (token) => {
                    const { layout } = body || {};
                    return await getLayoutMetadata(token, layout);
                });
                res.json(result);
                break;
            }

            case 'forceRepairIdentity': {
                const { galleryId, galleryName } = body || {};

                if (!authenticatedUid || !isAdmin) {
                    res.status(401).json({ error: 'Unauthorized: Admin identity required' });
                    return;
                }

                if (!galleryId) {
                    res.status(400).json({ error: 'galleryId is required' });
                    return;
                }

                try {
                    // Update the authoritative galleries collection
                    await db.collection('galleries').doc(galleryId).set({
                        User_uid: authenticatedUid,
                        GalleryName: galleryName || 'Manual Repair',
                        lastSynced: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    res.json({ success: true, uid: authenticatedUid, galleryId });
                } catch (error: any) {
                    res.status(500).json({ error: error.message });
                }
                break;
            }

            case 'debugSearch': {
                const result = await withSession(async (token) => {
                    const { searchTerm } = body || {};
                    const url = `https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Work Info/_find`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            query: [
                                { 'Work Series': searchTerm },
                                { 'work_name': searchTerm }
                            ],
                            limit: '10'
                        })
                    });
                    return await response.json();
                });
                res.json(result);
                break;
            }

            case 'getFilterOptions': {
                const result = await withSession(async (token) => {
                    const BATCH_SIZE = 500;
                    const rawCategories: string[] = [];
                    const rawSeries: string[] = [];
                    let offset = 0;
                    let totalFound = 0;
                    let keepFetching = true;

                    while (keepFetching) {
                        const response = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Work Info/_find`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                query: [{ 'Available for sale': 'yes' }],
                                limit: BATCH_SIZE.toString(),
                                offset: (offset + 1).toString()
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            try {
                                const errData = JSON.parse(errorText);
                                if (errData.messages?.[0]?.code === '401') break;
                            } catch (e) { }
                            throw new Error(`FM Error ${response.status}: ${errorText}`);
                        }

                        const data = await response.json();
                        const records = data.response?.data || [];
                        const dataInfo = data.response?.dataInfo;

                        if (offset === 0 && dataInfo) {
                            totalFound = dataInfo.foundCount || 0;
                        }

                        records.forEach((record: any) => {
                            const fd = record.fieldData || record;
                            if (fd.work_category) rawCategories.push(fd.work_category);
                            if (fd['Work Series']) rawSeries.push(fd['Work Series']);
                        });

                        offset += records.length;
                        if (records.length === 0 || offset >= totalFound) {
                            keepFetching = false;
                        }
                    }

                    function processValues(values: string[]): string[] {
                        const uniqueMap = new Map<string, string>();
                        values.forEach(val => {
                            if (!val) return;
                            const normalized = val.trim().toLowerCase();
                            if (!uniqueMap.has(normalized)) {
                                uniqueMap.set(normalized, val.trim());
                            } else {
                                const existing = uniqueMap.get(normalized)!;
                                if (val.trim() !== existing && /[A-Z]/.test(val) && !/[A-Z]/.test(existing)) {
                                    uniqueMap.set(normalized, val.trim());
                                }
                            }
                        });
                        return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
                    }

                    return {
                        categories: processValues(rawCategories),
                        series: processValues(rawSeries)
                    };
                });
                res.json(result);
                break;
            }

            case 'getSystemConfigs': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                const snapshot = await db.collection('system_configs').get();
                const configs: any[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    configs.push({
                        key: doc.id,
                        value: data.is_secret ? '********' : data.value,
                        description: data.description,
                        is_secret: data.is_secret
                    });
                });
                res.json(configs);
                break;
            }

            case 'updateSystemConfigs': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                const { configs } = body || {};
                if (!configs || !Array.isArray(configs)) {
                    res.status(400).json({ error: 'Configs array required' });
                    break;
                }

                try {
                    const batch = db.batch();
                    const configCollection = db.collection('system_configs');

                    for (const config of configs) {
                        if (config.value === '********') continue;
                        if (config.key === 'FILEMAKER_PASSWORD') {
                            console.warn('[updateSystemConfigs] Attempted to update password via Firestore - ignored');
                            continue;
                        }
                        const docRef = configCollection.doc(config.key);
                        batch.set(docRef, { value: config.value, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                    }

                    await batch.commit();
                    configCache = null;
                    res.json({ success: true, message: 'Configs updated successfully' });
                } catch (error: any) {
                    console.error('[updateSystemConfigs] Error:', error);
                    res.status(500).json({ error: error.message });
                }
                break;
            }

            case 'verify2FA': {
                const { token, email } = body || {};
                try {
                    const sysConfigs = await getSystemConfigs();
                    const secretKey = `TOTP_SECRET_${email.replace(/[@.]/g, '_').toUpperCase()}`;
                    const secret = sysConfigs[secretKey];
                    if (!secret) {
                        res.json({ success: false, error: '2FA not configured' });
                        break;
                    }

                    const totp = new TOTP({
                        issuer: 'Sigalit Landau Gallery',
                        label: email,
                        algorithm: 'SHA1',
                        digits: 6,
                        period: 30,
                        secret: Secret.fromBase32(secret)
                    });
                    const delta = totp.validate({ token, window: 1 });
                    const isValid = (delta !== null);

                    res.json({ success: isValid, error: isValid ? null : 'Invalid code' });
                } catch (error: any) {
                    console.error('[verify2FA] unexpected error:', error);
                    res.status(500).json({ success: false, error: '2FA error: ' + error.message });
                }
                break;
            }

            case 'generate2FA': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                const newSecret = new Secret({ size: 20 });
                const totpGen = new TOTP({
                    issuer: 'Sigalit Landau Gallery',
                    label: body?.email || 'Admin',
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30,
                    secret: newSecret
                });
                res.json({
                    success: true,
                    secret: newSecret.base32,
                    otpauth_url: totpGen.toString()
                });
                break;
            }

            case 'syncGalleries': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                const result = await withSession(async (token) => {
                    const response = await fetch(`https://${FM_HOST}/fmi/data/${FM_API_VERSION}/databases/${FM_DATABASE}/layouts/Galleries/records`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error(`FM Error ${response.status}: ${await response.text()}`);
                    const data = await response.json() as any;
                    const records = data.response?.data || [];

                    const batch = db.batch();
                    const collections: any[] = [];

                    for (const record of records) {
                        const mapped = mapGallery(record);
                        if (!mapped.gallery_id) {
                            console.warn('Skipping gallery record without ID:', record);
                            continue;
                        }
                        const docRef = db.collection('galleries').doc(mapped.gallery_id);
                        batch.set(docRef, mapped, { merge: true });
                        collections.push(mapped);
                    }

                    await batch.commit();
                    return { success: true, count: records.length, galleries: collections };
                });
                res.json(result);
                break;
            }

            case 'fixStorageCors': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                console.log('[fixStorageCors] Action triggered by Admin');
                try {
                    // Try multiple possible bucket names
                    const projectId = process.env.GCLOUD_PROJECT || 'gallery-access-firebase';
                    const bucketNames = [
                        `${projectId}.firebasestorage.app`,
                        `${projectId}.appspot.com`,
                        projectId
                    ];

                    const results: any[] = [];

                    for (const name of bucketNames) {
                        try {
                            const bucket = admin.storage().bucket(name);
                            console.log(`[fixStorageCors] Attempting to set CORS for bucket: ${name}`);

                            await bucket.setCorsConfiguration([
                                {
                                    origin: ['*'],
                                    method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                                    responseHeader: ['*'],
                                    maxAgeSeconds: 3600
                                }
                            ]);
                            results.push({ name, success: true });
                        } catch (err: any) {
                            console.warn(`[fixStorageCors] Failed for bucket ${name}:`, err.message);
                            results.push({ name, success: false, error: err.message });
                        }
                    }

                    res.json({
                        success: true,
                        message: `CORS repair process completed`,
                        results
                    });
                } catch (error: any) {
                    console.error('[fixStorageCors] Primary Error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message,
                        details: error.stack
                    });
                }
                break;
            }

            case 'diagnostics': {
                if (!isAdmin) {
                    res.status(403).json({ error: 'Forbidden: Admin access required' });
                    break;
                }
                const logs: string[] = [];
                const diag: Record<string, any> = {};
                logs.push("Starting diagnostics...");

                try {
                    const configs = await getSystemConfigs();
                    diag.configsFound = {
                        host: !!configs.FILEMAKER_HOST,
                        database: !!configs.FILEMAKER_DATABASE,
                        username: !!configs.FILEMAKER_USERNAME,
                        password: !!configs.FILEMAKER_PASSWORD
                    };
                    logs.push(`Config check: Host=${!!configs.FILEMAKER_HOST}, DB=${!!configs.FILEMAKER_DATABASE}, User=${!!configs.FILEMAKER_USERNAME}, Pass=${!!configs.FILEMAKER_PASSWORD}`);

                    if (!configs.FILEMAKER_HOST || !configs.FILEMAKER_DATABASE) {
                        logs.push("❌ Missing critical configuration in Firestore 'system_configs'");
                        res.json({ success: false, logs, diagnostics: diag });
                        return;
                    }

                    logs.push("Testing FileMaker login...");
                    try {
                        const token = await getSessionToken(true);
                        logs.push("✅ FileMaker login successful");
                        diag.loginStatus = "success";
                        diag.tokenPreview = token.substring(0, 5) + "...";
                    } catch (loginErr: any) {
                        logs.push(`❌ FileMaker login failed: ${loginErr.message}`);
                        diag.loginStatus = "failed";
                        diag.loginError = loginErr.message;
                        // Attempt to capture more details if it's a JSON error string
                        if (loginErr.message.includes('{')) {
                            try {
                                const parsedError = JSON.parse(loginErr.message.substring(loginErr.message.indexOf('{')));
                                diag.detailedError = parsedError;
                            } catch (e) { }
                        }
                    }

                    res.json({ success: diag.loginStatus === "success", logs, diagnostics: diag });
                } catch (err: any) {
                    logs.push(`❌ Diagnostics crashed: ${err.message}`);
                    res.json({ success: false, logs, error: err.message });
                }
                break;
            }

            default:
                res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (err: any) {
        console.error('API Error:', err);
        res.status(500).json({ error: err.message });
    }
});
