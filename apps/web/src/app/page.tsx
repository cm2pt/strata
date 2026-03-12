"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { StrataLogo } from "@/components/shared/strata-logo";
import { FadeInSection } from "@/components/shared/fade-in-section";
import { HeroChartMockup } from "@/components/marketing/hero-chart-mockup";
import { CapitalPressureChart } from "@/components/marketing/capital-pressure-chart";
import { CapitalGrid } from "@/components/marketing/capital-grid";
import {
  Eye,
  Brain,
  Clock,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Building2,
} from "lucide-react";
import { brand, marketingTypography } from "@/lib/tokens";

/**
 * Strata — Category-Defining Landing Page
 *
 * Sits outside the (dashboard) layout group so no sidebar renders.
 * Authenticated users see "Go to Dashboard"; others see "Sign In".
 *
 * 7 sections: Hero, Problem, Platform, Capital Pressure, Case Vignette, Executive Proof, Footer.
 * Boardroom-grade: institutional, financially authoritative, no startup aesthetics.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const ctaDashboard = user?.roleMeta?.defaultFocusRoute ?? "/portfolio";

  return (
    <div className="min-h-screen font-sans antialiased">
      {/* ── Section 1: Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden hero-gradient grain-overlay">
        <CapitalGrid variant="dark" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 lg:py-36">
          {/* Nav bar */}
          <nav className="flex items-center justify-between mb-20">
            <StrataLogo variant="full" theme="dark" size="lg" />
            {!loading && (
              <Link
                href={user ? ctaDashboard : "/login"}
                className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 hover:text-white"
              >
                {user ? "Go to Dashboard" : "Sign In"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </nav>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Copy */}
            <div>
              <p
                className="text-xs font-medium uppercase tracking-[0.2em] mb-6"
                style={{ color: brand.accentGreen }}
              >
                Data Capital Management
              </p>
              <h1 className={`${marketingTypography.heroHeadline} text-white max-w-xl`}>
                Your data portfolio is an uncontrolled liability.
              </h1>
              <p className={`mt-6 ${marketingTypography.heroSubheadline} text-gray-400 max-w-lg`}>
                Millions in data infrastructure spend. No depreciation schedule.
                No capital allocation framework. No auditability.
                Strata makes data measurable, allocatable, and accountable — like every
                other asset on the balance sheet.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="mailto:contact@strata.capital?subject=Executive%20Briefing%20Request"
                  className="btn-interactive accent-glow cta-arrow inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
                  style={{ backgroundColor: brand.accentGreen }}
                >
                  Request Executive Briefing
                  <ArrowRight className="h-4 w-4 arrow-icon" />
                </a>
                {!loading && !user && (
                  <Link
                    href="/login"
                    className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    Explore Demo
                  </Link>
                )}
              </div>
            </div>

            {/* Chart Mockup */}
            <div className="hidden lg:block">
              <HeroChartMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: The Problem ───────────────────────────────── */}
      <section style={{ backgroundColor: brand.offWhite }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <FadeInSection>
            <p
              className={`${marketingTypography.sectionLabel} mb-3`}
              style={{ color: brand.accentGreen }}
            >
              The Liability
            </p>
            <h2 className={`${marketingTypography.sectionHeadline} max-w-3xl`} style={{ color: brand.graphite }}>
              Data infrastructure without capital controls is a governance failure.
            </h2>
            <p className="text-base mt-4 max-w-2xl" style={{ color: brand.slate }}>
              Every other enterprise asset class has depreciation, allocation, and ROI measurement.
              Data portfolios have none — and the cost compounds silently.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6 mt-14 stagger-children">
            {PROBLEM_CARDS.map((card) => (
              <FadeInSection key={card.title}>
                <div className="card-elevate rounded-xl border bg-white p-6" style={{ borderColor: brand.borderLight }}>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg mb-4"
                    style={{ backgroundColor: `${brand.deepNavy}08` }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: brand.graphite }} />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: brand.graphite }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: brand.slate }}>
                    {card.description}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: The Platform ──────────────────────────────── */}
      <section className="relative bg-white">
        <div className="ledger-divider" />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <FadeInSection>
            <p
              className={`${marketingTypography.sectionLabel} mb-3`}
              style={{ color: brand.accentGreen }}
            >
              The Platform
            </p>
            <h2
              className={`${marketingTypography.sectionHeadline} mb-4`}
              style={{ color: brand.graphite }}
            >
              Three pillars of data capital governance
            </h2>
            <p className="text-base max-w-2xl mb-14" style={{ color: brand.slate }}>
              Strata provides the financial control plane that data infrastructure has always lacked.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {PLATFORM_PILLARS.map((pillar, i) => (
              <FadeInSection key={pillar.title}>
                <div className="card-elevate rounded-xl border p-6" style={{ borderColor: brand.borderLight }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${brand.accentGreen}0D` }}
                    >
                      <pillar.icon className="h-5 w-5" style={{ color: brand.accentGreen }} />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-wider" style={{ color: brand.slate }}>
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: brand.graphite }}>
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: brand.slate }}>
                    {pillar.description}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Capital Pressure ──────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: brand.deepNavy }}>
        <CapitalGrid variant="dark" />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <FadeInSection>
            <p
              className={`${marketingTypography.sectionLabel} mb-3`}
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Capital Pressure
            </p>
            <h2 className={`${marketingTypography.sectionHeadline} text-white max-w-2xl mb-4`}>
              The cost of decision latency compounds exponentially.
            </h2>
            <p className="text-base text-gray-400 max-w-xl mb-14">
              Without a capital governance framework, invisible liabilities accumulate
              across data infrastructure, AI spend, and deferred retirement decisions.
              The liability gap widens every quarter.
            </p>
          </FadeInSection>

          <CapitalPressureChart />

          <div className="grid sm:grid-cols-3 gap-8 mt-16 stagger-children">
            {PRESSURE_METRICS.map((m) => (
              <FadeInSection key={m.label}>
                <div className="text-center">
                  <p className={`${marketingTypography.metricDisplay} text-white`}>
                    {m.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 max-w-[200px] mx-auto">{m.label}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Case Vignette (Enterprise Proof) ─────────── */}
      <section style={{ backgroundColor: brand.offWhite }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <FadeInSection>
            <p
              className={`${marketingTypography.sectionLabel} mb-3`}
              style={{ color: brand.accentGreen }}
            >
              Example Scenario
            </p>
            <h2 className={`${marketingTypography.sectionHeadline} mb-4`} style={{ color: brand.graphite }}>
              What governance looks like at scale
            </h2>
          </FadeInSection>

          <FadeInSection>
            <div
              className="mt-10 rounded-xl border bg-white p-8 md:p-10"
              style={{ borderColor: brand.borderLight }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${brand.deepNavy}08` }}
                >
                  <Building2 className="h-5 w-5" style={{ color: brand.graphite }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: brand.graphite }}>
                    Mid-Market Financial Services Firm
                  </p>
                  <p className="text-xs" style={{ color: brand.slate }}>
                    250+ data products &middot; $4.2M annual data infrastructure spend
                  </p>
                </div>
              </div>

              <div className="ledger-divider mb-8" />

              <div className="grid md:grid-cols-4 gap-8">
                {CASE_METRICS.map((m) => (
                  <div key={m.label} className="metric-stripe pl-4">
                    <p
                      className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums tracking-tight"
                      style={{ color: brand.graphite }}
                    >
                      {m.value}
                    </p>
                    <p className="text-sm font-medium mt-1" style={{ color: brand.graphite }}>
                      {m.label}
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: brand.slate }}>
                      {m.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${brand.borderSubtle}` }}>
                <p className="text-[11px] uppercase tracking-wider" style={{ color: brand.slate }}>
                  Illustrative scenario based on typical deployment ranges.
                  Individual results vary by portfolio composition and governance maturity.
                </p>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Section 6: Executive Proof ────────────────────────────── */}
      <section className="relative bg-white">
        <div className="ledger-divider" />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <FadeInSection>
            <p
              className={`${marketingTypography.sectionLabel} mb-3`}
              style={{ color: brand.accentGreen }}
            >
              Governance Outcomes
            </p>
            <h2
              className={`${marketingTypography.sectionHeadline} mb-12`}
              style={{ color: brand.graphite }}
            >
              Outcomes that survive board scrutiny
            </h2>
          </FadeInSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {PROOF_METRICS.map((m) => (
              <FadeInSection key={m.label}>
                <div
                  className="card-elevate rounded-xl border bg-white p-6 metric-stripe"
                  style={{ borderColor: brand.borderLight }}
                >
                  <p
                    className="text-3xl font-semibold font-mono tabular-nums tracking-tight"
                    style={{ color: brand.graphite }}
                  >
                    {m.value}
                  </p>
                  <p className="text-sm font-medium mt-2" style={{ color: brand.graphite }}>
                    {m.label}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: brand.slate }}>
                    {m.detail}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Footer ────────────────────────────────────── */}
      <footer className="relative" style={{ backgroundColor: brand.deepNavy }}>
        <div className="ledger-divider-dark" />
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <StrataLogo variant="full" theme="dark" size="md" />
              <p className="text-sm text-gray-500 mt-3 max-w-sm">
                The financial operating system for enterprise data portfolios.
                Govern data as capital.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3">
              <a
                href="mailto:contact@strata.capital?subject=Executive%20Briefing%20Request"
                className="text-sm font-medium hover:text-white transition-colors"
                style={{ color: brand.accentGreen }}
              >
                Request Executive Briefing
              </a>
              {!loading && (
                <Link
                  href={user ? ctaDashboard : "/login"}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {user ? "Go to Dashboard" : "Sign In"}
                </Link>
              )}
            </div>
          </div>
          <div className="ledger-divider-dark mt-10 mb-6" />
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Strata. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Static Data ──────────────────────────────────────────────── */

const PROBLEM_CARDS = [
  {
    icon: Eye,
    title: "Invisible Data Liability",
    description:
      "Millions in data infrastructure with no depreciation schedule, no capital allocation framework, and no visibility into what compounds cost versus what delivers value.",
  },
  {
    icon: Brain,
    title: "AI Spend Without Capital Controls",
    description:
      "AI and ML projects launched without governance. Model training and inference costs grow 8% monthly with no validated ROI attribution or budget accountability.",
  },
  {
    icon: Clock,
    title: "Deferred Retirement Decisions",
    description:
      "Declining assets kept alive because decision latency is unmeasured. The average retirement delay is 18 months — each month a compounding capital drain.",
  },
] as const;

const PLATFORM_PILLARS = [
  {
    icon: BarChart3,
    title: "Discover & Classify",
    description:
      "Continuous cost, value, and ROI measurement across every data product in your portfolio. Depreciation schedules and capital efficiency scores calculated automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Govern & Audit",
    description:
      "Every capital event — retirement, reallocation, pricing change — is logged, auditable, and traceable to an accountable owner. Full decision provenance for board review.",
  },
  {
    icon: TrendingUp,
    title: "Prove Capital Impact",
    description:
      "Measure the economic behavior change that data investments create. Capital freed, budget reallocated, projected savings — validated, not estimated.",
  },
] as const;

const PRESSURE_METRICS = [
  { value: "$2.4M", label: "Average annual waste on ungoverned data capital" },
  { value: "37%", label: "Of AI projects lack capital governance controls" },
  { value: "18mo", label: "Average delay on retirement decisions" },
] as const;

const CASE_METRICS = [
  {
    value: "$180K",
    label: "Capital Freed",
    detail: "Identified and retired underperforming assets in the first 90 days of deployment",
  },
  {
    value: "34%",
    label: "Cost Reduction",
    detail: "Portfolio-wide cost optimization through depreciation-driven reallocation",
  },
  {
    value: "45",
    label: "Auditable Decisions",
    detail: "Capital events tracked with full provenance, owner attribution, and board-ready reporting",
  },
  {
    value: "< 72hr",
    label: "Decision Latency",
    detail: "From retirement recommendation to approved capital event, down from 18-month average",
  },
] as const;

const PROOF_METRICS = [
  {
    value: "$180K",
    label: "Capital Freed",
    detail: "Retired underperforming data products with auditable decision provenance",
  },
  {
    value: "45",
    label: "Governance Events",
    detail: "Auditable capital decisions tracked across the portfolio lifecycle",
  },
  {
    value: "6",
    label: "Efficiency Metrics",
    detail: "Continuous measurement of capital efficiency, depreciation, and ROI",
  },
  {
    value: "280",
    label: "Products Governed",
    detail: "Active data products with cost, value, and ROI attribution",
  },
] as const;
