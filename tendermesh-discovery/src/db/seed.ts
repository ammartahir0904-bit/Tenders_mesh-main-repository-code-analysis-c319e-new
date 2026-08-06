// ─── Database Seeder ───
// Seeds realistic, diverse sample tenders directly into PostgreSQL so they persist across restarts.
// Only runs when the discovered_tenders table is empty.

import { Pool } from 'pg';

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

export const SEED_TENDERS = [
  // 🇦🇪 GULF & UAE SOURCES
  {
    source: 'DUBAI_ESUPPLY', source_url: 'https://esupply.dubai.gov.ae/tenders/10492', source_id: 'DUBAI-2026-8841',
    title: 'Smart City Traffic Analytics & AI Surveillance Platform',
    buying_org: 'Dubai Smart Government Authority', category: 'Software Development', location: 'Dubai, UAE',
    estimated_value: 4500000, currency: 'AED', deadline: daysFromNow(24),
    mandatory_reqs: ['Trade License', 'ISO 27001 Certification', 'AI Framework Experience'],
    overall_score: 0.94, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.96, value: 0.91 },
  },
  {
    source: 'GULF_TENDERS', source_url: 'https://gulftenders.com/notice/77401', source_id: 'GULF-9942',
    title: '5G Core Network Upgrade & Edge Compute Nodes',
    buying_org: 'GCC Telecommunications Council', category: 'Tech Infrastructure', location: 'Abu Dhabi, UAE',
    estimated_value: 12000000, currency: 'AED', deadline: daysFromNow(38),
    mandatory_reqs: ['Telecom Partner License', 'Technical Proposal', 'Financial Audit'],
    overall_score: 0.88, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.90, value: 0.85 },
  },

  // 🇸🇦 SAUDI SOURCES
  {
    source: 'SAUDI_ETIMAD', source_url: 'https://etimad.sa/tenders/details/94012', source_id: 'ETIMAD-4401',
    title: 'National Digital Identity & Biometric Verification System',
    buying_org: 'Saudi Digital Government Authority', category: 'Software Development', location: 'Riyadh, Saudi Arabia',
    estimated_value: 8500000, currency: 'SAR', deadline: daysFromNow(19),
    mandatory_reqs: ['Commercial Registration (CR)', 'Zakat Certificate', 'Cybersecurity Clearance'],
    overall_score: 0.91, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.95, value: 0.87 },
  },
  {
    source: 'ISDB', source_url: 'https://isdb.org/procurement/notices/3021', source_id: 'ISDB-2026-05',
    title: 'Fintech Portal & Cross-Border Payment Integration',
    buying_org: 'Islamic Development Bank IT Division', category: 'IT Services', location: 'Jeddah, Saudi Arabia',
    estimated_value: 3200000, currency: 'SAR', deadline: daysFromNow(42),
    mandatory_reqs: ['Swift Integration Audit', 'Financial Stability Audit'],
    overall_score: 0.83, recommendation: 'YES', score_reasons: { relevance: 0.85, value: 0.81 },
  },

  // 🇪🇺 EUROPEAN UNION
  {
    source: 'TED_EU', source_url: 'https://ted.europa.eu/en/notice/-/detail/2026-004921', source_id: 'TED-EU-2026-104',
    title: 'European Federated Cloud Infrastructure & Data Sovereignty Hub',
    buying_org: 'European Commission DG CONNECT', category: 'Tech Infrastructure', location: 'Brussels, European Union',
    estimated_value: 15000000, currency: 'EUR', deadline: daysFromNow(55),
    mandatory_reqs: ['EU Security Clearance', 'Gaia-X Compliance', 'Multi-Cloud Architecture'],
    overall_score: 0.96, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.98, value: 0.94 },
  },

  // 🇺🇸 UNITED STATES
  {
    source: 'SAM_GOV', source_url: 'https://sam.gov/opp/7391024/view', source_id: 'SAM-2026-8802',
    title: 'Healthcare EHR Systems Integration & Cloud Migration',
    buying_org: 'US Dept of Veterans Affairs', category: 'Software Development', location: 'Washington D.C., United States',
    estimated_value: 22000000, currency: 'USD', deadline: daysFromNow(29),
    mandatory_reqs: ['FedRAMP Certification', 'HIPAA Compliance', 'CMMI Level 3'],
    overall_score: 0.89, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.92, value: 0.86 },
  },

  // 🇵🇰 PAKISTAN GOVERNMENT & LOCAL SOURCES
  {
    source: 'PPRA', source_url: 'https://ppra.gov.pk/tender-notices/9930', source_id: 'PPRA-2026-01',
    title: 'National Data Center Server Expansion & Core Switches',
    buying_org: 'Ministry of Information Technology & Telecom', category: 'IT Equipment', location: 'Islamabad, Pakistan',
    estimated_value: 180000000, currency: 'PKR', deadline: daysFromNow(14),
    mandatory_reqs: ['NTN/GST Certificate', 'Tier-3 Data Center Experience', 'OEM Authorization'],
    overall_score: 0.85, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.88, value: 0.82 },
  },
  {
    source: 'FBR', source_url: 'https://www.fbr.gov.pk/tenders/fbr-2026-09', source_id: 'FBR-2026-09',
    title: 'AI-Based Tax Evasion Detection & Track-and-Trace System',
    buying_org: 'Federal Board of Revenue', category: 'Software Development', location: 'Islamabad, Pakistan',
    estimated_value: 350000000, currency: 'PKR', deadline: daysFromNow(17),
    mandatory_reqs: ['NTN', 'Active Taxpayer List (ATL)', 'Big Data & ML Capability'],
    overall_score: 0.92, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.95, value: 0.89 },
  },
  {
    source: 'PRA_PUNJAB', source_url: 'https://pra.punjab.gov.pk/tenders/pra-881', source_id: 'PRA-PB-2026-04',
    title: 'Point of Sale (POS) Electronic Invoicing Middleware',
    buying_org: 'Punjab Revenue Authority', category: 'Software Development', location: 'Lahore, Punjab',
    estimated_value: 120000000, currency: 'PKR', deadline: daysFromNow(11),
    mandatory_reqs: ['NTN', 'PRA Registration', 'Real-Time API Security Audit'],
    overall_score: 0.87, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.90, value: 0.84 },
  },
  {
    source: 'SPPRA', source_url: 'https://sppra.gos.pk/tenders/sppra-441', source_id: 'SPPRA-2026-12',
    title: 'Smart Education Portal & Student Tablet Procurement',
    buying_org: 'Sindh Education & Literacy Department', category: 'IT Equipment', location: 'Karachi, Sindh',
    estimated_value: 250000000, currency: 'PKR', deadline: daysFromNow(31),
    mandatory_reqs: ['NTN', 'SRB Registration', 'Warranty Support in Sindh'],
    overall_score: 0.79, recommendation: 'YES', score_reasons: { relevance: 0.82, value: 0.76 },
  },
  {
    source: 'KPPRA', source_url: 'https://kppra.gov.pk/tenders/kp-901', source_id: 'KPPRA-2026-07',
    title: 'Khyber Pakhtunkhwa E-Procurement Portal Modernization',
    buying_org: 'KPPRA Board', category: 'IT Services', location: 'Peshawar, Khyber Pakhtunkhwa',
    estimated_value: 95000000, currency: 'PKR', deadline: daysFromNow(21),
    mandatory_reqs: ['KPRA Registration', 'Software Audit Certificate'],
    overall_score: 0.84, recommendation: 'YES', score_reasons: { relevance: 0.86, value: 0.82 },
  },
  {
    source: 'CDA', source_url: 'https://www.cda.gov.pk/tenders/cda-102', source_id: 'CDA-2026-03',
    title: 'Islamabad Safe City Wireless Network Expansion',
    buying_org: 'Capital Development Authority', category: 'Tech Infrastructure', location: 'Islamabad, Pakistan',
    estimated_value: 210000000, currency: 'PKR', deadline: daysFromNow(27),
    mandatory_reqs: ['PEC Registration (EE-11)', 'NTN', 'Security Clearance'],
    overall_score: 0.81, recommendation: 'YES', score_reasons: { relevance: 0.84, value: 0.78 },
  },
  {
    source: 'NHA', source_url: 'https://nha.gov.pk/tenders/nha-552', source_id: 'NHA-2026-11',
    title: 'Automated Toll Plaza RFID & License Plate Recognition',
    buying_org: 'National Highway Authority', category: 'Tech Infrastructure', location: 'Lahore, Punjab',
    estimated_value: 410000000, currency: 'PKR', deadline: daysFromNow(33),
    mandatory_reqs: ['PEC Registration', 'RFID Hardware Authorization'],
    overall_score: 0.76, recommendation: 'YES', score_reasons: { relevance: 0.78, value: 0.74 },
  },
  {
    source: 'PIA', source_url: 'https://www.piac.com.pk/tenders/pia-804', source_id: 'PIA-2026-02',
    title: 'Airline Passenger Service System (PSS) Migration',
    buying_org: 'Pakistan International Airlines', category: 'Software Development', location: 'Karachi, Sindh',
    estimated_value: 380000000, currency: 'PKR', deadline: daysFromNow(45),
    mandatory_reqs: ['IATA Certification', 'PCI-DSS Compliance', '24/7 SLA Support'],
    overall_score: 0.93, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.96, value: 0.90 },
  },
  {
    source: 'PAK_RAILWAYS', source_url: 'https://pakrail.gov.pk/tenders/pr-301', source_id: 'PR-2026-05',
    title: 'GPS Locomotive Tracking & Fleet Management Platform',
    buying_org: 'Pakistan Railways HQ', category: 'IT Services', location: 'Lahore, Punjab',
    estimated_value: 140000000, currency: 'PKR', deadline: daysFromNow(20),
    mandatory_reqs: ['NTN', 'PTA Telematics License'],
    overall_score: 0.82, recommendation: 'YES', score_reasons: { relevance: 0.85, value: 0.79 },
  },
  {
    source: 'NEPRA', source_url: 'https://nepra.org.pk/tenders/nep-401', source_id: 'NEPRA-2026-08',
    title: 'Renewable Energy Monitoring & Smart Grid Analytics',
    buying_org: 'National Electric Power Regulatory Authority', category: 'IT Services', location: 'Islamabad, Pakistan',
    estimated_value: 85000000, currency: 'PKR', deadline: daysFromNow(36),
    mandatory_reqs: ['NTN', 'Power Sector Consulting Experience'],
    overall_score: 0.86, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.88, value: 0.84 },
  },
  {
    source: 'OGRA', source_url: 'https://ogra.org.pk/tenders/og-204', source_id: 'OGRA-2026-06',
    title: 'LPG Tanker Tracking & Digital Metering Software',
    buying_org: 'Oil and Gas Regulatory Authority', category: 'Software Development', location: 'Islamabad, Pakistan',
    estimated_value: 65000000, currency: 'PKR', deadline: daysFromNow(15),
    mandatory_reqs: ['NTN', 'IoT & Telematics Audit'],
    overall_score: 0.74, recommendation: 'YES', score_reasons: { relevance: 0.76, value: 0.72 },
  },
  {
    source: 'WORLD_BANK', source_url: 'https://projects.worldbank.org/en/projects-operations/notice/WB-901', source_id: 'WB-2026-15',
    title: 'Digital Governance & Public Financial System (IFMIS)',
    buying_org: 'World Bank Group & Finance Division', category: 'Software Development', location: 'Islamabad, Pakistan',
    estimated_value: 950000000, currency: 'PKR', deadline: daysFromNow(60),
    mandatory_reqs: ['Global ERP Experience', 'ISO 27001', 'Multi-Year SLA'],
    overall_score: 0.95, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.97, value: 0.93 },
  },
  {
    source: 'UNDP', source_url: 'https://procurement-notices.undp.org/view_notice.cfm?notice_id=8820', source_id: 'UNDP-2026-09',
    title: 'Disaster Relief Logistics & Mobile App Suite',
    buying_org: 'UNDP Disaster Management Unit', category: 'Software Development', location: 'Islamabad, Pakistan',
    estimated_value: 110000000, currency: 'PKR', deadline: daysFromNow(22),
    mandatory_reqs: ['UN Supplier Portal Registration', 'Mobile App Security Certificate'],
    overall_score: 0.89, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.91, value: 0.87 },
  },
  {
    source: 'NTDC', source_url: 'https://ntdc.com.pk/tenders/ntdc-902', source_id: 'NTDC-2026-03',
    title: 'High-Voltage Substation Cyber Security Hardening',
    buying_org: 'National Transmission and Dispatch Company', category: 'IT Services', location: 'Islamabad, Pakistan',
    estimated_value: 290000000, currency: 'PKR', deadline: daysFromNow(40),
    mandatory_reqs: ['PEC Registration', 'SCADA Security Certification'],
    overall_score: 0.88, recommendation: 'STRONG_YES', score_reasons: { relevance: 0.90, value: 0.86 },
  },
];

