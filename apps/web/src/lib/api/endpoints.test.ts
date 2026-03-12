import { describe, it, expect } from "vitest";
import { API_ENDPOINTS } from "./endpoints";

describe("API_ENDPOINTS", () => {
  it("exports static endpoint paths as strings", () => {
    expect(API_ENDPOINTS.AUTH_LOGIN).toBe("/auth/login");
    expect(API_ENDPOINTS.AUTH_ME).toBe("/auth/me");
    expect(API_ENDPOINTS.PORTFOLIO_SUMMARY).toBe("/portfolio/summary");
    expect(API_ENDPOINTS.ASSETS).toBe("/assets/");
    expect(API_ENDPOINTS.DECISIONS).toBe("/decisions/");
    expect(API_ENDPOINTS.CONNECTORS).toBe("/connectors/");
    expect(API_ENDPOINTS.MARKETPLACE_PRODUCTS).toBe("/marketplace/products");
    expect(API_ENDPOINTS.CAPITAL_IMPACT_SUMMARY).toBe("/capital-impact/summary");
    expect(API_ENDPOINTS.BOARD_CAPITAL_SUMMARY).toBe("/board/capital-summary");
    expect(API_ENDPOINTS.CAPITAL_EFFICIENCY).toBe("/capital-efficiency/");
    expect(API_ENDPOINTS.CAPITAL_PROJECTION).toBe("/capital-projection/");
  });

  it("generates parameterized asset paths", () => {
    expect(API_ENDPOINTS.ASSET("dp-001")).toBe("/assets/dp-001");
    expect(API_ENDPOINTS.ASSET_METRICS("dp-002")).toBe("/assets/dp-002/metrics");
  });

  it("generates parameterized decision paths", () => {
    expect(API_ENDPOINTS.DECISION("dec-001")).toBe("/decisions/dec-001");
    expect(API_ENDPOINTS.DECISION_COMMENTS("dec-001")).toBe("/decisions/dec-001/comments");
    expect(API_ENDPOINTS.DECISION_ACTIONS("dec-001")).toBe("/decisions/dec-001/actions");
    expect(API_ENDPOINTS.DECISION_ECONOMIC_EFFECTS("dec-001")).toBe("/decisions/dec-001/economic-effects");
    expect(API_ENDPOINTS.DECISION_IMPACT_REPORT("dec-001")).toBe("/decisions/dec-001/impact-report");
    expect(API_ENDPOINTS.DECISION_APPROVE_RETIREMENT("dec-001")).toBe("/decisions/dec-001/approve-retirement");
    expect(API_ENDPOINTS.DECISION_DELAY_RETIREMENT("dec-001")).toBe("/decisions/dec-001/delay-retirement");
  });

  it("generates parameterized connector paths", () => {
    expect(API_ENDPOINTS.CONNECTOR_TEST("conn-1")).toBe("/connectors/conn-1/test");
    expect(API_ENDPOINTS.CONNECTOR_RUN("conn-1")).toBe("/connectors/conn-1/run");
  });

  it("generates parameterized candidate paths", () => {
    expect(API_ENDPOINTS.CANDIDATE("cand-1")).toBe("/candidates/cand-1");
    expect(API_ENDPOINTS.CANDIDATE_PROMOTE("cand-1")).toBe("/candidates/cand-1/promote");
    expect(API_ENDPOINTS.CANDIDATE_IGNORE("cand-1")).toBe("/candidates/cand-1/ignore");
    expect(API_ENDPOINTS.CANDIDATE_FLAG_RETIREMENT("cand-1")).toBe("/candidates/cand-1/flag-retirement");
  });

  it("generates parameterized AI scorecard paths", () => {
    expect(API_ENDPOINTS.AI_SCORECARD_FLAG("dp-001")).toBe("/ai-scorecard/dp-001/flag");
    expect(API_ENDPOINTS.AI_SCORECARD_KILL("dp-001")).toBe("/ai-scorecard/dp-001/kill");
  });

  it("generates parameterized notification paths", () => {
    expect(API_ENDPOINTS.NOTIFICATION_MARK_READ("n-1")).toBe("/notifications/n-1/read");
  });

  it("generates parameterized pricing paths", () => {
    expect(API_ENDPOINTS.PRICING_POLICY("pol-1")).toBe("/pricing/policies/pol-1");
  });
});
