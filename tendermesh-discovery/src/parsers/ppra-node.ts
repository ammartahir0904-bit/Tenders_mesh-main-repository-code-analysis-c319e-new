// ─── Node.js-compatible PPRA Parser (uses jsdom instead of browser DOMParser) ───

import { JSDOM } from 'jsdom';
import type { RawScrapedTender, Tender, IParser } from '../types.js';
import { TenderSchema } from '../types.js';
import { normalizeLocation } from '../utils/location-normalizer.js';

export class PPRANodeParser implements IParser {
  async parse(raw: RawScrapedTender, sourceName: string = 'PPRA'): Promise<Tender | null> {
    const dom = new JSDOM(raw.raw_html);
    const doc = dom.window.document;
    const text = doc.body?.textContent || '';

    const title = this.extractTitle(text, doc);
    if (!title) return null;

    const buyingOrg = this.extractOrg(text) || '';

    const parsed = {
      source: sourceName,
      source_url: raw.source_url,
      source_id: raw.source_id,
      title: title,
      buying_org: buyingOrg || undefined,
      category: this.extractCategory(text),
      location: normalizeLocation(this.extractLocation(text), sourceName, buyingOrg),
      estimated_value: this.extractMoney(text),
      currency: 'PKR' as const,
      deadline: this.extractDeadline(text),
      mandatory_reqs: this.extractReqs(text),
      raw_html: raw.raw_html,
    };

    const result = TenderSchema.safeParse(parsed);
    if (!result.success) {
      console.error(`[PPRANodeParser] Failed validation for: ${title}`);
      return null;
    }
    return result.data;
  }

  private extractTitle(text: string, doc: Document): string | null {
    const h1 = doc.querySelector('h1')?.textContent?.trim();
    if (h1 && h1.length > 5 && h1.length < 200) return h1;
    const h2 = doc.querySelector('h2')?.textContent?.trim();
    if (h2 && h2.length > 5 && h2.length < 200) return h2;
    const match = text.match(/tender notice[^.\n]{5,100}/i);
    return match ? match[0].trim() : null;
  }

  private extractOrg(text: string): string | undefined {
    const match = text.match(/(?:organization|department|ministry|authority|agency)[\s:]*([^\n,]{5,50})/i);
    return match?.[1]?.trim() || undefined;
  }

  private extractCategory(text: string): string | undefined {
    const lower = text.toLowerCase();
    if (lower.includes('it equipment') || lower.includes('computer')) return 'IT Equipment';
    if (lower.includes('it services') || lower.includes('managed')) return 'IT Services';
    if (lower.includes('software')) return 'Software Development';
    if (lower.includes('construction') || lower.includes('civil')) return 'Construction';
    return undefined;
  }

  private extractLocation(text: string): string | undefined {
    const cities = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad'];
    for (const city of cities) {
      if (text.toLowerCase().includes(city.toLowerCase())) return city;
    }
    return undefined;
  }

  private extractMoney(text: string): number | null {
    let match = text.match(/rs\.?\s*([\d,.]+)\s*lakh/i);
    if (match) return Math.round(parseFloat(match[1].replace(',', '')) * 100000 * 100);
    match = text.match(/(?:pkr|rs\.?)\s*([\d,.]+)/i);
    if (match) return Math.round(parseFloat(match[1].replace(/,/g, '')) * 100);
    return null;
  }

  private extractDeadline(text: string): string | null {
    let match = text.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (match) {
      const date = new Date(`${match[3]}-${match[2]}-${match[1]}T17:00:00Z`);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    return null;
  }

  private extractReqs(text: string): string[] {
    const reqs: string[] = [];
    const patterns = [
      /ntn[^.]*/gi,
      /ppra registered[^.]*/gi,
      /minimum \d+ years[^.]*/gi,
    ];
    patterns.forEach(p => {
      const matches = text.match(p);
      if (matches) reqs.push(...matches.map(m => m.trim()));
    });
    return [...new Set(reqs)];
  }
}