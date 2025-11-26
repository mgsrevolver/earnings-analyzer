import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AnalysisResponse } from '@/types';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');

/**
 * Load cached earnings data for a company
 * Returns null if no cached data exists
 */
export function getCachedEarnings(ticker: string): AnalysisResponse | null {
  const filePath = join(DATA_DIR, `${ticker.toUpperCase()}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading cached data for ${ticker}:`, error);
    return null;
  }
}

/**
 * Check if cached data exists for a company
 */
export function hasCachedEarnings(ticker: string): boolean {
  const filePath = join(DATA_DIR, `${ticker.toUpperCase()}.json`);
  return existsSync(filePath);
}
