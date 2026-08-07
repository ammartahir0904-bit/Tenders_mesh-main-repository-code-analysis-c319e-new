import type { RawScrapedTender, Tender, IParser } from '../types.js';
import { TenderSchema } from '../types.js';
import { config } from '../config/env.js';
import { configService } from '../config/config.service.js';
import { fetchWithTimeout } from '../services/http-client.js';
import { logger } from '../utils/logger.js';
import { normalizeLocation } from '../utils/location-normalizer.js';

export class AIParser implements IParser {
  private apiKey: string | undefined;
  private model: string;

  private provider: string;

  constructor() {
    const aiConfig = configService.getAIConfig();
    this.apiKey = aiConfig.apiKey;
    this.model = aiConfig.model;
    this.provider = aiConfig.provider;
  }

  async parse(raw: RawScrapedTender, sourceName: string = 'PPRA'): Promise<Tender | null> {
    const text = raw.raw_html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!this.apiKey) {
      logger.warn('[AI Parser] AI_API_KEY not set; using heuristic fallback parser');
      return this.parseHeuristically(raw, sourceName);
    }

    const fallbackTender = this.parseHeuristically(raw, sourceName);
    if (!fallbackTender) {
      return null;
    }

    const prompt = `Extract tender details from this text. Return ONLY a JSON object containing a "tender" key.
{
  "tender": {
    "title": "string",
    "buying_org": "string or null",
    "category": "string or null",
    "location": "string or null",
    "estimated_value_paisa": "integer or null (convert Lakh/Crore to minor units. 50 Lakh = 5000000000)",
    "deadline_iso": "string or null (ISO 8601)",
    "mandatory_reqs": ["array of strings"]
  }
}

TEXT:
${text.substring(0, 3000)}`;

    try {
      const providerConfig = configService.getServiceConfig(this.provider);
      const apiUrl = `${providerConfig.baseUrl}/chat/completions`;

      const response = await fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a procurement data extraction assistant. Output only a valid JSON object. No markdown, no extra text.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.05,
          response_format: { type: 'json_object' }
        }),
      }, 20000);

      if (!response.ok) {
        logger.warn('[AI Parser] API response failed', { status: response.status });
        return fallbackTender;
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      if (!content) {
        return fallbackTender;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        logger.warn('[AI Parser] JSON parse failed', { error });
        return fallbackTender;
      }

      const extracted = parsed?.tender || parsed || {};

      const tender = {
        source: sourceName,
        source_url: raw.source_url,
        source_id: raw.source_id,
        title: extracted.title || 'Untitled',
        buying_org: extracted.buying_org,
        category: extracted.category,
        location: normalizeLocation(extracted.location, sourceName, extracted.buying_org || ''),
        estimated_value: typeof extracted.estimated_value_paisa === 'number' ? extracted.estimated_value_paisa : null,
        currency: 'PKR',
        deadline: (() => {
          if (typeof extracted.deadline_iso !== 'string' || !extracted.deadline_iso) return null;
          try {
            const d = new Date(extracted.deadline_iso);
            if (isNaN(d.getTime())) return null;
            const nowThreshold = new Date();
            nowThreshold.setHours(0,0,0,0);
            nowThreshold.setDate(nowThreshold.getDate() - 1);
            if (d < nowThreshold || d.getFullYear() < 2026) return null;
            return d.toISOString();
          } catch { return null; }
        })(),
        mandatory_reqs: Array.isArray(extracted.mandatory_reqs) ? extracted.mandatory_reqs : [],
        raw_html: raw.raw_html,
        description: extracted.description ? String(extracted.description) : undefined,
        direct_url: raw.direct_url || extracted.direct_url || undefined,
        details: extracted.details || raw.details || undefined,
      };

      const result = TenderSchema.safeParse(tender);
      if (!result.success) {
        logger.warn('[AI Parser] Validation failed for parsed tender', { errors: result.error.format?.() ?? undefined });
        return fallbackTender;
      }

      return result.data;
    } catch (error: any) {
      logger.warn('[AI Parser] Request failed for AI provider', { message: error?.message ?? error });
      return fallbackTender;
    }
  }

  private parseHeuristically(raw: RawScrapedTender, sourceName: string = 'PPRA'): Tender | null {
    const rawHtml = raw.raw_html || '';
    
    // Find title from raw HTML
    const titleMatch = rawHtml.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                       rawHtml.match(/<h2[^>]*>(.*?)<\/h2>/i) ||
                       rawHtml.match(/<title[^>]*>(.*?)<\/title>/i) ||
                       rawHtml.match(/<th[^>]*>(.*?)<\/th>/i);
    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, ' ').trim() || 'Untitled Tender';

    // Strip tags for text-based extraction
    const text = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const orgMatch = text.match(/organization[:\s]+([^\n,.]{2,80})/i) || text.match(/department[:\s]+([^\n,.]{2,80})/i);
    const categoryMatch = text.match(/category[:\s]+([^\n,.]{2,80})/i) || text.match(/service[:\s]+([^\n,.]{2,80})/i);
    const locationMatch = text.match(/location[:\s]+([^\n,.]{2,80})/i);
    const deadlineMatch = text.match(/deadline[:\s]+([^\n,.]{2,80})/i) || text.match(/closing date[:\s]+([^\n,.]{2,80})/i);
    
    const requirements = Array.from(text.matchAll(/([A-Za-z0-9 .,-]{3,80})/g))
      .map((m) => m[1].trim())
      .filter((value) => /ntn|registration|certificate|experience|license|company/i.test(value))
      .slice(0, 5);

    const buyingOrg = orgMatch?.[1]?.trim() || '';
    const rawLoc = locationMatch?.[1]?.trim();

    const tender = {
      source: sourceName,
      source_url: raw.source_url,
      source_id: raw.source_id,
      title,
      buying_org: buyingOrg || undefined,
      category: categoryMatch?.[1]?.trim(),
      location: normalizeLocation(rawLoc, sourceName, buyingOrg),
      estimated_value: null,
      currency: 'PKR' as const,
      deadline: (() => {
        const val = deadlineMatch?.[1]?.trim();
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      })(),
      mandatory_reqs: requirements,
      raw_html: raw.raw_html,
      description: undefined,
      direct_url: raw.direct_url || undefined,
      details: raw.details || undefined,
    };

    const result = TenderSchema.safeParse(tender);
    return result.success ? result.data : null;
  }
}