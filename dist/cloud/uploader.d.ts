import type { SmartReporterOptions, TestResultData } from '../types';
interface UploadResult {
    success: boolean;
    runId?: string;
    url?: string;
    error?: string;
    artifactUploadUrls?: Record<string, string>;
}
/**
 * Cloud Uploader - Uploads test results to StageWright Cloud
 */
export declare class CloudUploader {
    private apiKey;
    private projectId;
    private endpoint;
    private uploadArtifacts;
    private enabled;
    constructor(options: SmartReporterOptions);
    isEnabled(): boolean;
    /**
     * Upload test results to StageWright Cloud
     */
    upload(results: TestResultData[], startTime: number): Promise<UploadResult>;
}
export {};
