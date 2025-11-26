/**
 * Check partnership data across all quarters
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const dataDir = join(process.cwd(), 'data', 'earnings');
const files = readdirSync(dataDir).filter(f => f.endsWith('.json'));

// Simple normalization for testing
const normalize = (name: string): string | null => {
  const lower = name.toLowerCase().trim();
  const map: Record<string, string> = {
    'openai': 'OpenAI', 'openai global llc': 'OpenAI',
    'microsoft': 'Microsoft', 'msft': 'Microsoft',
    'vertex': 'Vertex', 'vertex pharmaceuticals': 'Vertex',
    'merck': 'Merck',
    'crispr': 'CRISPR Therapeutics', 'crispr therapeutics ag': 'CRISPR Therapeutics',
    'samsung': 'Samsung', 'samsung bioepis': 'Samsung', 'samsung bioepis (biosimilars)': 'Samsung',
    'sanofi': 'Sanofi', 'roche': 'Roche',
    'moderna': 'Moderna', 'takeda': 'Takeda', 'takeda pharmaceutical company': 'Takeda',
    'sony': 'Sony', 'sony playstation': 'Sony',
    'tencent': 'Tencent', 'tencent (china joint venture)': 'Tencent',
    'astrazeneca': 'AstraZeneca',
    'bayer': 'Bayer',
    'eisai': 'Eisai', 'eisai (leqembi)': 'Eisai',
  };
  if (map[lower]) return map[lower];

  // Clean up parentheticals and suffixes
  let cleaned = name
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s+(inc|corp|corporation|llc|ltd|ag|nv|limited)$/i, '')
    .replace(/\s+(collaboration|partnership|royalty buyout)$/i, '')
    .trim();
  return cleaned.length > 3 ? cleaned : null;
};

const excluded = new Set([
  'darpa', 'barda', 'fda', 'european commission', 'us government',
  'uk health security agency', 'taiwan food and drug administration',
  'ministry of health', 'national institutes', 'institute for life changing medicines',
  'ministry of health labor and welfare of japan', 'national institutes of allergy and infectious diseases',
  'continued ai model collaborations', 'enhanced cloud service partnerships',
  'cloud service providers', 'global telecommunications service provider partners',
  'expanded content licensing agreements', 'north american charging standard',
  'north american charging standard (nacs) adoption',
  'mckesson', 'mckesson corp', 'mckesson corporation', 'cardinal health',
  'cencora', 'fff enterprises', 'besse medical', 'blackstone life sciences',
  'ai infrastructure buildout with cloud service providers',
  'manufacturing investments in u.s. domestic production',
]);

const allPartnerships = new Map<string, Set<string>>();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
  const ticker = file.replace('.json', '');

  // Get ALL reports, not just Q4 2024
  for (const report of data.reports) {
    if (report.insights && report.insights.partnerships) {
      for (const partner of report.insights.partnerships) {
        const lower = partner.toLowerCase();
        if (excluded.has(lower)) continue;
        if (lower.includes('acquisition') || lower.includes('pending')) continue;
        if (lower.includes('transaction') || lower.includes('investment')) continue;

        const normalized = normalize(partner);
        if (normalized && normalized.length > 3) {
          if (!allPartnerships.has(normalized)) {
            allPartnerships.set(normalized, new Set());
          }
          allPartnerships.get(normalized)!.add(ticker);
        }
      }
    }
  }
}

console.log('Normalized partnerships across ALL quarters (2+ companies):');
console.log('============================================================');
const multiCompany = Array.from(allPartnerships.entries())
  .filter(([_, tickers]) => tickers.size >= 2)
  .sort((a, b) => b[1].size - a[1].size);

if (multiCompany.length === 0) {
  console.log('None found');
} else {
  for (const [partner, tickers] of multiCompany) {
    console.log(`${partner}: ${tickers.size} (${Array.from(tickers).join(', ')})`);
  }
}

console.log('\nAll normalized partnerships (sorted by company count):');
console.log('=======================================================');
for (const [partner, tickers] of Array.from(allPartnerships.entries()).sort((a, b) => b[1].size - a[1].size).slice(0, 25)) {
  console.log(`${partner}: ${tickers.size} (${Array.from(tickers).join(', ')})`);
}
