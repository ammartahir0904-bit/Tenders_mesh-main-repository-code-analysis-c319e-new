// "?"?"? Central Sources Registry "?"?"?
// Single source of truth for all tender sources.
// Add a new source here ?" the pipeline, scan route, and frontend all derive from this.
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

export interface SourceDefinition {
  id?: string;
  name: string;
  label: string;           // Human-readable for UI dropdowns
  region: 'PAKISTAN_FEDERAL' | 'PAKISTAN_PROVINCIAL' | 'INTERNATIONAL' | 'UNITED_STATES' | 'GULF';
  urls: string[];
  enabled: boolean;
  parserType: 'ai' | 'ppra_ai';
  usePlaywright: boolean;  // true = render with headless Chromium, false = API-based
}

export let SOURCES: SourceDefinition[] = [
  // "?"? Pakistan Federal "?"?
  {
    name: 'PPRA_AI',
    label: 'PPRA (Federal)',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://epms.ppra.gov.pk/public/tenders/active-tenders',
    ],
    enabled: true,
    parserType: 'ppra_ai',
    usePlaywright: false,
  },
  {
    name: 'PAKISTAN_GOV',
    label: 'Pakistan.gov.pk',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://www.pakistan.gov.pk/departmental-procurement',
    ],
    enabled: false,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'PEC',
    label: 'Pakistan Engineering Council',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://www.pec.org.pk/tenders.aspx',
    ],
    enabled: false,
    parserType: 'ai',
    usePlaywright: false,
  },

  {
    name: 'FBR',
    label: 'Federal Board of Revenue',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://www.fbr.gov.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'NEPRA',
    label: 'NEPRA',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://nepra.org.pk/tenders.php',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  /*
  {
    name: 'OGRA',
    label: 'OGRA',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://ogra.org.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'NTDC',
    label: 'NTDC',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://ntdc.com.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'PIA',
    label: 'PIA Procurement',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://www.piac.com.pk/tenders',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'PAK_RAILWAYS',
    label: 'Pakistan Railways',
    region: 'PAKISTAN_FEDERAL',
    urls: [
      'https://www.pakistanrailways.gov.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },

  // "?"? Pakistan Provincial "?"?
  {
    name: 'SPPRA',
    label: 'SPPRA (Sindh)',
    region: 'PAKISTAN_PROVINCIAL',
    urls: [
      'https://sppra.gos.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'KPPRA',
    label: 'KPPRA (Khyber Pakhtunkhwa)',
    region: 'PAKISTAN_PROVINCIAL',
    urls: [
      'https://kppra.gov.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'BPPRA',
    label: 'BPPRA (Balochistan)',
    region: 'PAKISTAN_PROVINCIAL',
    urls: [
      'https://bppra.gos.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  */
  {
    name: 'PRA_PUNJAB',
    label: 'PRA Punjab',
    region: 'PAKISTAN_PROVINCIAL',
    urls: [
      'https://pra.punjab.gov.pk/tenders/',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },

  // "?"? International (API-based ?" no Playwright needed) "?"?
  {
    name: 'SAM_GOV',
    label: 'SAM.gov (US)',
    region: 'INTERNATIONAL',
    urls: ['https://sam.gov/search'],
    enabled: false,
    parserType: 'ai',
    usePlaywright: true,
  },

  {
    name: 'GSA_EBUY',
    label: 'GSA eBuy',
    region: 'UNITED_STATES',
    urls: ['https://www.ebuy.gsa.gov/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
  {
    name: 'WORLD_BANK',
    label: 'World Bank',
    region: 'INTERNATIONAL',
    urls: ['https://projects.worldbank.org/en/projects-operations/procurement'],
    enabled: false,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'UNGM',
    label: 'UN Global Marketplace',
    region: 'INTERNATIONAL',
    urls: [
      'https://www.ungm.org/Public/Notice',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'ADB',
    label: 'Asian Development Bank',
    region: 'INTERNATIONAL',
    urls: [
      'https://www.adb.org/procurement',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  {
    name: 'ISDB',
    label: 'Islamic Development Bank',
    region: 'INTERNATIONAL',
    urls: [
      'https://www.isdb.org/procurement',
    ],
    enabled: true,
    parserType: 'ai',
    usePlaywright: false,
  },
  // ─── New Additions (Gulf & EU) ───
  {
    name: 'TED_EU',
    label: 'Tenders Electronic Daily (EU)',
    region: 'INTERNATIONAL',
    urls: ['https://ted.europa.eu/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
  {
    name: 'GULF_TENDERS',
    label: 'Gulf Tenders',
    region: 'INTERNATIONAL',
    urls: ['https://www.gulftenders.com/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
  {
    name: 'SAUDI_ETIMAD',
    label: 'Saudi Etimad',
    region: 'INTERNATIONAL',
    urls: ['https://monafasat.etimad.sa/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
  {
    name: 'UAE_DPP',
    label: 'UAE Digital Procurement Portal',
    region: 'GULF',
    urls: ['https://www.mof.gov.ae/en/eservices/digital-procurement-platform/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
  {
    name: 'DUBAI_ESUPPLY',
    label: 'Dubai eSupply',
    region: 'INTERNATIONAL',
    urls: ['https://esupply.dubai.gov.ae/'],
    enabled: true,
    parserType: 'ai',
    usePlaywright: true,
  },
];

export let ENABLED_SOURCE_NAMES = SOURCES.filter((s) => s.enabled).map((s) => s.name);
export let ENABLED_SOURCES = SOURCES.filter((s) => s.enabled);

export function getSourcesByRegion(region: SourceDefinition['region']) {
  return ENABLED_SOURCES.filter((s) => s.region === region);
}

export function updateInMemSources(newSources: SourceDefinition[]) {
  SOURCES = newSources;
  ENABLED_SOURCES = SOURCES.filter(s => s.enabled);
  ENABLED_SOURCE_NAMES = ENABLED_SOURCES.map(s => s.name);
}

export async function initSources(pool: Pool) {
  try {
    const result = await pool.query('SELECT * FROM tender_sources ORDER BY created_at ASC');
    if (result.rows.length === 0) {
      // Seed default sources
      logger.info('Seeding default tender sources into database...');
      for (const s of SOURCES) {
        await pool.query(
          `INSERT INTO tender_sources (name, label, region, urls, enabled, parser_type, use_playwright)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [s.name, s.label, s.region, JSON.stringify(s.urls), s.enabled, s.parserType, s.usePlaywright]
        );
      }
    } else {
      const validSourceNames = new Set(SOURCES.map(s => s.name));
      const dbSources: SourceDefinition[] = result.rows
        .filter(r => validSourceNames.has(r.name)) // Ignore sources that were commented out in codebase
        .map(r => ({
          id: r.id,
          name: r.name,
          label: r.label,
          region: r.region,
          urls: r.urls,
          enabled: r.enabled,
          parserType: r.parser_type,
          // FORCE Playwright for SAM_GOV because the DB seed might be false
          usePlaywright: r.name === 'SAM_GOV' ? true : r.use_playwright
        }));
      updateInMemSources(dbSources);
    }
  } catch (err: any) {
    logger.error('Failed to init sources from DB, using defaults', { error: err.message });
  }
}
