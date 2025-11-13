# Earnings Analyzer

A free, open-source web app that democratizes earnings analysis for retail investors. Discover macro trends, track sentiment, and extract insights from earnings reports across tech, biotech, Mag7, and high-volatility companies.

## Features

- **Smart Company Categorization**: Track 40+ companies across Mag7, High-Growth Tech, Biotech, and WSB Favorites
- **AI-Powered Analysis**: Extract macro insights using Claude Haiku (ultra-low cost: ~$0.01 per report)
- **Macro Trend Detection**: Identify commonalities and divergences across earnings reports
- **4-Quarter Historical Tracking**: Monitor sentiment, guidance, and metrics over time
- **Free Data Source**: Powered by SEC EDGAR API (no API key required)

## What Makes This Different

Instead of analyzing individual stocks in isolation, Earnings Analyzer helps you see the **bigger picture**:

- Which companies are increasing AI/capex spending?
- Who's signing deals with whom?
- Are guidance trends getting more cautious across the board?
- Which sectors are showing pricing power vs. margin compression?

This is the kind of insight that's usually locked behind a Bloomberg Terminal.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS + shadcn/ui** - Beautiful, modern UI
- **SEC EDGAR API** - Free earnings report data
- **Claude Haiku** - AI-powered analysis (~$0.25 per million tokens)
- **Vercel** - Easy deployment (free tier)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key (get one free at [console.anthropic.com](https://console.anthropic.com))

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/earnings-analyzer.git
   cd earnings-analyzer
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create a \`.env.local\` file in the root directory:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

4. Add your Anthropic API key to \`.env.local\`:
   \`\`\`
   ANTHROPIC_API_KEY=your_api_key_here
   \`\`\`

5. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Dashboard
Browse companies by category (Mag7, Tech, Biotech, WSB). Click any company to view detailed analysis.

### Company Pages
View individual company filings and AI-extracted insights including:
- Revenue, earnings, and cash flow metrics
- Guidance tone and direction
- Capex trends and AI investment mentions
- Partnerships and deal announcements
- Supply chain status
- Management credibility tracking

### Macro Analysis (Coming Soon)
Cross-company insights showing:
- Aggregate capex trends
- Common partnerships and ecosystem connections
- Guidance sentiment across sectors
- Market divergences (winners vs. losers)

## Project Structure

\`\`\`
earnings-analyzer/
├── app/                    # Next.js App Router pages
│   ├── company/[ticker]/   # Individual company pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Dashboard
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── companies.ts        # Curated company list
│   ├── edgar.ts            # SEC EDGAR API client
│   ├── claude.ts           # AI analysis integration
│   └── utils.ts            # Helper functions
└── types/
    └── index.ts            # TypeScript type definitions
\`\`\`

## Cost Estimate

- **SEC EDGAR API**: Free
- **Hosting (Vercel)**: Free tier works great
- **Claude Haiku API**:
  - ~$0.01 per earnings report analyzed
  - ~$1-5 per month for 100-500 reports
  - Well under $50/month even with heavy usage

## Roadmap

- [ ] Earnings calendar with upcoming report dates
- [ ] Interactive trend visualizations (charts)
- [ ] Historical analysis (last 4 quarters per company)
- [ ] Macro cross-company analysis page
- [ ] Export insights to CSV/PDF
- [ ] Email alerts for key companies
- [ ] Comparative analysis (peer benchmarking)
- [ ] Dark mode toggle

## Contributing

Contributions are welcome! This project is built for the retail investor community.

## License

MIT License - feel free to use this for your own analysis or build upon it.

## Disclaimer

This tool is for informational purposes only. It is not financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.

## Credits

- Data: SEC EDGAR API
- AI Analysis: Anthropic Claude
- Built with: Next.js, TypeScript, Tailwind CSS, shadcn/ui
