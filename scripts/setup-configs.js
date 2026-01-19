import admin from 'firebase-admin';
import fs from 'fs';

// 1. Load the NEW service account
const serviceAccount = JSON.parse(fs.readFileSync(new URL('./service-account.json', import.meta.url), 'utf8'));

// 2. NEW Settings (Fill these in!)
const CONFIGS = {
    FILEMAKER_HOST: process.env.FM_HOST || 'yoursite.claris.com',
    FILEMAKER_DATABASE: process.env.FM_DB || 'your_database',
    FILEMAKER_USERNAME: process.env.FM_USER || 'your_username',
};

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function setup() {
    console.log('🚀 Populating Firestore system_configs...');

    for (const [key, value] of Object.entries(CONFIGS)) {
        if (!value || value.includes('your_')) {
            console.warn(`⚠️  Skipping ${key} (no value provided)`);
            continue;
        }

        await db.collection('system_configs').doc(key).set({
            value: value,
            description: `FileMaker ${key.split('_')[1].toLowerCase()}`,
            is_secret: false
        }, { merge: true });

        console.log(`✅ Set ${key} = ${value}`);
    }
}

setup()
    .then(() => console.log('🎉 Done! Refresh your website and run diagnostics again.'))
    .catch(err => console.error('❌ Failed:', err));
