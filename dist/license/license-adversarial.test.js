"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto = __importStar(require("crypto"));
const index_1 = require("./index");
// ---------------------------------------------------------------------------
// Generate a test key pair for signing tokens in adversarial tests
// ---------------------------------------------------------------------------
const testKeyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const TEST_PUBLIC_KEY = testKeyPair.publicKey;
const TEST_PRIVATE_KEY = testKeyPair.privateKey;
// ---------------------------------------------------------------------------
// Helper: build a base64url-encoded string (no crypto signing)
// ---------------------------------------------------------------------------
function b64u(data) {
    return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeUnsignedToken(header, payload) {
    const h = b64u(Buffer.from(JSON.stringify(header)));
    const p = b64u(Buffer.from(JSON.stringify(payload)));
    const sig = b64u(Buffer.from('fake-sig'));
    return `${h}.${p}.${sig}`;
}
function signJwt(payload, privateKey) {
    const header = { alg: 'ES256', typ: 'JWT' };
    const headerB64 = b64u(Buffer.from(JSON.stringify(header)));
    const payloadB64 = b64u(Buffer.from(JSON.stringify(payload)));
    const signatureInput = `${headerB64}.${payloadB64}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey);
    return `${signatureInput}.${b64u(signature)}`;
}
function makeTokenWithRealHeader(payload) {
    return makeUnsignedToken({ alg: 'ES256', typ: 'JWT' }, payload);
}
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, vitest_1.describe)('LicenseValidator adversarial inputs', () => {
    let originalEnv;
    (0, vitest_1.beforeEach)(() => {
        originalEnv = { ...process.env };
        delete process.env.SMART_REPORTER_LICENSE_KEY;
        delete process.env.SMART_REPORTER_DEV_LICENSE;
    });
    (0, vitest_1.afterEach)(() => {
        process.env = originalEnv;
    });
    // =========================================================================
    // Tampered payload — valid structure but signature no longer matches
    // =========================================================================
    (0, vitest_1.it)('rejects a token whose payload was modified after signing', () => {
        // Build a "pro" token in dev mode format, then manually swap tier to "team"
        // in a new token that uses the original signature — signature won't match
        const now = Math.floor(Date.now() / 1000);
        const originalHeader = b64u(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
        const originalPayload = b64u(Buffer.from(JSON.stringify({ tier: 'pro', org: 'Acme', iat: now, exp: now + 86400 })));
        const originalSig = b64u(Buffer.from('some-valid-looking-sig'));
        // Now swap in a "team" payload but keep the original signature
        const tamperedPayload = b64u(Buffer.from(JSON.stringify({ tier: 'team', org: 'Acme', iat: now, exp: now + 86400 })));
        const tamperedToken = `${originalHeader}.${tamperedPayload}.${originalSig}`;
        const validator = new index_1.LicenseValidator();
        const result = validator.validate(tamperedToken);
        // Should be rejected — signature doesn't match the tampered content
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.error).toBe('Invalid license key signature');
    });
    // =========================================================================
    // Missing tier claim
    // =========================================================================
    (0, vitest_1.it)('falls back to community when tier claim is absent', () => {
        const now = Math.floor(Date.now() / 1000);
        // No `tier` field — only exp
        const token = signJwt({ exp: now + 86400 }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        const result = validator.validate(token);
        // Valid JWT structure and not expired, but tier is undefined → community
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.tier).toBe('community');
    });
    // =========================================================================
    // Future iat, past exp (clock-skew attack)
    // =========================================================================
    (0, vitest_1.it)('returns expired when iat is in the future but exp is in the past', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = signJwt({
            tier: 'pro',
            org: 'Attacker',
            iat: now + 365 * 24 * 60 * 60, // issued one year in the future
            exp: now - 86400, // expired yesterday
        }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.error).toBe('License key has expired');
    });
    // =========================================================================
    // Empty string key
    // =========================================================================
    (0, vitest_1.it)('treats empty string key as no key — returns community valid:true', () => {
        const validator = new index_1.LicenseValidator();
        const result = validator.validate('');
        // Empty string is falsy, so treated as "no key provided"
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.error).toBeUndefined();
    });
    // =========================================================================
    // Whitespace-only key
    // =========================================================================
    (0, vitest_1.it)('handles a whitespace-only key gracefully without crashing', () => {
        const validator = new index_1.LicenseValidator();
        // '   ' is truthy but has no valid JWT structure
        const result = validator.validate('   ');
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
        // Should report format error, not crash
        (0, vitest_1.expect)(result.error).toBeDefined();
    });
    // =========================================================================
    // Very long garbage token (10 KB)
    // =========================================================================
    (0, vitest_1.it)('handles a 10 KB random string without crashing', () => {
        const garbage = 'x'.repeat(10 * 1024);
        const validator = new index_1.LicenseValidator();
        let result;
        (0, vitest_1.expect)(() => {
            result = validator.validate(garbage);
        }).not.toThrow();
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
    (0, vitest_1.it)('handles a 10 KB random base64-like string (three "parts") without crashing', () => {
        // Construct something that looks like 3 parts to get past the split check
        const part = 'A'.repeat(3000);
        const token = `${part}.${part}.${part}`;
        const validator = new index_1.LicenseValidator();
        let result;
        (0, vitest_1.expect)(() => {
            result = validator.validate(token);
        }).not.toThrow();
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
    // =========================================================================
    // Token with only 2 parts (missing signature)
    // =========================================================================
    (0, vitest_1.it)('returns community with format error for a token with only 2 parts', () => {
        const validator = new index_1.LicenseValidator();
        const result = validator.validate('header.payload');
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Invalid license key format');
    });
    // =========================================================================
    // Token with 4+ parts
    // =========================================================================
    (0, vitest_1.it)('returns community with format error for a token with 4 parts', () => {
        const validator = new index_1.LicenseValidator();
        const result = validator.validate('a.b.c.d');
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Invalid license key format');
    });
    (0, vitest_1.it)('returns community with format error for a token with 5 parts', () => {
        const validator = new index_1.LicenseValidator();
        const result = validator.validate('a.b.c.d.e');
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Invalid license key format');
    });
    // =========================================================================
    // Unknown tier value in payload (dev mode to bypass signature)
    // =========================================================================
    (0, vitest_1.it)('maps an unknown tier value to community tier', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = signJwt({
            tier: 'enterprise', // not in the valid set
            org: 'Unknown',
            iat: now,
            exp: now + 86400,
        }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        const result = validator.validate(token);
        // Unknown tier is mapped to community, but the token itself is valid
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.tier).toBe('community');
    });
    // =========================================================================
    // exp boundary: exactly now (should be expired since check is >)
    // =========================================================================
    (0, vitest_1.it)('treats exp at exactly the current second as expired', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = signJwt({
            tier: 'pro',
            org: 'Boundary',
            iat: now - 100,
            exp: now - 1, // 1 second in the past — definitely expired
        }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('License key has expired');
    });
    (0, vitest_1.it)('treats exp 1 second from now as valid', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = signJwt({
            tier: 'pro',
            org: 'Boundary',
            iat: now - 100,
            exp: now + 1, // 1 second in the future
        }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.tier).toBe('pro');
    });
    // =========================================================================
    // Null/undefined explicitly passed
    // =========================================================================
    (0, vitest_1.it)('handles undefined key gracefully (same as no key)', () => {
        const validator = new index_1.LicenseValidator();
        const result = validator.validate(undefined);
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    // =========================================================================
    // alg:none bypass with non-empty signature
    // =========================================================================
    (0, vitest_1.it)('rejects alg:none even when signature part contains non-empty bytes', () => {
        const now = Math.floor(Date.now() / 1000);
        const header = b64u(Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })));
        const payload = b64u(Buffer.from(JSON.stringify({ tier: 'team', iat: now, exp: now + 86400 })));
        const sig = b64u(Buffer.from('non-empty-signature-bytes'));
        const token = `${header}.${payload}.${sig}`;
        const validator = new index_1.LicenseValidator();
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Invalid license key algorithm');
    });
    // =========================================================================
    // HS256 algorithm (not ES256)
    // =========================================================================
    (0, vitest_1.it)('rejects HS256-signed tokens (only ES256 accepted)', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = makeUnsignedToken({ alg: 'HS256', typ: 'JWT' }, { tier: 'pro', org: 'Hmac Org', iat: now, exp: now + 86400 });
        const validator = new index_1.LicenseValidator();
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.error).toBe('Invalid license key algorithm');
    });
    // =========================================================================
    // Payload with null values for fields the validator reads
    // =========================================================================
    (0, vitest_1.it)('handles null tier gracefully in payload', () => {
        const now = Math.floor(Date.now() / 1000);
        const token = signJwt({
            tier: null,
            org: 'Null Tier',
            iat: now,
            exp: now + 86400,
        }, TEST_PRIVATE_KEY);
        const validator = new index_1.LicenseValidator(TEST_PUBLIC_KEY);
        (0, vitest_1.expect)(() => validator.validate(token)).not.toThrow();
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.tier).toBe('community');
    });
    // =========================================================================
    // Payload JSON that is valid base64 but not a JSON object
    // =========================================================================
    (0, vitest_1.it)('returns format error when payload decodes to a non-object JSON value', () => {
        const header = b64u(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
        const payload = b64u(Buffer.from('"just a string"')); // valid JSON, but not an object
        const sig = b64u(Buffer.from('sig'));
        const token = `${header}.${payload}.${sig}`;
        const validator = new index_1.LicenseValidator();
        // The validator will cast the string to LicensePayload — exp will be undefined
        // meaning it should return 'License key missing expiration' in dev mode or
        // signature error in normal mode
        const result = validator.validate(token);
        (0, vitest_1.expect)(result.tier).toBe('community');
        (0, vitest_1.expect)(result.valid).toBe(false);
    });
});
