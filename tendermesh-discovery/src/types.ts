import { z } from 'zod';

export interface RawScrapedTender {
  source_url: string;
  source_id: string;
  raw_html: string;
  direct_url?: string;
  details?: Record<string, any>;
  extracted?: any;
}

export const TenderSchema = z.object({
  source: z.string(),
  source_url: z.string(),
  source_id: z.string(),
  title: z.string(),
  buying_org: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  estimated_value: z.number().int().nullable(),
  currency: z.string().default('PKR'),
  deadline: z.string().datetime().nullable(),
  mandatory_reqs: z.array(z.string()),
  raw_html: z.string(),
  description: z.string().nullable().optional(),
  direct_url: z.string().nullable().optional(),
  details: z.record(z.any()).nullable().optional(),
});

export type Tender = z.infer<typeof TenderSchema>;

export interface IParser {
  parse(raw: RawScrapedTender, sourceName?: string): Promise<Tender | null>;
}
