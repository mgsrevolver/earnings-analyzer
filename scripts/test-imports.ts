/**
 * Test script to isolate which import is causing issues
 */

console.log('1. Starting...');

console.log('2. Importing dotenv...');
import { config } from 'dotenv';
console.log('✓ dotenv imported');

console.log('3. Importing fs...');
import { existsSync } from 'fs';
console.log('✓ fs imported');

console.log('4. Importing path...');
import { join } from 'path';
console.log('✓ path imported');

console.log('5. Loading .env.local...');
config({ path: join(process.cwd(), '.env.local') });
console.log('✓ .env loaded');

console.log('6. Checking API key...');
console.log(`API Key present: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'NO!'}`);

console.log('7. Importing companies...');
import { getAllCompanies } from '../lib/companies';
console.log('✓ companies imported');

console.log('8. Getting companies list...');
const companies = getAllCompanies();
console.log(`✓ Got ${companies.length} companies`);

console.log('9. Importing edgar...');
import { getRecentEarningsFilings } from '../lib/edgar';
console.log('✓ edgar imported');

console.log('10. Importing claude...');
import { analyzeEarningsReport } from '../lib/claude';
console.log('✓ claude imported');

console.log('11. Importing market-data...');
import { fetchMarketData } from '../lib/market-data';
console.log('✓ market-data imported');

console.log('\n✅ All imports successful!');
console.log('The hang must be happening during execution, not imports.');
