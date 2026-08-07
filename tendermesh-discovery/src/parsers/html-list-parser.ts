import { JSDOM } from 'jsdom';
import type { RawScrapedTender, Tender } from '../types.js';
import { TenderSchema } from '../types.js';
import { normalizeLocation } from '../utils/location-normalizer.js';
import { logger } from '../utils/logger.js';

export function parseHtmlList(raw: RawScrapedTender, sourceName: string): Tender[] {
  const tenders: Tender[] = [];
  try {
    const dom = new JSDOM(raw.raw_html || '');
    const document = dom.window.document;

    // Look for table rows, list items, and article/div blocks that might be tenders
    const rows = document.querySelectorAll('tr, div[class*="tender"], div[class*="notice"], div.item, article, li.tender');
    
    rows.forEach((row, index) => {
      // First try td/th for table rows, fallback to just any block child element
      let cells = Array.from(row.querySelectorAll('td, th'));
      if (cells.length === 0) {
          cells = Array.from(row.querySelectorAll('div, p, span'));
      }
      if (cells.length === 0) {
          cells = [row as Element]; // fallback to the row itself
      }

      const textParts = cells.map(cell => cell.textContent?.replace(/\s+/g, ' ').trim() || '').filter(Boolean);
      const fullText = textParts.join(' ').toLowerCase();

      // Basic heuristic: A tender usually has keywords or a date
      const hasTenderKeywords = /tender|procurement|bid|proposal|notice/i.test(fullText);
      const hasDate = /\d{2}[-/]\d{2}[-/]\d{2,4}/.test(fullText) || /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(fullText);

      if (hasTenderKeywords || hasDate) {
        let title = textParts.find(p => p.length > 15 && p.length < 200) || textParts[0];
        
        // Rule 5: Reject generic or ultra-short titles
        if (!title || title.length < 10 || /^untitled/i.test(title) || /^tender notice/i.test(title)) {
          return;
        }

        const linkEl = row.querySelector('a');
        const link = linkEl ? linkEl.href : raw.source_url;

        let deadline = null;
        try {
            const dateMatch = fullText.match(/\d{2}[-/]\d{2}[-/]\d{2,4}/) || fullText.match(/\d{4}[-/]\d{2}[-/]\d{2}/);
            if (dateMatch) {
               const parsedDate = new Date(dateMatch[0]);
               if (!isNaN(parsedDate.getTime())) {
                   const nowThreshold = new Date();
                   nowThreshold.setHours(0,0,0,0);
                   nowThreshold.setDate(nowThreshold.getDate() - 1); // 1-day grace buffer for timezones
                   
                   // Rule 1 & 2: Drop if deadline is in the past or year < 2026
                   if (parsedDate < nowThreshold || parsedDate.getFullYear() < 2026) {
                       return; // Skip past/expired tenders
                   }
                   deadline = parsedDate.toISOString();
               }
            }
        } catch (e) {}

        let sourceUrl = raw.source_url;
        try {
            sourceUrl = link.startsWith('http') ? link : new URL(link, raw.source_url).href;
        } catch(e) {}

        const tender = {
          source: sourceName,
          source_url: sourceUrl,
          source_id: `${sourceName.toLowerCase()}-fallback-${Date.now()}-${index}`,
          title: title,
          buying_org: sourceName,
          category: undefined,
          location: normalizeLocation('', sourceName, sourceName),
          estimated_value: null,
          currency: 'PKR' as const,
          deadline: deadline,
          mandatory_reqs: [],
          raw_html: row.outerHTML,
          description: undefined,
          direct_url: raw.direct_url || sourceUrl,
          details: raw.details || undefined,
        };

        const parsed = TenderSchema.safeParse(tender);
        if (parsed.success) {
          tenders.push(parsed.data);
        }
      }
    });

  } catch (error: any) {
    logger.warn(`[HTML List Parser] Failed to parse HTML for ${raw.source_url}: ${error.message}`);
  }

  return tenders;
}
