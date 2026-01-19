#!/bin/bash

# Configuration
PROJECT_ID="gallery-access-firebase"
BUCKET_NAME="${PROJECT_ID}.firebasestorage.app"

echo "Attempting to set CORS configuration for bucket: ${BUCKET_NAME}..."

if command -v gsutil &> /dev/null
then
    gsutil cors set storage-cors.json "gs://${BUCKET_NAME}"
    echo "✅ CORS configuration updated successfully."
else
    echo "❌ error: 'gsutil' command not found."
    echo "Please run the following command manually if you have the Google Cloud SDK installed:"
    echo "gsutil cors set storage-cors.json gs://${BUCKET_NAME}"
    echo ""
    echo "Alternatively, you can set CORS using the Google Cloud Console (Cloud Storage > Buckets > ${BUCKET_NAME} > Permissions)."
fi
