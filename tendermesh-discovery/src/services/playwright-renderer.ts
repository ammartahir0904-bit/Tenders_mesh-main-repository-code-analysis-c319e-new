// ─── Playwright Rendering Service ───
// Renders JavaScript-heavy pages with headless Chromium so the AI scraper
// gets the fully-loaded DOM (with tender data) instead of an empty HTML shell.

import { chromium, type Browser, type Page } from 'playwright';
import { fetchWithTimeout } from './http-client.js';

let browserInstance: Browser | null = null;

/**
 * Get a shared browser instance (launched once, reused across all URLs).
 */
async function getBrowser(): Promise<Browser | null> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('[Playwright] Browser launched successfully');
    return browserInstance;
  } catch (error: any) {
    console.error('[Playwright] Failed to launch browser:', error.message);
    return null;
  }
}

/**
 * Render a URL with Playwright and return the fully-loaded HTML.
 * Falls back to simple fetch() if Playwright is unavailable.
 */
export async function renderWithPlaywright(
  url: string,
  options: { timeoutMs?: number; waitForSelector?: string } = {}
): Promise<{ html: string; method: 'playwright' | 'fetch' }> {
  const { timeoutMs = 35000, waitForSelector } = options;

  const browser = await getBrowser();

  // Fallback to simple fetch if Playwright isn't available
  if (!browser) {
    console.warn(`[Playwright] Browser unavailable, falling back to fetch for ${url}`);
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return { html: await response.text(), method: 'fetch' };
  }

  let page: Page | null = null;
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    // If a specific selector is provided, wait for it to appear
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: timeoutMs });
      } catch {
        console.warn(`[Playwright] Selector "${waitForSelector}" not found on ${url}`);
      }
    }

    // Give SPA frameworks a moment to finish rendering data
    await page.waitForTimeout(2000);

    const html = await page.content();
    return { html, method: 'playwright' };
  } catch (error: any) {
    console.warn(`[Playwright] Failed to render ${url}: ${error.message}`);

    // Last-resort fallback to simple fetch
    try {
      const response = await fetchWithTimeout(url, {}, timeoutMs);
      if (response.ok) {
        return { html: await response.text(), method: 'fetch' };
      }
    } catch {
      // Both methods failed
    }

    throw new Error(`Failed to render ${url}: ${error.message}`);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Close the shared browser instance (call on shutdown).
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
    console.log('[Playwright] Browser closed');
  }
}