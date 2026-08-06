import type { RawScrapedTender } from '../types.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { renderWithPlaywright } from '../services/playwright-renderer.js';
import { configService } from '../config/config.service.js';
import { logger } from '../utils/logger.js';
import { sseManager } from '../routes/events.routes.js';
import { JSDOM } from 'jsdom';

class Semaphore {
  private tasks: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}
  async acquire(): Promise<void> {
    if (this.active < this.max) { this.active++; return Promise.resolve(); }
    return new Promise(resolve => this.tasks.push(resolve));
  }
  release(): void {
    if (this.tasks.length > 0) { const next = this.tasks.shift(); if (next) next(); }
    else { this.active--; }
  }
}
const llmSemaphore = new Semaphore(2);

interface TenderJson {
  source_id?: string; title?: string; buying_org?: string; category?: string;
  location?: string; estimated_value?: number | null; currency?: string;
  deadline_iso?: string | null; mandatory_reqs?: string[]; description?: string;
  direct_url?: string; details?: Record<string, any>; recommendation?: string;
  original_html?: string;
}

interface BlockData { text: string; html: string; directUrl?: string; index: number; }

function safeIso(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function extractDirectLink(el: any, baseUrl: string): string | undefined {
  try {
    const a = el.querySelector('a[href]');
    if (a) return new URL(a.getAttribute('href') || '', baseUrl).toString();
    const dataHref = el.getAttribute('data-href') || el.getAttribute('data-url');
    if (dataHref) return new URL(dataHref, baseUrl).toString();
    if (el.tagName === 'A') return new URL(el.getAttribute('href') || '', baseUrl).toString();
  } catch {}
  return undefined;
}

function repairJsonString(jsonStr: string): string {
  try { JSON.parse(jsonStr); return jsonStr; } catch {}
  const start = jsonStr.indexOf('"tenders": [');
  if (start !== -1) {
    const arrayContent = jsonStr.substring(start + 11);
    let lastCompleteIdx = -1, braceCount = 0, inString = false, escapeNext = false;
    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (char === '\\') { escapeNext = true; continue; }
      if (char === '"' && !escapeNext) { inString = !inString; continue; }
      if (inString) continue;
      if (char === '{') braceCount++;
      if (char === '}') { braceCount--; if (braceCount === 0) lastCompleteIdx = i; }
    }
    if (lastCompleteIdx !== -1) return jsonStr.substring(0, start + 11) + arrayContent.substring(0, lastCompleteIdx + 1) + ']}';
  }
  return jsonStr;
}

export async function scrapeWithAI(
  sourceUrls: string[], sourceName: string, options: { usePlaywright?: boolean; keywords?: string[] } = {}
): Promise<RawScrapedTender[]> {
  const results: RawScrapedTender[] = [];
  const aiConfig = configService.getAIConfig();
  if (!aiConfig.apiKey) return [];

  sseManager.broadcast('SCAN_INFO', { type: 'SCAN_INFO', source: sourceName, message: `🤖 Scanning ${sourceName}`, timestamp: new Date().toISOString() });

  for (const url of sourceUrls) {
    try {
      let html = '';
      if (options.usePlaywright) {
        html = (await renderWithPlaywright(url, { timeoutMs: 25000 })).html;
      } else {
        try {
          const resp = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 15000);
          html = await resp.text();
          if (html.length < 500) html = (await renderWithPlaywright(url, { timeoutMs: 25000 })).html;
        } catch { html = (await renderWithPlaywright(url, { timeoutMs: 25000 })).html; }
      }
      if (html.length < 500) continue;

      const extracted = await extractMultipleWithAI(html, url, sourceName, options.keywords || []);
      for (const t of extracted) {
        if (t.recommendation === 'SKIP') continue;
        results.push({
          source: sourceName, source_url: url, source_id: t.source_id || `${sourceName}-${Date.now()}-${Math.random()}`,
          title: t.title || 'Untitled', buying_org: t.buying_org, category: t.category, location: t.location,
          estimated_value: t.estimated_value || null, currency: t.currency || 'PKR',
          deadline: safeIso(t.deadline_iso),
          mandatory_reqs: t.mandatory_reqs || [], raw_html: t.original_html || t.description || '',
          direct_url: t.direct_url, details: t.details || {}
        } as any);
      }
    } catch (err: any) { logger.error(`Scrape error ${url}: ${err.message}`); }
  }
  return results;
}

