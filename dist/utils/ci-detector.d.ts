import type { CIInfo } from '../types';
/**
 * Auto-detect CI environment and capture metadata.
 * Shared between smart-reporter.ts and cloud/uploader.ts.
 */
export declare function detectCIInfo(): CIInfo | undefined;
