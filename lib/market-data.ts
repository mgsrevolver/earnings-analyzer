import yahooFinance from 'yahoo-finance2';

/**
 * Market Data Service
 * Fetches stock prices and analyst estimates from Yahoo Finance
 * Used to calculate reality-based sentiment vs just CFO spin
 */

export interface MarketDataResult {
  // Earnings beat/miss data
  actualEPS?: number;
  estimatedEPS?: number;
  epsSurprisePercent?: number;

  // Price action post-earnings
  priceOnEarningsDate?: number;
  priceAfter7Days?: number;
  priceChangePercent?: number;
}

/**
 * Fetch historical price data for a specific date range
 * @param ticker Stock ticker symbol
 * @param earningsDate Date of earnings report (YYYY-MM-DD)
 * @returns Price on earnings date and 7 days later
 */
export async function fetchPriceAction(
  ticker: string,
  earningsDate: string
): Promise<{ priceOnEarningsDate?: number; priceAfter7Days?: number; priceChangePercent?: number }> {
  try {
    const earningsDateObj = new Date(earningsDate);

    // Calculate date 7 days after earnings
    const sevenDaysLater = new Date(earningsDateObj);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // Add buffer to ensure we get data (sometimes markets closed on exact dates)
    const startDate = new Date(earningsDateObj);
    startDate.setDate(startDate.getDate() - 2); // 2 days before for buffer

    const endDate = new Date(sevenDaysLater);
    endDate.setDate(endDate.getDate() + 3); // 3 days after for buffer

    // Fetch historical prices
    const result = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    }) as any[];

    if (!result || result.length === 0) {
      console.log(`No price data found for ${ticker} around ${earningsDate}`);
      return {};
    }

    // Find the closest price to earnings date
    const earningsPrice = result.find((d: any) => {
      const date = new Date(d.date);
      return date >= earningsDateObj;
    });

    // Find the closest price to 7 days later
    const sevenDayPrice = result.find((d: any) => {
      const date = new Date(d.date);
      return date >= sevenDaysLater;
    });

    if (!earningsPrice || !sevenDayPrice) {
      console.log(`Incomplete price data for ${ticker} around ${earningsDate}`);
      return {};
    }

    const priceOnEarningsDate = earningsPrice.close;
    const priceAfter7Days = sevenDayPrice.close;
    const priceChangePercent = ((priceAfter7Days - priceOnEarningsDate) / priceOnEarningsDate) * 100;

    return {
      priceOnEarningsDate,
      priceAfter7Days,
      priceChangePercent,
    };
  } catch (error) {
    console.error(`Error fetching price action for ${ticker}:`, error);
    return {};
  }
}

/**
 * Fetch earnings data (actual vs estimated EPS) for a specific quarter
 * @param ticker Stock ticker symbol
 * @param earningsDate Date of earnings report (YYYY-MM-DD)
 * @returns EPS surprise data
 */
export async function fetchEarningsData(
  ticker: string,
  earningsDate: string
): Promise<{ actualEPS?: number; estimatedEPS?: number; epsSurprisePercent?: number }> {
  try {
    // Fetch earnings calendar data
    const earningsCalendar = await yahooFinance.quoteSummary(ticker, {
      modules: ['earningsHistory'],
    }) as any;

    if (!earningsCalendar?.earningsHistory?.history) {
      console.log(`No earnings history found for ${ticker}`);
      return {};
    }

    // Find the earnings report closest to the given date
    const earningsDateObj = new Date(earningsDate);
    const matchingEarnings = earningsCalendar.earningsHistory.history.find((e: any) => {
      if (!e.quarter) return false;
      const quarterDate = new Date(e.quarter);
      // Match if within 90 days (roughly a quarter)
      const diffDays = Math.abs((earningsDateObj.getTime() - quarterDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 90;
    });

    if (!matchingEarnings) {
      console.log(`No matching earnings found for ${ticker} near ${earningsDate}`);
      return {};
    }

    const actualEPS = matchingEarnings.epsActual?.raw;
    const estimatedEPS = matchingEarnings.epsEstimate?.raw;

    if (actualEPS === undefined || estimatedEPS === undefined || estimatedEPS === 0) {
      return { actualEPS, estimatedEPS };
    }

    const epsSurprisePercent = ((actualEPS - estimatedEPS) / Math.abs(estimatedEPS)) * 100;

    return {
      actualEPS,
      estimatedEPS,
      epsSurprisePercent,
    };
  } catch (error) {
    console.error(`Error fetching earnings data for ${ticker}:`, error);
    return {};
  }
}

/**
 * Fetch comprehensive market data for an earnings report
 * @param ticker Stock ticker symbol
 * @param earningsDate Date of earnings filing (YYYY-MM-DD)
 * @returns Complete market data for sentiment analysis
 */
export async function fetchMarketData(
  ticker: string,
  earningsDate: string
): Promise<MarketDataResult> {
  try {
    // Fetch both price action and earnings data in parallel
    const [priceData, earningsData] = await Promise.all([
      fetchPriceAction(ticker, earningsDate),
      fetchEarningsData(ticker, earningsDate),
    ]);

    return {
      ...priceData,
      ...earningsData,
    };
  } catch (error) {
    console.error(`Error fetching market data for ${ticker}:`, error);
    return {};
  }
}
