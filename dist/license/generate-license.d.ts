#!/usr/bin/env node
interface LicenseOptions {
    tier: 'pro' | 'team';
    org: string;
    expiry?: string;
}
export declare function generateLicense(options: LicenseOptions, privateKeyPath: string): string;
export {};
