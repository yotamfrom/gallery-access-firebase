
import admin from 'firebase-admin';
import fs from 'fs';

// --- CONFIGURATION ---
// 1. Path to your Service Account JSON key
const serviceAccount = JSON.parse(fs.readFileSync(new URL('./service-account.json', import.meta.url), 'utf8'));

// 2. Bucket Name
console.log('Service Account Project:', serviceAccount.project_id);
const BUCKET_NAME = 'gallery-access-firebase.firebasestorage.app';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: BUCKET_NAME,
    });
}

const bucket = admin.storage().bucket();

async function deleteAllFiles() {
    console.log(`⚠️  WARNING: Deleting ALL files in bucket: ${BUCKET_NAME}`);
    console.log('Waiting 5 seconds... Press Ctrl+C to cancel.');

    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        const [files] = await bucket.getFiles();

        if (files.length === 0) {
            console.log('✅ Bucket is already empty.');
            return;
        }

        console.log(`Found ${files.length} files. Deleting...`);

        // Delete in batches to avoid overwhelming the network
        const batchSize = 50;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(file => {
                console.log(`Deleting: ${file.name}`);
                return file.delete();
            }));
        }

        console.log('🎉 All files deleted successfully.');

    } catch (error) {
        console.error('❌ Error deleting files:', error);
    }
}

deleteAllFiles();
