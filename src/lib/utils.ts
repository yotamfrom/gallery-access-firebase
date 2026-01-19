import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robustly triggers a file download that appears in the browser's download manager.
 * Optimized to force the browser to respect the chosen filename by using application/octet-stream.
 */
export async function saveAs(blob: Blob, filename: string) {
  // 1. Sanitize filename strictly
  const safeName = filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .trim();

  console.log(`[saveAs] Triggering integrated download for: ${safeName}`);

  try {
    // 2. Use application/octet-stream to force the browser to rely on the 'download' attribute
    // for the filename and extension, rather than its own MIME-based guessing.
    const forceBlob = new Blob([blob], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(forceBlob);

    const link = document.createElement('a');
    link.href = url;

    // Explicitly set both property and attribute
    link.download = safeName;
    link.setAttribute('download', safeName);

    // Ensure the link is in the DOM for maximum compatibility
    link.style.display = 'none';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);

    console.log(`[saveAs] Executing direct click for: ${safeName}`);

    // Trigger the download
    link.click();

    // 3. Keep the URL alive long enough for the browser to register the download
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
      console.log(`[saveAs] Integrated sequence complete for: ${safeName}`);
    }, 60000);

    return true;
  } catch (e) {
    console.error('[saveAs] Integrated download failed:', e);
    return false;
  }
}

export function getProxyUrl(originalUrl: string) {
  const projectId = "gallery-access-firebase";
  const region = 'europe-west3';
  return `https://${region}-${projectId}.cloudfunctions.net/filemakerApi?action=proxyImage&url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Attempts to fetch an image with CORS and cache-busting.
 * Falls back to a proxy URL if the direct fetch fails.
 */
export async function robustFetch(url: string): Promise<Response> {
  const corsUrl = `${url}${url.includes('?') ? '&' : '?'}cors=${Date.now()}`;

  try {
    const response = await fetch(corsUrl, {
      mode: 'cors',
      cache: 'no-cache'
    });

    if (response.ok) return response;

    console.warn('[robustFetch] Direct fetch status failed, trying proxy...', response.status);
  } catch (err) {
    console.warn('[robustFetch] Direct fetch crashed, trying proxy...', err);
  }

  // Fallback to proxy
  const proxyUrl = getProxyUrl(url);
  const proxyResponse = await fetch(proxyUrl);

  if (!proxyResponse.ok) {
    throw new Error(`Robust fetch failed for both direct and proxy attempts: ${proxyResponse.status}`);
  }

  return proxyResponse;
}
