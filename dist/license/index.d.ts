import type { LicenseTier, LicenseInfo } from '../types';
export declare class LicenseValidator {
    private publicKey;
    constructor(publicKey?: string);
    validate(key?: string): LicenseInfo;
    static hasFeature(license: LicenseInfo, requiredTier: LicenseTier): boolean;
}
