import 'dotenv/config';
import { tfIdfFilter, type RawTender } from './tfidf.js';

const COLORS = { green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', reset: '\x1b[0m' };

async function main() {
  console.log(`\n${COLORS.bold}═══ TF-IDF PRE-FILTER ENGINE (ZERO TOKENS) ═══${COLORS.reset}\n`);

  const rawData: RawTender[] = [
    { tender_id: "PPRA-2024-001", title: "Supply of IT Equipment and Laptops", category_raw: "Information Technology", deadline: "15/08/2026" },
    { tender_id: "PPRA-2024-002", title: "Construction of Bridge over River", category_raw: "Civil Works", deadline: "20/08/2026" },
    { tender_id: "PPRA-2024-003", title: "Managed IT Services and Support", category_raw: "IT Services", deadline: "10/08/2026" },
    { tender_id: "PPRA-2024-004", title: "Office Furniture Supply", category_raw: "General Items", deadline: "25/08/2026" },
    { tender_id: "PPRA-2024-005", title: "Software Development for ERP System", category_raw: "Software and IT", deadline: "2026-08-30" },
    { tender_id: "PPRA-2024-006", title: "Network Infrastructure Upgradation", category_raw: "IT Equipment", deadline: "01/07/2024" },
    { tender_id: "PPRA-2024-007", title: "Cleaning Services for Office", category_raw: "Sanitation", deadline: "UNKNOWN" },
  ];

  console.log(`[INPUT] ${rawData.length} raw tenders loaded.`);
  console.log(`[QUERY] Keywords: ["IT", "Software", "Equipment"]\n`);

  const result = tfIdfFilter(
    rawData,
    ["IT", "Software", "Equipment"],
    [], 
    15, 
    0.1, 
    false 
  );

  console.log(`${COLORS.yellow}[STATS] Input: ${result.stats.input} | Passed Hard Filters: ${result.stats.hardFiltered} | Final: ${result.stats.final}${COLORS.reset}\n`);
  console.log(`${COLORS.bold}RANKED RESULTS:${COLORS.reset}\n`);

  for (const tender of result.shortlisted) {
    console.log(`  ${COLORS.green}[${tender.similarity_score.toFixed(6)}]${COLORS.reset} ${tender.tender_id} - ${tender.title}`);
    console.log(`         Category: ${tender.category_raw} | Deadline: ${tender.deadline}\n`);
  }

  console.log(`${COLORS.bold}═══════════════════════════════════════════════════${COLORS.reset}\n`);
}

main();