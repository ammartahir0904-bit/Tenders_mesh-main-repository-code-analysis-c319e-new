/**
 * Location Normalizer Utility
 * 
 * Cleans up raw HTML, extracts valid Pakistani city/province names,
 * and formats tender locations consistently.
 */

const PAKISTAN_LOCATIONS: Record<string, string> = {
  islamabad: 'Islamabad, Pakistan',
  rawalpindi: 'Rawalpindi, Punjab',
  lahore: 'Lahore, Punjab',
  karachi: 'Karachi, Sindh',
  peshawar: 'Peshawar, Khyber Pakhtunkhwa',
  quetta: 'Quetta, Balochistan',
  faisalabad: 'Faisalabad, Punjab',
  multan: 'Multan, Punjab',
  gujranwala: 'Gujranwala, Punjab',
  hyderabad: 'Hyderabad, Sindh',
  sukkur: 'Sukkur, Sindh',
  gilgit: 'Gilgit, Gilgit-Baltistan',
  muzaffarabad: 'Muzaffarabad, Azad Kashmir',
  abbottabad: 'Abbottabad, Khyber Pakhtunkhwa',
  sialkot: 'Sialkot, Punjab',
  bahawalpur: 'Bahawalpur, Punjab',
  sargodha: 'Sargodha, Punjab',
  punjab: 'Punjab, Pakistan',
  sindh: 'Sindh, Pakistan',
  kpk: 'Khyber Pakhtunkhwa, Pakistan',
  balochistan: 'Balochistan, Pakistan',
  federal: 'Islamabad, Pakistan',
  capital: 'Islamabad, Pakistan',
};

export function normalizeLocation(
  rawLocation?: string | null,
  sourceName: string = '',
  buyingOrg: string = ''
): string {
  if (!rawLocation) {
    return inferFromContext(sourceName, buyingOrg);
  }

  // 1. Strip raw HTML tags and excessive whitespace
  let clean = rawLocation
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If text contains unwanted sentence fragments or HTML dump
  if (clean.length > 80 || /description|mandatory|deadline|requirements/i.test(clean)) {
    clean = clean.split(/[.,;\n]/)[0] || '';
  }

  if (!clean || clean.toLowerCase() === 'not specified' || clean.toLowerCase() === 'null') {
    return inferFromContext(sourceName, buyingOrg);
  }

  const lower = clean.toLowerCase();

  // 2. Check for Pakistani city/province matches
  for (const [key, normalized] of Object.entries(PAKISTAN_LOCATIONS)) {
    if (lower.includes(key)) {
      return normalized;
    }
  }

  // 3. International location checks
  if (lower.includes('washington') || lower.includes('usa') || lower.includes('united states')) {
    return 'Washington D.C., USA';
  }
  if (lower.includes('york')) {
    return 'New York, USA';
  }
  if (lower.includes('remote') || lower.includes('online')) {
    return 'Remote / Online';
  }

  // 4. Return clean string or fallback
  return clean.length <= 40 ? clean : inferFromContext(sourceName, buyingOrg);
}

function inferFromContext(sourceName: string, buyingOrg: string): string {
  const combined = `${sourceName} ${buyingOrg}`.toLowerCase();

  if (combined.includes('sindh') || combined.includes('sppra') || combined.includes('karachi')) {
    return 'Karachi, Sindh';
  }
  if (combined.includes('punjab') || combined.includes('pra') || combined.includes('lahore')) {
    return 'Lahore, Punjab';
  }
  if (combined.includes('kpk') || combined.includes('kppra') || combined.includes('peshawar')) {
    return 'Peshawar, Khyber Pakhtunkhwa';
  }
  if (combined.includes('balochistan') || combined.includes('bppra') || combined.includes('quetta')) {
    return 'Quetta, Balochistan';
  }
  if (combined.includes('undp') || combined.includes('world bank') || combined.includes('sam')) {
    return 'International';
  }

  return 'Islamabad, Pakistan';
}
