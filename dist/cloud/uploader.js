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
exports.CloudUploader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ci_detector_1 = require("../utils/ci-detector");
const DEFAULT_ENDPOINT = 'https://app.stagewright.dev/api/v1';
/**
 * Maps TestResultData status to cloud status
 */
function mapStatus(result) {
    if (result.outcome === 'flaky')
        return 'flaky';
    if (result.status === 'skipped')
        return 'skipped';
    if (result.outcome === 'expected')
        return 'passed';
    if (result.status === 'passed')
        return 'passed';
    return 'failed';
}
/**
 * Transforms local test results to cloud format
 */
function transformResults(results) {
    return results.map((result) => {
        const attachments = [];
        // Add screenshots
        if (result.attachments?.screenshots) {
            for (const screenshot of result.attachments.screenshots) {
                // Skip base64 data URIs for cloud upload
                if (!screenshot.startsWith('data:')) {
                    attachments.push({
                        name: path.basename(screenshot),
                        contentType: 'image/png',
                        path: screenshot,
                    });
                }
            }
        }
        // Add videos
        if (result.attachments?.videos) {
            for (const video of result.attachments.videos) {
                attachments.push({
                    name: path.basename(video),
                    contentType: 'video/webm',
                    path: video,
                });
            }
        }
        // Add traces
        if (result.attachments?.traces) {
            for (const trace of result.attachments.traces) {
                attachments.push({
                    name: path.basename(trace),
                    contentType: 'application/zip',
                    path: trace,
                });
            }
        }
        // Add custom attachments
        if (result.attachments?.custom) {
            for (const custom of result.attachments.custom) {
                if (custom.path) {
                    attachments.push({
                        name: custom.name,
                        contentType: custom.contentType,
                        path: custom.path,
                    });
                }
            }
        }
        return {
            testId: result.testId,
            title: result.title,
            filePath: result.file,
            status: mapStatus(result),
            durationMs: result.duration,
            retryCount: result.retry,
            errorMessage: result.error?.split('\n')[0], // First line only
            errorStack: result.error,
            stabilityScore: result.stabilityScore?.overall,
            stabilityGrade: result.stabilityScore?.grade,
            flakinessIndicator: result.flakinessIndicator,
            performanceTrend: result.performanceTrend,
            aiSuggestion: result.aiSuggestion,
            tags: result.tags || [],
            attachments,
            steps: (result.steps || []).map((step) => ({
                title: step.title,
                duration: step.duration,
                category: step.category,
            })),
        };
    });
}
/**
 * Uploads artifact files to presigned URLs
 */
async function uploadArtifacts(results, artifactUrls) {
    for (const result of results) {
        for (const attachment of result.attachments) {
            if (attachment.path && artifactUrls[attachment.path]) {
                const url = artifactUrls[attachment.path];
                const filePath = attachment.path;
                if (fs.existsSync(filePath)) {
                    try {
                        const fileBuffer = fs.readFileSync(filePath);
                        const response = await fetch(url, {
                            method: 'PUT',
                            body: fileBuffer,
                            headers: {
                                'Content-Type': attachment.contentType,
                            },
                        });
                        if (!response.ok) {
                            console.warn(`Failed to upload artifact ${filePath}: ${response.status}`);
                        }
                    }
                    catch (err) {
                        console.warn(`Failed to upload artifact ${filePath}:`, err);
                    }
                }
            }
        }
    }
}
/**
 * Cloud Uploader - Uploads test results to StageWright Cloud
 */
class CloudUploader {
    constructor(options) {
        // Get API key from options or environment
        this.apiKey = options.apiKey || process.env.STAGEWRIGHT_API_KEY;
        this.projectId = options.projectId || process.env.STAGEWRIGHT_PROJECT_ID;
        this.endpoint = options.cloudEndpoint || DEFAULT_ENDPOINT;
        this.uploadArtifacts = options.uploadArtifacts !== false;
        // Enable if API key is present (unless explicitly disabled)
        this.enabled = options.uploadToCloud !== false && !!this.apiKey;
    }
    isEnabled() {
        return this.enabled;
    }
    /**
     * Upload test results to StageWright Cloud
     */
    async upload(results, startTime) {
        if (!this.enabled) {
            return { success: false, error: 'Cloud upload not enabled' };
        }
        if (!this.apiKey) {
            return { success: false, error: 'No API key configured' };
        }
        try {
            const ciInfo = (0, ci_detector_1.detectCIInfo)();
            const duration = Date.now() - startTime;
            // Calculate stats using outcome-based counting
            const passed = results.filter(r => r.status === 'passed' ||
                r.outcome === 'expected' ||
                r.outcome === 'flaky').length;
            const failed = results.filter(r => r.outcome === 'unexpected' &&
                (r.status === 'failed' || r.status === 'timedOut')).length;
            const skipped = results.filter(r => r.status === 'skipped').length;
            const flaky = results.filter(r => r.outcome === 'flaky').length;
            // Calculate average stability score
            const stabilityScores = results
                .filter(r => r.stabilityScore?.overall !== undefined)
                .map(r => r.stabilityScore.overall);
            const avgStability = stabilityScores.length > 0
                ? Math.round(stabilityScores.reduce((a, b) => a + b, 0) / stabilityScores.length)
                : undefined;
            // Get stability grade from average
            const getGrade = (score) => {
                if (score >= 95)
                    return 'A+';
                if (score >= 90)
                    return 'A';
                if (score >= 80)
                    return 'B';
                if (score >= 70)
                    return 'C';
                if (score >= 60)
                    return 'D';
                return 'F';
            };
            const cloudResults = transformResults(results);
            const payload = {
                totalTests: results.length,
                passed,
                failed,
                skipped,
                flaky,
                durationMs: duration,
                passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
                stabilityScore: avgStability,
                stabilityGrade: avgStability !== undefined ? getGrade(avgStability) : undefined,
                branch: ciInfo?.branch,
                commitSha: ciInfo?.commit,
                ciProvider: ciInfo?.provider,
                ciBuildId: ciInfo?.buildId,
                metadata: {
                    nodeVersion: process.version,
                    platform: process.platform,
                },
                results: cloudResults,
            };
            // Upload to cloud
            const response = await fetch(`${this.endpoint}/runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                return {
                    success: false,
                    error: `Upload failed: ${response.status} ${errorBody}`,
                };
            }
            const data = await response.json();
            // Upload artifacts if enabled and URLs provided
            if (this.uploadArtifacts && data.artifactUploadUrls) {
                await uploadArtifacts(cloudResults, data.artifactUploadUrls);
            }
            return {
                success: true,
                runId: data.runId,
                url: data.url,
            };
        }
        catch (err) {
            return {
                success: false,
                error: `Upload error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    }
}
exports.CloudUploader = CloudUploader;
