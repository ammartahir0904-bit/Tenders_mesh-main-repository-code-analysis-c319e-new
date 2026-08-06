import type { RawScrapedTender, Tender, IParser } from '../types.js';
import { TenderSchema } from '../types.js';

export class PPRAParser implements IParser {
  async parse(raw: RawScrapedTender): Promise<Tender | null> {
    // Create a temporary DOM to extract text easily
    const doc = new DOMParser().parseFromString(raw.raw_html, 'text/html');
    const text = doc.body?.innerText || '';
    const title = this.extractTitle(text, doc);
    if (!title) return null; // If no title, it's a bad page

    const parsed = {
      source: 'PPRA',
      source_url: raw.source_url,
      source_id: raw.source_id,
      title: title,
      buying_org: this.extractOrg(text),
      category: this.extractCategory(text),
      location: this.extractLocation(text),
      estimated_value: this.extractMoney(text),
      currency: 'PKR',
      deadline: this.extractDeadline(text),
      mandatory_reqs: this.extractReqs(text),
      raw_html: raw.raw_html,
    };

    // Validate with Zod
    const result = TenderSchema.safeParse(parsed);
    if (!result.success) {
      console.error(`[Parser] Failed validation for: ${title}`);
      return null;
    }
    return result.data;
  }

  private extractTitle(text: string, doc: Document): string | null {
    // Try H1 or H2
    const h1 = doc.querySelector('h1')?.innerText?.trim();
    if (h1 && h1.length > 5 && h1.length < 200) return h1;
    const h2 = doc.querySelector('h2')?.innerText?.trim();
    if (h2 && h2.length > 5 && h2.length < 200) return h2;
    // Fallback: Look for "Tender Notice" in text
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
    const cities = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Quetta'];
    for (const city of cities) {
      if (text.toLowerCase().includes(city.toLowerCase())) return city;
    }
    return undefined;
  }

  private extractMoney(text: string): number | null {
    // Look for patterns like "Rs. 50 Lakh" or "PKR 5,000,000"
    let match = text.match(/rs\.?\s*([\d,.]+)\s*lakh/i);
    if (match) return Math.round(parseFloat(match[1].replace(',', '')) * 100000 * 100); // Convert to paisa
    match = text.match(/(?:pkr|rs\.?)\s*([\d,.]+)/i);
    if (match) return Math.round(parseFloat(match[1].replace(/,/g, '')) * 100); // Convert to paisa
    return null;
  }

  private extractDeadline(text: string): string | null {
    // DD-MM-YYYY
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