async function extractMultipleWithAI(html: string, sourceUrl: string, sourceName: string, keywords: string[] = []): Promise<TenderJson[]> {
  const aiConfig = configService.getAIConfig(); // FIX: this was missing before
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'svg', 'iframe'].forEach((sel: string) => {
    doc.querySelectorAll(sel).forEach((el: any) => el.remove()); // FIX: explicit type
  });

  let blocks: Element[] = Array.from(doc.querySelectorAll('tr, div[class*="tender"], div[class*="notice"], li[class*="item"], article, div[class*="card"]'));
  if (blocks.length === 0) {
    logger.info(`[${sourceName}] Standard selectors found 0 blocks. Activating repeated-structure detector...`);
    const groups = new Map<string, Element[]>();
    doc.querySelectorAll('body *').forEach((el: any) => { // FIX: explicit type
      if ((el as Element).children.length === 0) return;
      const key = `${el.parentElement?.tagName}>${el.tagName}.${String(el.className).split(' ')[0]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(el as Element);
    });
    const bestGroup = [...groups.values()].filter(g => g.length >= 3).sort((a, b) => b.length - a.length)[0];
    if (bestGroup) blocks = bestGroup;
  }

  const blockData: BlockData[] = blocks.map((el, idx) => ({
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    html: el.outerHTML,
    directUrl: extractDirectLink(el, sourceUrl),
    index: idx
  })).filter(b => b.text.length > 20);

  const allKeywords = [...keywords, 'tender', 'bid', 'rfp', 'software', 'hardware', 'it', 'network', 'digital', 'procurement'].map(k => k.toLowerCase());

  let shortlisted: BlockData[] = blockData.filter(b => {
    const lowerText = b.text.toLowerCase();
    return allKeywords.some(kw => lowerText.includes(kw));
  });

  logger.info(`[${sourceName}] Pass 1 (Keywords): Found ${shortlisted.length} relevant blocks.`);

  if (shortlisted.length < 3) {
    logger.info(`[${sourceName}] Pass 1 yielded too few results. Activating Pass 2 (Length-based fallback)...`);
    shortlisted = [...blockData].sort((a, b) => b.text.length - a.text.length).slice(0, 45);
  }
  if (shortlisted.length === 0) return [];

  const chunks: BlockData[][] = [];
  for (let i = 0; i < shortlisted.length; i += 15) chunks.push(shortlisted.slice(i, i + 15));
  const chunksToProcess = chunks.slice(0, 3);

  const allExtracted: TenderJson[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const providerConfig = configService.getServiceConfig(aiConfig.provider);
  const apiUrl = `${providerConfig.baseUrl}/chat/completions`;

  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    logger.info(`[${sourceName}] Processing chunk ${i + 1}/${chunksToProcess.length}...`);
    const chunkText = chunk.map((b, idx) => `--- BLOCK ${idx} ---\n${b.text}`).join('\n\n');

    const prompt = `You are an expert tender extraction AI. Extract ALL IT-related tenders.
CATEGORIES: Only: Software Development, IT Equipment, IT Services, Tech Infrastructure, Cloud Services, Cybersecurity, Data Analytics, Network Infrastructure, Digital Transformation, IT Consulting, Hardware Maintenance. IGNORE: vehicles, clothing, uniform, furniture.
DATE: Deadline must be on or after ${today}. If missing, set deadline_iso: null but STILL extract.
CURRENCY: Detect exact number and currency code (USD, EUR, PKR, AED). Do NOT convert.
OUTPUT: Valid JSON ONLY: { "tenders": [ { "title", "description", "deadline_iso", "estimated_value", "currency", "category", "mandatory_reqs", "direct_url", "details": { "specs", "eligibility", "submission_process", "contact_info", "evaluation_criteria" } } ] }
TEXT:\n${chunkText}
METADATA:\n${JSON.stringify(chunk.map((b, idx) => ({ index: idx, directUrl: b.directUrl })))}`;

    await llmSemaphore.acquire();
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerConfig.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiConfig.model || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, max_tokens: 8000, response_format: { type: 'json_object' }
        })
      });
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';

      const parsed = JSON.parse(repairJsonString(content));
      if (parsed.tenders && Array.isArray(parsed.tenders)) {
        parsed.tenders.forEach((t: any) => {
          const blockIdx = chunk.findIndex(b => b.text.includes((t.title || '').substring(0, 20)));
          const meta = blockIdx !== -1 ? chunk[blockIdx] : null;
          allExtracted.push({
            title: t.title, description: t.description, category: t.category,
            deadline_iso: t.deadline_iso || t.deadline, estimated_value: t.estimated_value,
            currency: t.currency || 'PKR', mandatory_reqs: t.mandatory_reqs || [],
            details: t.details || {}, direct_url: t.direct_url || meta?.directUrl || sourceUrl,
            original_html: meta?.html || t.description, recommendation: t.recommendation
          });
        });
      }
    } catch (err: any) { logger.error(`Chunk error: ${err.message}`); }
    finally { llmSemaphore.release(); }

    if (i < chunksToProcess.length - 1) await new Promise(r => setTimeout(r, 2000));
  }
  return allExtracted;
}