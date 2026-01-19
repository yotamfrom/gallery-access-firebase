
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// 1. Path to your Service Account JSON key (Update this!)
const serviceAccount = JSON.parse(fs.readFileSync(new URL('./service-account.json', import.meta.url), 'utf8'));

// 2. Path to the folder you want to upload (Update this!)
// Example: '/Users/yotamfrom/Desktop/Images'
const LOCAL_IMAGES_PATH = process.argv[2];

// 3. Your Storage Bucket Name (from .env or firebase config)
console.log('Service Account Project:', serviceAccount.project_id);
const BUCKET_NAME = 'gallery-access-firebase.firebasestorage.app';

if (!LOCAL_IMAGES_PATH) {
    console.error('❌ Please provide the local path to images as an argument.');
    process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: BUCKET_NAME,
    });
}

const bucket = admin.storage().bucket();

async function uploadFile(filePath, destination) {
    try {
        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        console.log(`✅ Uploaded: ${destination}`);
    } catch (error) {
        console.error(`❌ Failed: ${destination}`, error.message);
    }
}

async function processDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await processDirectory(fullPath);
        } else {
            // Calculate relative path for destination
            // We want the destination to start AFTER the root LOCAL_IMAGES_PATH
            // e.g. if root is /users/imgs and file is /users/imgs/salt/large/1.jpg
            // destination should be salt/large/1.jpg
            const relativePath = path.relative(LOCAL_IMAGES_PATH, fullPath);

            // Normalize slashes for Storage
            const destination = relativePath.split(path.sep).join('/');

            // Skip .DS_Store
            if (file === '.DS_Store') continue;

            await uploadFile(fullPath, destination);
        }
    }
}

console.log(`🚀 Starting upload from: ${LOCAL_IMAGES_PATH}`);
console.log(`📂 Target Bucket: ${BUCKET_NAME}`);

processDirectory(LOCAL_IMAGES_PATH)
    .then(() => console.log('🎉 All uploads completed!'))
    .catch(err => console.error('Fatal Error:', err));
