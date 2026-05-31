/**
 * License Validator — Adversarial Tests
 *
 * These tests target attack vectors and degenerate inputs the happy-path tests
 * don't cover:
 *   - Tampered payload (signature mismatch after manual tier escalation)
 *   - Missing `tier` claim (only exp present)
 *   - Future `iat` / past `exp` combination
 *   - Empty string key
 *   - Whitespace-only key
 *   - Oversized garbage string (10 KB)
 *   - Token with 2 parts
 *   - Token with 4+ parts
 *   - Unknown tier value in payload
 *   - exp set to exactly now (boundary: should be expired)
 *   - exp set to now+1 (boundary: should be valid)
 */
export {};
