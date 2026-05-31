"use strict";
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("./index");
const generate_license_1 = require("./generate-license");
// Paths to the real key pair for testing
const KEYS_DIR = path.join(__dirname, '../../keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
let PRIVATE_KEY;
let PUBLIC_KEY;
function base64UrlEncode(data) {
    return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signJwt(payload, privateKey) {
    const header = { alg: 'ES256', typ: 'JWT' };
    const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const signatureInput = `${headerB64}.${payloadB64}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey);
    return `${signatureInput}.${base64UrlEncode(signature)}`;
}
(0, vitest_1.describe)('LicenseValidator', () => {
    let originalEnv;
    (0, vitest_1.beforeAll)(() => {
        PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
        PUBLIC_KEY = fs.readFileSync(path.join(KEYS_DIR, 'public.pem'), 'utf-8');
    });
    (0, vitest_1.beforeEach)(() => {
        originalEnv = { ...process.env };
        delete process.env.SMART_REPORTER_LICENSE_KEY;
        delete process.env.SMART_REPORTER_DEV_LICENSE;
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        process.env = originalEnv;
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('validate', () => {
        (0, vitest_1.it)('returns community tier with valid=true when no key is provided', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate();
            (0, vitest_1.expect)(result).toEqual({ tier: 'community', valid: true });
        });
        (0, vitest_1.it)('returns pro tier for a valid Pro JWT', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'pro', org: 'Test Org', iat: now, exp: now + 86400 }, PRIVATE_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('pro');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.org).toBe('Test Org');
        });
        (0, vitest_1.it)('returns team tier for a valid Team JWT', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'team', org: 'Team Org', iat: now, exp: now + 86400 }, PRIVATE_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('team');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.org).toBe('Team Org');
        });
        (0, vitest_1.it)('returns community with error for an expired JWT', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'pro', org: 'Expired Org', iat: now - 7200, exp: now - 3600 }, PRIVATE_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('License key has expired');
            (0, vitest_1.expect)(result.org).toBe('Expired Org');
        });
        (0, vitest_1.it)('returns community with error for a malformed token', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate('not-a-valid-jwt');
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Invalid license key format');
        });
        (0, vitest_1.it)('returns community with error for an invalid signature', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            // Generate a different key pair to produce a bad signature
            const { privateKey: wrongKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: 'P-256',
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'pro', org: 'Bad Sig Org', iat: now, exp: now + 86400 }, wrongKey);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Invalid license key signature');
        });
        (0, vitest_1.it)('reads SMART_REPORTER_LICENSE_KEY env var when no key arg is passed', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'pro', org: 'Env Org', iat: now, exp: now + 86400 }, PRIVATE_KEY);
            process.env.SMART_REPORTER_LICENSE_KEY = token;
            const result = validator.validate();
            (0, vitest_1.expect)(result.tier).toBe('pro');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.org).toBe('Env Org');
        });
        (0, vitest_1.it)('returns community with error for alg:none bypass attempt', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            // Craft a token with alg: "none" — should be rejected
            const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })));
            const payload = base64UrlEncode(Buffer.from(JSON.stringify({ tier: 'pro', org: 'Hacker Org', iat: now, exp: now + 86400 })));
            const emptySignature = base64UrlEncode(Buffer.from(''));
            const token = `${header}.${payload}.${emptySignature}`;
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Invalid license key algorithm');
        });
        (0, vitest_1.it)('returns community with error when exp claim is missing', () => {
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const now = Math.floor(Date.now() / 1000);
            const token = signJwt({ tier: 'pro', org: 'No Expiry Org', iat: now }, PRIVATE_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('License key missing expiration');
        });
        (0, vitest_1.it)('rejects unsigned tokens even when SMART_REPORTER_DEV_LICENSE is set', () => {
            process.env.SMART_REPORTER_DEV_LICENSE = 'true';
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            // Create an unsigned token (signature is just arbitrary bytes)
            const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
            const now = Math.floor(Date.now() / 1000);
            const payload = base64UrlEncode(Buffer.from(JSON.stringify({ tier: 'pro', org: 'Dev Org', iat: now, exp: now + 86400 })));
            const fakeSignature = base64UrlEncode(Buffer.from('not-a-real-signature'));
            const token = `${header}.${payload}.${fakeSignature}`;
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('community');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('Invalid license key signature');
        });
    });
    (0, vitest_1.describe)('hasFeature', () => {
        (0, vitest_1.it)('returns true for community tier when community is required', () => {
            const license = { tier: 'community', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'community')).toBe(true);
        });
        (0, vitest_1.it)('returns false for community tier when pro is required', () => {
            const license = { tier: 'community', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'pro')).toBe(false);
        });
        (0, vitest_1.it)('returns false for community tier when team is required', () => {
            const license = { tier: 'community', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'team')).toBe(false);
        });
        (0, vitest_1.it)('returns true for pro tier when community is required', () => {
            const license = { tier: 'pro', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'community')).toBe(true);
        });
        (0, vitest_1.it)('returns true for pro tier when pro is required', () => {
            const license = { tier: 'pro', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'pro')).toBe(true);
        });
        (0, vitest_1.it)('returns false for pro tier when team is required', () => {
            const license = { tier: 'pro', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'team')).toBe(false);
        });
        (0, vitest_1.it)('returns true for team tier when community is required', () => {
            const license = { tier: 'team', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'community')).toBe(true);
        });
        (0, vitest_1.it)('returns true for team tier when pro is required', () => {
            const license = { tier: 'team', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'pro')).toBe(true);
        });
        (0, vitest_1.it)('returns true for team tier when team is required', () => {
            const license = { tier: 'team', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'team')).toBe(true);
        });
        (0, vitest_1.it)('returns true for starter tier when starter is required', () => {
            const license = { tier: 'starter', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'starter')).toBe(true);
        });
        (0, vitest_1.it)('returns true for starter tier when pro is required', () => {
            const license = { tier: 'starter', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'pro')).toBe(true);
        });
        (0, vitest_1.it)('returns false for starter tier when team is required', () => {
            const license = { tier: 'starter', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'team')).toBe(false);
        });
        (0, vitest_1.it)('returns true for pro tier when starter is required', () => {
            const license = { tier: 'pro', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'starter')).toBe(true);
        });
        (0, vitest_1.it)('returns false for community tier when starter is required', () => {
            const license = { tier: 'community', valid: true };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'starter')).toBe(false);
        });
        (0, vitest_1.it)('returns false for invalid license even with matching tier', () => {
            const license = { tier: 'pro', valid: false, error: 'expired' };
            (0, vitest_1.expect)(index_1.LicenseValidator.hasFeature(license, 'pro')).toBe(false);
        });
    });
    (0, vitest_1.describe)('generateLicense integration', () => {
        (0, vitest_1.it)('generates a pro license that validates correctly', () => {
            const token = (0, generate_license_1.generateLicense)({ tier: 'pro', org: 'Integration Org' }, PRIVATE_KEY_PATH);
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('pro');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.org).toBe('Integration Org');
        });
        (0, vitest_1.it)('generates a team license that validates correctly', () => {
            const token = (0, generate_license_1.generateLicense)({ tier: 'team', org: 'Team Integration' }, PRIVATE_KEY_PATH);
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('team');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.org).toBe('Team Integration');
        });
        (0, vitest_1.it)('generates a license with custom expiry', () => {
            const token = (0, generate_license_1.generateLicense)({ tier: 'pro', org: 'Expiry Org', expiry: '2027-06-15' }, PRIVATE_KEY_PATH);
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.tier).toBe('pro');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.expiry).toContain('2027-06-15');
        });
        (0, vitest_1.it)('throws for an invalid expiry date string', () => {
            (0, vitest_1.expect)(() => (0, generate_license_1.generateLicense)({ tier: 'pro', org: 'Bad Date Org', expiry: 'not-a-date' }, PRIVATE_KEY_PATH)).toThrow('Invalid expiry date: "not-a-date"');
        });
        (0, vitest_1.it)('defaults to 1 year expiry when no expiry is specified', () => {
            const token = (0, generate_license_1.generateLicense)({ tier: 'pro', org: 'Default Expiry' }, PRIVATE_KEY_PATH);
            const validator = new index_1.LicenseValidator(PUBLIC_KEY);
            const result = validator.validate(token);
            (0, vitest_1.expect)(result.valid).toBe(true);
            // Expiry should be roughly 1 year from now
            const expiryDate = new Date(result.expiry);
            const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            const diffMs = Math.abs(expiryDate.getTime() - oneYearFromNow.getTime());
            (0, vitest_1.expect)(diffMs).toBeLessThan(60000); // within 1 minute
        });
    });
});
