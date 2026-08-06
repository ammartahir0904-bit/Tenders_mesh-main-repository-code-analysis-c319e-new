const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 TenderMeshDiscovery/1.0';

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Inject a browser-like User-Agent when the caller has not set one.
  // Many government procurement sites (e.g. sam.gov, ppra.gov.pk) reject
  // requests that use Node's default fetch UA with a 403/empty response.
  const headers = new Headers(options.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', DEFAULT_USER_AGENT);
  }

  try {
    return await fetch(url, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
