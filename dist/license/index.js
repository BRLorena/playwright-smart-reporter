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
exports.LicenseValidator = void 0;
const crypto = __importStar(require("crypto"));
// ES256 (ECDSA P-256) public key for verifying license JWTs.
// The corresponding private key is kept server-side for key generation.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvdByi/mxxfRYaPTaRrZ6QDRJ6E7+
ot8iRT6TruCEWGR1CdvuspdrKUsonBgGNu/WaxtFgjVk+9d+BlaAOcdQTg==
-----END PUBLIC KEY-----`;
function base64UrlDecode(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
}
function decodeJwt(token) {
    const parts = token.split('.');
    if (parts.length !== 3)
        return null;
    try {
        const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf-8'));
        const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf-8'));
        const signatureInput = `${parts[0]}.${parts[1]}`;
        const signature = base64UrlDecode(parts[2]);
        return { header, payload, signatureInput, signature };
    }
    catch {
        return null;
    }
}
function verifySignature(signatureInput, signature, publicKey) {
    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(signatureInput);
        return verify.verify(publicKey, signature);
    }
    catch {
        return false;
    }
}
class LicenseValidator {
    constructor(publicKey) {
        this.publicKey = publicKey ?? PUBLIC_KEY_PEM;
    }
    validate(key) {
        const licenseKey = key || process.env.SMART_REPORTER_LICENSE_KEY;
        if (!licenseKey) {
            return { tier: 'community', valid: true };
        }
        const decoded = decodeJwt(licenseKey);
        if (!decoded) {
            return { tier: 'community', valid: false, error: 'Invalid license key format' };
        }
        // Validate algorithm — reject anything other than ES256 to prevent alg:none bypass
        if (decoded.header.alg !== 'ES256') {
            return { tier: 'community', valid: false, error: 'Invalid license key algorithm' };
        }
        // Verify signature
        const validSig = verifySignature(decoded.signatureInput, decoded.signature, this.publicKey);
        if (!validSig) {
            return { tier: 'community', valid: false, error: 'Invalid license key signature' };
        }
        const { payload } = decoded;
        // Require expiration claim — reject perpetual licenses
        if (payload.exp == null) {
            return { tier: 'community', valid: false, error: 'License key missing expiration' };
        }
        // Check expiry
        if (Date.now() / 1000 > payload.exp) {
            return {
                tier: 'community',
                valid: false,
                org: payload.org,
                expiry: new Date(payload.exp * 1000).toISOString(),
                error: 'License key has expired',
            };
        }
        // Validate tier
        const validTiers = ['starter', 'pro', 'team'];
        const tier = validTiers.includes(payload.tier) ? payload.tier : 'community';
        return {
            tier,
            valid: true,
            org: payload.org,
            expiry: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
        };
    }
    static hasFeature(license, requiredTier) {
        if (requiredTier === 'community')
            return true;
        if (!license.valid)
            return false;
        if (requiredTier === 'starter')
            return ['starter', 'pro', 'team'].includes(license.tier);
        if (requiredTier === 'pro')
            return ['starter', 'pro', 'team'].includes(license.tier);
        if (requiredTier === 'team')
            return license.tier === 'team';
        return false;
    }
}
exports.LicenseValidator = LicenseValidator;
