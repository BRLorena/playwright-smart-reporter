#!/usr/bin/env node
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
exports.generateLicense = generateLicense;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function base64UrlEncode(data) {
    return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function generateLicense(options, privateKeyPath) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    const now = Math.floor(Date.now() / 1000);
    let exp;
    if (options.expiry) {
        const parsedTime = new Date(options.expiry).getTime();
        if (Number.isNaN(parsedTime)) {
            throw new Error(`Invalid expiry date: "${options.expiry}"`);
        }
        exp = Math.floor(parsedTime / 1000);
    }
    else {
        // Default: 1 year from now
        exp = now + 365 * 24 * 60 * 60;
    }
    const header = { alg: 'ES256', typ: 'JWT' };
    const payload = {
        tier: options.tier,
        org: options.org,
        iat: now,
        exp,
    };
    const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const signatureInput = `${headerB64}.${payloadB64}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey);
    return `${signatureInput}.${base64UrlEncode(signature)}`;
}
function parseArgs(args) {
    let tier;
    let org;
    let expiry;
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--tier':
                tier = args[++i];
                break;
            case '--org':
                org = args[++i];
                break;
            case '--expiry':
                expiry = args[++i];
                break;
        }
    }
    if (!tier || !['pro', 'team'].includes(tier)) {
        console.error('Error: --tier must be "pro" or "team"');
        process.exit(1);
    }
    if (!org) {
        console.error('Error: --org is required');
        process.exit(1);
    }
    return { tier: tier, org, expiry };
}
// CJS guard — works because tsconfig targets CommonJS
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    const privateKeyPath = path.join(__dirname, '../../keys/private.pem');
    if (!fs.existsSync(privateKeyPath)) {
        console.error(`Error: Private key not found at ${privateKeyPath}`);
        process.exit(1);
    }
    try {
        const token = generateLicense(options, privateKeyPath);
        console.log(token);
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
