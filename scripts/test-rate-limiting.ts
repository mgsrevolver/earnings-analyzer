/**
 * Test script to validate rate limiting and retry logic
 * Tests on a single company to verify Yahoo Finance handling
 */

import { config } from 'dotenv';
import { join } from 'path';
import { getCompanyByTicker } from '../lib/companies';
import { fetchMarketData } from '../lib/market-data';

config({ path: join(process.cwd(), '.env.local') });

async function testRateLimiting() {
  console.log('Testing rate limiting and retry logic...\n');

  const company = getCompanyByTicker('AAPL');
  if (!company) {
    console.error('Company not found');
    return;
  }

  console.log(`Testing with ${company.name} (${company.ticker})\n`);

  // Test multiple rapid calls to simulate rate limiting
  const testDates = [
    '2024-11-01',
    '2024-08-01',
    '2024-05-02',
  ];

  for (const date of testDates) {
    console.log(`Fetching market data for ${date}...`);
    const startTime = Date.now();

    try {
      const result = await fetchMarketData(company.ticker, date);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`✓ Success in ${elapsed}s:`, {
        priceChange: result.priceChangePercent?.toFixed(2),
        epsSurprise: result.epsSurprisePercent?.toFixed(2),
      });
    } catch (error) {
      console.error(`✗ Failed:`, error instanceof Error ? error.message : error);
    }

    console.log('');
  }

  console.log('Test complete!');
}

testRateLimiting().catch(console.error);
