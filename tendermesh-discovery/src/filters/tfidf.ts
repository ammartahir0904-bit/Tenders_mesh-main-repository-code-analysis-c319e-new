// ─── TF-IDF Filter Module (exported for use by filters.ts and pipeline) ───

const STOPWORDS = new Set(["a", "an", "the", "of", "for", "in", "to", "and", "or", "with", "by", "on", "at", "is", "are", "be", "as", "that", "this", "from", "have", "has", "it", "its", "not", "but", "also"]);

export interface RawTender {
  tender_id: string;
  title: string;
  category_raw: string;
  deadline: string;
  direct_url?: string;
  original_html?: string;
  similarity_score?: number;
}

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

export interface TfIdfResult {
  shortlisted: Array<{
    tender_id: string;
    title: string;
    category_raw: string;
    deadline: string;
    similarity_score: number;
  }>;
  stats: {
    input: number;
    hardFiltered: number;
    final: number;
  };
}

export function tfIdfFilter(
  rawTenders: RawTender[],
  categoryKeywords: string[],
  _excludeCategories: string[] = [],
  _topN: number = 15,
  _minScore: number = 0.1,
  _verbose: boolean = false
): TfIdfResult {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const hardPassed: RawTender[] = [];

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
  const scored = tenderTokens.map((t, idx) => ({ tender: hardPassed[idx], score: cosine(queryVec, getVec(t)) }))
    .filter(s => s.score >= _minScore)
    .sort((a, b) => b.score - a.score);

  return {
    shortlisted: scored.map(s => ({
      tender_id: s.tender.tender_id,
      title: s.tender.title,
      category_raw: s.tender.category_raw,
      deadline: s.tender.deadline,
      similarity_score: s.score,
    })),
    stats: {
      input: rawTenders.length,
      hardFiltered: hardPassed.length,
      final: scored.length,
    },
  };
}