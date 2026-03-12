/**
 * Static methodology appendix for the board report.
 * Explains ESE, Composite Value, ROI, and Capital Misallocation formulas.
 * Uses break-before-page so it starts on a new page when printed.
 */
export function MethodologyAppendix() {
  return (
    <section className="mb-10 break-before-page">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Appendix · Methodology
      </h2>
      <div className="rounded-lg border border-gray-200 p-5 space-y-4 text-[11px] text-gray-600 leading-relaxed">
        <div>
          <p className="font-semibold text-gray-800 text-xs mb-1">
            Economic Signals Engine (ESE)
          </p>
          <p>
            Each data product receives a composite health score (0-100) based on
            four weighted dimensions: cost trend (25%), usage momentum (25%),
            value realization (30%), and lifecycle position (20%). Scores below
            40 trigger automatic review recommendations. The model is fully
            deterministic — no ML or black-box components.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-800 text-xs mb-1">
            Composite Value
          </p>
          <p>
            Product value is calculated as: <span className="font-mono text-gray-700">0.7 × declared_value + 0.3 × usage_implied_value</span>.
            Declared value comes from business owner attestations. Usage-implied
            value is inferred from consumer count, query frequency, and
            downstream dependency weight. This blended approach ensures products
            without formal value declarations are not treated as valueless.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-800 text-xs mb-1">
            Return on Investment (ROI)
          </p>
          <p>
            Per-product ROI: <span className="font-mono text-gray-700">composite_value / monthly_cost</span>.
            Portfolio ROI is cost-weighted (not a simple average), ensuring
            high-cost products have proportional influence on the aggregate
            figure. ROI trends are computed over rolling 3-month windows.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-800 text-xs mb-1">
            Capital Misallocation
          </p>
          <p>
            Capital misallocation measures spend on products where ROI falls
            below the portfolio median or where usage has declined more than 20%
            from peak over the trailing 90 days. This metric drives the
            &quot;Capital Waste&quot; figure on the portfolio overview and
            informs retirement candidate identification.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-800 text-xs mb-1">
            Projection Scenarios
          </p>
          <p>
            The capital projection engine simulates three scenarios over 36
            months: <em>Passive</em> (no governance action, current trends
            continue), <em>Governance</em> (retirement of flagged candidates,
            cost controls on spikes), and <em>Active</em> (full optimization
            including reallocation, pricing, and AI spend management). All
            projections use deterministic compounding of current trends — no
            stochastic modeling.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] text-gray-400">
            All metrics are computed from the same canonical source layer to
            ensure consistency across surfaces. For the complete specification,
            refer to the Capital Intelligence Engine documentation (E1-E6).
          </p>
        </div>
      </div>
    </section>
  );
}
