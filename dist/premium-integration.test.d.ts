/**
 * Premium Pipeline Integration Tests
 *
 * Tests the SmartReporter constructor's license-gating logic:
 * - Community tier: theme/branding stripped, warnings emitted, no Starter features activated
 * - Starter/Pro tier: theme/branding preserved, notifications wired, custom AI model accepted
 * - Team tier: all Starter/Pro features work (Team is a superset of Pro)
 *
 * Strategy: test the constructor and onEnd() in isolation by mocking fs, html-generator,
 * the license module, and the export functions. This lets us verify wiring contracts
 * without running the full Playwright reporter lifecycle.
 */
export {};
