/**
 * Checks if the browser has actual internet connectivity.
 * Combines navigator.onLine with a quick HEAD fetch check to avoid false positives.
 */
export async function checkNetworkStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

    // Requesting a local static resource to verify actual connection without CORS issues
    const response = await fetch('/manifest.json', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
