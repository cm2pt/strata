/**
 * Contextual help content for each page.
 * Loaded by the HelpDrawer component based on current pathname.
 */

export interface HelpPageContent {
  title: string;
  summary: string;
  bullets: string[];
  glossary?: { term: string; definition: string }[];
}

export const helpContent: Record<string, HelpPageContent> = {
  "/portfolio": {
    title: "Portfolio Overview",
    summary:
      "Your portfolio's financial health at a glance. This page shows total spend, waste, and the highest-impact actions you can take right now.",
    bullets: [
      "The Capital Waste metric shows spend on products with no measurable return.",
      "Top 3 capital actions are the highest-impact decisions awaiting your review.",
      "The Inaction Cost warning projects the financial impact of delayed governance.",
    ],
    glossary: [
      { term: "Capital Waste", definition: "Spend on data products where ROI falls below the portfolio median or usage has declined more than 20% from peak." },
      { term: "Capital Freed", definition: "Money recovered through governance decisions — retirements, reallocations, and pricing policies." },
      { term: "Decision Latency", definition: "Average days between identifying a capital issue and resolving it." },
    ],
  },
  "/lifecycle": {
    title: "Lifecycle Health",
    summary:
      "Monitor where your data products sit across the lifecycle spectrum and identify products ready for retirement.",
    bullets: [
      "Products in Decline with low consumer counts are retirement candidates.",
      "Stalled Drafts are products created but never adopted — they represent sunk cost.",
      "Cost spikes flag products with unusual month-over-month cost increases.",
    ],
    glossary: [
      { term: "Retirement Candidate", definition: "A product whose usage has declined below 20% of peak for 90+ days." },
      { term: "ESE Score", definition: "Economic Signal Score (0-100). Below 40 indicates the product may cost more than it returns." },
    ],
  },
  "/decisions": {
    title: "Economic Decision Log",
    summary:
      "Every capital-impact decision is logged here. Approve, reject, or delay — each action records its financial effect.",
    bullets: [
      "Pending decisions represent capital that could be freed if acted upon.",
      "Approved retirements automatically update the Capital Freed metric.",
      "Decision latency directly affects your portfolio's financial trajectory.",
    ],
  },
  "/capital-impact": {
    title: "Capital Impact",
    summary:
      "Track the cumulative financial effect of every governance decision across the portfolio.",
    bullets: [
      "Capital Freed shows the running total of spend recovered through decisions.",
      "The Value Gap Analysis compares declared value against inferred usage value.",
      "Use this page to demonstrate ROI of the governance program to leadership.",
    ],
    glossary: [
      { term: "Capital Freed", definition: "Monthly spend that was eliminated or redirected through retirement, reallocation, or pricing decisions." },
      { term: "ROI Delta", definition: "The change in portfolio-wide ROI attributable to governance decisions." },
    ],
  },
  "/capital-projection": {
    title: "Capital Projection",
    summary:
      "Simulate your portfolio's trajectory over 36 months under three governance scenarios.",
    bullets: [
      "Passive: what happens if no governance decisions are made.",
      "Governance: retirements and cost controls only.",
      "Active: full optimization including reallocation and pricing.",
      "The gap between Passive and Active is your governance opportunity.",
    ],
  },
  "/portfolio/board-view": {
    title: "Board View",
    summary:
      "An institutional-grade capital summary designed for board presentations and executive reviews.",
    bullets: [
      "Click 'Print / Export PDF' to generate a polished report with page numbers.",
      "The Executive Summary auto-generates a narrative from your portfolio data.",
      "The Methodology Appendix explains all calculations for audit purposes.",
    ],
  },
  "/assets": {
    title: "Data Products",
    summary:
      "Browse, search, and analyze every data product in the portfolio.",
    bullets: [
      "Sort by ROI to find your highest and lowest performing products.",
      "Click any product to see detailed economics, lifecycle, and consumer data.",
      "Use the lifecycle filter to focus on specific stages (Growth, Decline, etc.).",
    ],
    glossary: [
      { term: "Composite Value", definition: "0.7 × declared value + 0.3 × usage-implied value. Ensures products without formal declarations are not treated as valueless." },
      { term: "ROI", definition: "Composite value divided by monthly cost. A product with ROI below 1.0x costs more than it returns." },
    ],
  },
  "/simulate": {
    title: "Pricing Simulation",
    summary:
      "Model different pricing strategies and see their revenue and behavioral impact before activation.",
    bullets: [
      "Select a product and pricing model to run a simulation.",
      "The behavioral risk indicator shows how pricing changes might affect adoption.",
      "Activate a policy to apply the pricing model to the product in the governance system.",
    ],
  },
  "/marketplace": {
    title: "Data Marketplace",
    summary:
      "Discover and subscribe to data products across the organization.",
    bullets: [
      "Search by name, domain, or keyword to find products.",
      "Trust scores reflect data reliability and governance compliance.",
      "Subscribe to products to track usage and receive notifications.",
    ],
  },
  "/capital-review": {
    title: "Capital Review",
    summary:
      "Deep-dive into portfolio efficiency, rebalancing opportunities, and governance behavior metrics.",
    bullets: [
      "Capital Efficiency Index tracks portfolio-wide ROI trends over time.",
      "Portfolio Rebalancing shows recommendations for shifting spend to higher-ROI products.",
      "Governance Behavior metrics measure organizational decision-making patterns.",
    ],
  },
  "/allocation": {
    title: "Capital Allocation",
    summary:
      "Understand how data capital is distributed across domains, business units, and platforms.",
    bullets: [
      "The portfolio frontier shows the efficient boundary of cost vs. value.",
      "Products below the frontier are candidates for optimization.",
      "Domain allocation helps identify over-invested and under-invested areas.",
    ],
  },
};

/**
 * Get help content for a given pathname.
 * Falls back to a generic entry if no match is found.
 */
export function getHelpContent(pathname: string): HelpPageContent {
  // Try exact match first, then strip trailing slash
  const content = helpContent[pathname] ?? helpContent[pathname.replace(/\/$/, "")];
  if (content) return content;

  // Fallback
  return {
    title: "Help",
    summary: "Use the sidebar to navigate between sections. Each page shows financial insights about your data portfolio.",
    bullets: [
      "Press ⌘K to open the command palette for quick navigation.",
      "Press G then a letter key to navigate directly (e.g., G P for Portfolio).",
    ],
  };
}
