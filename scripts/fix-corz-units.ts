/**
 * Fix CORZ data units - normalize to millions
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'data', 'earnings', 'CORZ.json');
const data = JSON.parse(readFileSync(filePath, 'utf-8'));

// Fix Q2 2024 which has values in raw dollars instead of millions
for (const report of data.reports) {
  if (report.quarter === 'Q2 2024') {
    console.log('Fixing Q2 2024...');
    console.log('Before:', {
      revenue: report.insights.revenue,
      netIncome: report.insights.netIncome,
    });

    // Convert from dollars to millions
    if (report.insights.revenue > 1000000) {
      report.insights.revenue = report.insights.revenue / 1000000;
    }
    if (Math.abs(report.insights.netIncome) > 1000000) {
      report.insights.netIncome = report.insights.netIncome / 1000000;
    }

    console.log('After:', {
      revenue: report.insights.revenue,
      netIncome: report.insights.netIncome,
    });
  }
}

writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('✅ Fixed CORZ data units');
