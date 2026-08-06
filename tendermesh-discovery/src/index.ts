const COLORS = { green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', reset: '\x1b[0m' };

const STOPWORDS = new Set(["a", "an", "the", "of", "for", "in", "to", "and", "or", "with", "by", "on", "at", "is", "are", "be", "as", "that", "this", "from", "have", "has", "it", "its", "not", "but", "also"]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 0 && !STOPWORDS.has(t));
}

function parseDeadline(raw: string): Date | null {
  raw = raw.trim();
  if (!raw || raw === "UNKNOWN") return null;
  const m1 = raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m1) return new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]));
  const m2 = raw.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]));
  return null;
}

function tfIdfFilter(rawTenders: any[], categoryKeywords: string[]) {
  const today = new Date(); today.setHours(0,0,0,0);
  const hardPassed: any[] = [];

  for (const t of rawTenders) {
    if (t.deadline !== "UNKNOWN" && t.deadline !== "") {
      const d = parseDeadline(t.deadline);
      if (d !== null && d < today) continue;
    }
    hardPassed.push(t);
  }

  const queryTokens = tokenize(categoryKeywords.join(" "));
  const tenderTokens = hardPassed.map(t => tokenize(`${t.title} ${t.category_raw}`));
  const allDocs = [queryTokens, ...tenderTokens];
  const numDocs = allDocs.length;

  const vocabSet = new Set(allDocs.flat());
  const vocab = [...vocabSet].sort();
  const vocabIdx = new Map(vocab.map((v, i) => [v, i]));

  const df: number[] = new Array(vocab.length).fill(0);
  for (const doc of allDocs) { for (const tok of new Set(doc)) { const i = vocabIdx.get(tok); if (i !== undefined) df[i]++; } }
  const idf = df.map(d => Math.log((1 + numDocs) / (1 + d)) + 1.0);

  const getVec = (tokens: string[]) => {
    const vec: number[] = new Array(vocab.length).fill(0);
    if (!tokens.length) return vec;
    const freq: Record<string, number> = {};
    for (const tok of tokens) freq[tok] = (freq[tok] || 0) + 1;
    for (const [term, count] of Object.entries(freq)) { const i = vocabIdx.get(term); if (i !== undefined) vec[i] = (count / tokens.length) * idf[i]; }
    return vec;
  };

  const cosine = (a: number[], b: number[]) => {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i]; }
    return (nA === 0 || nB === 0) ? 0 : dot / (Math.sqrt(nA) * Math.sqrt(nB));
  };

  const queryVec = getVec(queryTokens);
  return tenderTokens.map((t, idx) => ({ tender: hardPassed[idx], score: cosine(queryVec, getVec(t)) }))
    .filter(s => s.score >= 0.1)
    .sort((a, b) => b.score - a.score);
}

const rawData = [
  { tender_id: "PPRA-001", title: "Supply of IT Equipment and Laptops", category_raw: "Information Technology", deadline: "15/08/2026" },
  { tender_id: "PPRA-002", title: "Construction of Bridge over River", category_raw: "Civil Works", deadline: "20/08/2026" },
  { tender_id: "PPRA-003", title: "Managed IT Services and Support", category_raw: "IT Services", deadline: "10/08/2026" },
  { tender_id: "PPRA-004", title: "Office Furniture Supply", category_raw: "General Items", deadline: "25/08/2026" },
  { tender_id: "PPRA-005", title: "Software Development for ERP System", category_raw: "Software and IT", deadline: "2026-08-30" },
  { tender_id: "PPRA-006", title: "Network Infrastructure Upgradation", category_raw: "IT Equipment", deadline: "01/07/2024" },
  { tender_id: "PPRA-007", title: "Cleaning Services for Office", category_raw: "Sanitation", deadline: "UNKNOWN" },
];

console.log(`\n${COLORS.bold}═══ TF-IDF PRE-FILTER (ZERO TOKENS) ═══${COLORS.reset}\n`);
const result = tfIdfFilter(rawData, ["IT", "Software", "Equipment"]);

console.log(`${COLORS.yellow}[STATS] Input: 7 | Passed: 6 | Final: ${result.length}${COLORS.reset}\n`);

for (const item of result) {
  console.log(`  ${COLORS.green}[${item.score.toFixed(6)}]${COLORS.reset} ${item.tender.tender_id} - ${item.tender.title}`);
}
console.log(`\n${COLORS.bold}═══════════════════════════════════${COLORS.reset}\n`);