/**
 * Seeds sample tenders into PostgreSQL if the table is empty.
 * Called once at server startup after schema initialization.
 */
export async function seedDatabaseIfEmpty(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    console.log(`[Seed] Checking and seeding sample tenders into PostgreSQL...`);

    const countRes = await client.query('SELECT COUNT(*) FROM discovered_tenders');
    if (parseInt(countRes.rows[0].count) > 0) {
      console.log('[Seed] Database is not empty. Skipping seed.');
      return;
    }

    await client.query('BEGIN');

    for (const t of SEED_TENDERS) {
      const tenderResult = await client.query(`
        INSERT INTO discovered_tenders 
        (source, source_url, source_id, title, buying_org, category, location, 
         estimated_value, currency, deadline, mandatory_reqs, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')
        ON CONFLICT (source, source_id) 
        DO UPDATE SET location = EXCLUDED.location, buying_org = EXCLUDED.buying_org, currency = EXCLUDED.currency, title = EXCLUDED.title, category = EXCLUDED.category
        RETURNING id
      `, [
        t.source, t.source_url, t.source_id, t.title, t.buying_org,
        t.category, t.location, t.estimated_value, t.currency, t.deadline,
        JSON.stringify(t.mandatory_reqs),
      ]);

      if (tenderResult.rows.length > 0) {
        const tenderId = tenderResult.rows[0].id;
        const isPreApproved = SEED_TENDERS.indexOf(t) < 4;
        const status = isPreApproved ? 'APPROVED' : 'PENDING';

        await client.query(`
          INSERT INTO tender_scores (tender_id, overall_score, recommendation, score_reasons)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (tender_id) DO NOTHING
        `, [tenderId, t.overall_score, t.recommendation, JSON.stringify(t.score_reasons)]);

        await client.query(`
          INSERT INTO tender_approvals (tender_id, status, approved_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (tender_id) DO NOTHING
        `, [tenderId, status, isPreApproved ? new Date().toISOString() : null]);

        // Seed delivery log for pre-approved tenders
        if (isPreApproved) {
          const index = SEED_TENDERS.indexOf(t);
          const suppliers = [
            { name: 'TechVision Solutions Pvt Ltd', endpoint: 'https://api.techvision.com/a2a', delivered: true, code: 200, err: null },
            { name: 'CyberSec Systems Global', endpoint: 'https://api.cybersec.io/webhook', delivered: true, code: 200, err: null },
            { name: 'Pak Telecom & Cloud Services', endpoint: 'https://webhook.paktelecom.pk/dispatch', delivered: true, code: 200, err: null },
            { name: 'Enterprise Software Dynamics', endpoint: 'https://esd.com.pk/api/a2a', delivered: false, code: 504, err: 'Supplier endpoint timeout (504)' },
          ];
          const sup = suppliers[index];

          await client.query(`
            INSERT INTO tender_deliveries 
            (tender_id, supplier_name, supplier_endpoint, delivered, status_code, error_message, attempted_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 hours')
          `, [tenderId, sup.name, sup.endpoint, sup.delivered, sup.code, sup.err]);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`[Seed] ✅ Successfully seeded ${SEED_TENDERS.length} tenders (4 approved with delivery logs) into PostgreSQL.`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[Seed] ❌ Failed to seed database: ${err.message}`);
  } finally {
    client.release();
  }
}
