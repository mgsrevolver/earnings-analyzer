/**
 * Company Logo Utilities
 * Uses Parqet/Elbstream Logo API for free, CDN-hosted company logos
 */

/**
 * Get logo URL for a company by ticker symbol
 * Uses Parqet Logo API with PNG format (best for company cards)
 * @param ticker Stock ticker symbol (e.g., "AAPL", "MSFT")
 * @param format Image format - png, svg, jpg, or webp (default: png)
 * @param size Optional size parameter for specific dimensions
 * @returns URL to the company logo
 */
export function getCompanyLogoUrl(
  ticker: string,
  format: 'png' | 'svg' | 'jpg' | 'webp' = 'png',
  size?: number
): string {
  const baseUrl = 'https://assets.parqet.com/logos/symbol';
  const sizeParam = size ? `&size=${size}` : '';
  return `${baseUrl}/${ticker.toUpperCase()}?format=${format}${sizeParam}`;
}

/**
 * Get a fallback div with company ticker if logo fails to load
 * @param ticker Stock ticker symbol
 * @returns Fallback element properties
 */
export function getLogoFallback(ticker: string) {
  return {
    alt: `${ticker} logo`,
    fallbackText: ticker,
  };
}
