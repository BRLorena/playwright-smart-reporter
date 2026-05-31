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
const fs = __importStar(require("fs"));
const uploader_1 = require("./uploader");
vitest_1.vi.mock('fs');
vitest_1.vi.mock('../utils/ci-detector', () => ({
    detectCIInfo: vitest_1.vi.fn(() => ({
        provider: 'github',
        branch: 'main',
        commit: 'abc12345',
        buildId: '999',
    })),
}));
const mockFs = vitest_1.vi.mocked(fs);
function createTestResult(overrides = {}) {
    return {
        testId: 'test-1',
        title: 'Test one',
        file: 'tests/login.spec.ts',
        status: 'passed',
        duration: 1500,
        retry: 0,
        steps: [],
        history: [],
        ...overrides,
    };
}
(0, vitest_1.describe)('CloudUploader', () => {
    let mockFetch;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockFetch = vitest_1.vi.fn();
        vitest_1.vi.stubGlobal('fetch', mockFetch);
        vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
        vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
        // Ensure no env leak from previous tests
        delete process.env.STAGEWRIGHT_API_KEY;
        delete process.env.STAGEWRIGHT_PROJECT_ID;
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
        vitest_1.vi.unstubAllGlobals();
        vitest_1.vi.unstubAllEnvs();
    });
    (0, vitest_1.describe)('constructor and isEnabled', () => {
        (0, vitest_1.it)('is enabled when apiKey is provided and uploadToCloud is not false', () => {
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key-123' });
            (0, vitest_1.expect)(uploader.isEnabled()).toBe(true);
        });
        (0, vitest_1.it)('reads API key from environment variable', () => {
            vitest_1.vi.stubEnv('STAGEWRIGHT_API_KEY', 'env-key-456');
            const uploader = new uploader_1.CloudUploader({});
            (0, vitest_1.expect)(uploader.isEnabled()).toBe(true);
        });
        (0, vitest_1.it)('is disabled when no API key is set', () => {
            const uploader = new uploader_1.CloudUploader({});
            (0, vitest_1.expect)(uploader.isEnabled()).toBe(false);
        });
        (0, vitest_1.it)('is disabled when uploadToCloud is explicitly false', () => {
            const uploader = new uploader_1.CloudUploader({
                apiKey: 'key-123',
                uploadToCloud: false,
            });
            (0, vitest_1.expect)(uploader.isEnabled()).toBe(false);
        });
    });
    (0, vitest_1.describe)('mapStatus (via transformResults)', () => {
        async function getCloudStatus(result) {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1', url: 'https://app.stagewright.dev/runs/run-1' }),
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([createTestResult(result)], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            return body.results[0].status;
        }
        (0, vitest_1.it)('maps flaky outcome to flaky', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ outcome: 'flaky', status: 'passed' })).toBe('flaky');
        });
        (0, vitest_1.it)('maps skipped status to skipped', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ status: 'skipped' })).toBe('skipped');
        });
        (0, vitest_1.it)('maps expected outcome to passed', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ outcome: 'expected', status: 'passed' })).toBe('passed');
        });
        (0, vitest_1.it)('maps passed status to passed', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ status: 'passed' })).toBe('passed');
        });
        (0, vitest_1.it)('maps unexpected outcome with failed status to failed', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ outcome: 'unexpected', status: 'failed' })).toBe('failed');
        });
        (0, vitest_1.it)('maps test.fail() expected failure (status failed, outcome expected) to passed', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ status: 'failed', outcome: 'expected' })).toBe('passed');
        });
        (0, vitest_1.it)('maps timedOut status with no outcome to failed', async () => {
            (0, vitest_1.expect)(await getCloudStatus({ status: 'timedOut' })).toBe('failed');
        });
    });
    (0, vitest_1.describe)('transformResults', () => {
        (0, vitest_1.it)('maps all basic fields correctly', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const testData = createTestResult({
                testId: 'test-abc',
                title: 'My test',
                file: 'tests/foo.spec.ts',
                status: 'failed',
                outcome: 'unexpected',
                duration: 2500,
                retry: 2,
                error: 'Line one error\nStack trace here',
                stabilityScore: { overall: 85, flakiness: 90, performance: 80, reliability: 85, grade: 'B', needsAttention: false },
                flakinessIndicator: 'Stable',
                performanceTrend: 'improving',
                aiSuggestion: 'Try adding a wait',
                tags: ['smoke', 'critical'],
                steps: [
                    { title: 'Click', duration: 100, category: 'pw:api' },
                ],
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const r = body.results[0];
            (0, vitest_1.expect)(r.testId).toBe('test-abc');
            (0, vitest_1.expect)(r.title).toBe('My test');
            (0, vitest_1.expect)(r.filePath).toBe('tests/foo.spec.ts');
            (0, vitest_1.expect)(r.status).toBe('failed');
            (0, vitest_1.expect)(r.durationMs).toBe(2500);
            (0, vitest_1.expect)(r.retryCount).toBe(2);
            (0, vitest_1.expect)(r.errorMessage).toBe('Line one error');
            (0, vitest_1.expect)(r.errorStack).toBe('Line one error\nStack trace here');
            (0, vitest_1.expect)(r.stabilityScore).toBe(85);
            (0, vitest_1.expect)(r.stabilityGrade).toBe('B');
            (0, vitest_1.expect)(r.flakinessIndicator).toBe('Stable');
            (0, vitest_1.expect)(r.performanceTrend).toBe('improving');
            (0, vitest_1.expect)(r.aiSuggestion).toBe('Try adding a wait');
            (0, vitest_1.expect)(r.tags).toEqual(['smoke', 'critical']);
            (0, vitest_1.expect)(r.steps).toEqual([{ title: 'Click', duration: 100, category: 'pw:api' }]);
        });
        (0, vitest_1.it)('includes screenshot file attachments but excludes base64 data URIs', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const testData = createTestResult({
                attachments: {
                    screenshots: [
                        '/tmp/screenshots/fail.png',
                        'data:image/png;base64,iVBOR...',
                    ],
                    videos: [],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const attachments = body.results[0].attachments;
            (0, vitest_1.expect)(attachments).toHaveLength(1);
            (0, vitest_1.expect)(attachments[0].name).toBe('fail.png');
            (0, vitest_1.expect)(attachments[0].contentType).toBe('image/png');
            (0, vitest_1.expect)(attachments[0].path).toBe('/tmp/screenshots/fail.png');
        });
        (0, vitest_1.it)('includes video attachments', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const testData = createTestResult({
                attachments: {
                    screenshots: [],
                    videos: ['/tmp/videos/test.webm'],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const attachments = body.results[0].attachments;
            (0, vitest_1.expect)(attachments).toHaveLength(1);
            (0, vitest_1.expect)(attachments[0].name).toBe('test.webm');
            (0, vitest_1.expect)(attachments[0].contentType).toBe('video/webm');
        });
        (0, vitest_1.it)('includes trace attachments', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const testData = createTestResult({
                attachments: {
                    screenshots: [],
                    videos: [],
                    traces: ['/tmp/traces/trace.zip'],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const attachments = body.results[0].attachments;
            (0, vitest_1.expect)(attachments).toHaveLength(1);
            (0, vitest_1.expect)(attachments[0].name).toBe('trace.zip');
            (0, vitest_1.expect)(attachments[0].contentType).toBe('application/zip');
        });
        (0, vitest_1.it)('includes custom attachments with path', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const testData = createTestResult({
                attachments: {
                    screenshots: [],
                    videos: [],
                    traces: [],
                    custom: [
                        { name: 'har-log', contentType: 'application/json', path: '/tmp/network.har' },
                        { name: 'no-path', contentType: 'text/plain' }, // no path, should be skipped
                    ],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            const attachments = body.results[0].attachments;
            (0, vitest_1.expect)(attachments).toHaveLength(1);
            (0, vitest_1.expect)(attachments[0].name).toBe('har-log');
        });
    });
    (0, vitest_1.describe)('upload', () => {
        (0, vitest_1.it)('returns not-enabled error when disabled', async () => {
            const uploader = new uploader_1.CloudUploader({});
            const result = await uploader.upload([], Date.now());
            (0, vitest_1.expect)(result).toEqual({ success: false, error: 'Cloud upload not enabled' });
            (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('succeeds with 200 response and no artifact URLs', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    runId: 'run-abc',
                    url: 'https://app.stagewright.dev/runs/run-abc',
                }),
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key-123' });
            const result = await uploader.upload([createTestResult()], Date.now() - 5000);
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.runId).toBe('run-abc');
            (0, vitest_1.expect)(result.url).toBe('https://app.stagewright.dev/runs/run-abc');
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
            const [url, opts] = mockFetch.mock.calls[0];
            (0, vitest_1.expect)(url).toBe('https://app.stagewright.dev/api/v1/runs');
            (0, vitest_1.expect)(opts.method).toBe('POST');
            (0, vitest_1.expect)(opts.headers['X-API-Key']).toBe('key-123');
            (0, vitest_1.expect)(opts.headers['Content-Type']).toBe('application/json');
        });
        (0, vitest_1.it)('sends correct payload stats', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const results = [
                createTestResult({ status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: 'test-2', status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: 'test-3', status: 'skipped', outcome: 'skipped' }),
                createTestResult({ testId: 'test-4', status: 'passed', outcome: 'flaky' }),
            ];
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload(results, Date.now() - 2000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            (0, vitest_1.expect)(body.totalTests).toBe(4);
            (0, vitest_1.expect)(body.passed).toBe(2); // status=passed matches test-1 and test-4; skipped has no matching criterion
            (0, vitest_1.expect)(body.failed).toBe(1);
            (0, vitest_1.expect)(body.skipped).toBe(1);
            (0, vitest_1.expect)(body.flaky).toBe(1);
            (0, vitest_1.expect)(body.passRate).toBe(50);
        });
        (0, vitest_1.it)('includes CI info in payload', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([createTestResult()], Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            (0, vitest_1.expect)(body.ciProvider).toBe('github');
            (0, vitest_1.expect)(body.branch).toBe('main');
            (0, vitest_1.expect)(body.commitSha).toBe('abc12345');
            (0, vitest_1.expect)(body.ciBuildId).toBe('999');
        });
        (0, vitest_1.it)('includes stability score and grade in payload', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const results = [
                createTestResult({
                    stabilityScore: { overall: 95, flakiness: 100, performance: 90, reliability: 95, grade: 'A', needsAttention: false },
                }),
                createTestResult({
                    testId: 'test-2',
                    stabilityScore: { overall: 85, flakiness: 80, performance: 85, reliability: 90, grade: 'B', needsAttention: false },
                }),
            ];
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload(results, Date.now() - 1000);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            (0, vitest_1.expect)(body.stabilityScore).toBe(90); // avg of 95 and 85
            (0, vitest_1.expect)(body.stabilityGrade).toBe('A'); // 90 >= 90
        });
        (0, vitest_1.it)('uploads artifacts when artifact URLs are returned', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    runId: 'run-1',
                    artifactUploadUrls: {
                        '/tmp/screenshot.png': 'https://storage.example.com/upload/screenshot',
                    },
                }),
            })
                .mockResolvedValueOnce({ ok: true }); // artifact upload
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(Buffer.from('png-data'));
            const testData = createTestResult({
                attachments: {
                    screenshots: ['/tmp/screenshot.png'],
                    videos: [],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            await uploader.upload([testData], Date.now() - 1000);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(2);
            const [artifactUrl, artifactOpts] = mockFetch.mock.calls[1];
            (0, vitest_1.expect)(artifactUrl).toBe('https://storage.example.com/upload/screenshot');
            (0, vitest_1.expect)(artifactOpts.method).toBe('PUT');
            (0, vitest_1.expect)(artifactOpts.headers['Content-Type']).toBe('image/png');
        });
        (0, vitest_1.it)('skips artifact upload when uploadArtifacts is false', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    runId: 'run-1',
                    artifactUploadUrls: {
                        '/tmp/screenshot.png': 'https://storage.example.com/upload/screenshot',
                    },
                }),
            });
            const testData = createTestResult({
                attachments: {
                    screenshots: ['/tmp/screenshot.png'],
                    videos: [],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key', uploadArtifacts: false });
            await uploader.upload([testData], Date.now() - 1000);
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1); // only the main upload
        });
        (0, vitest_1.it)('returns error on API 4xx response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'bad-key' });
            const result = await uploader.upload([createTestResult()], Date.now());
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('401');
            (0, vitest_1.expect)(result.error).toContain('Unauthorized');
        });
        (0, vitest_1.it)('returns error on API 5xx response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([createTestResult()], Date.now());
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('500');
            (0, vitest_1.expect)(result.error).toContain('Internal Server Error');
        });
        (0, vitest_1.it)('returns error on network failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([createTestResult()], Date.now());
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Network unreachable');
        });
        (0, vitest_1.it)('returns error on non-Error throw', async () => {
            mockFetch.mockRejectedValueOnce('string error');
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([createTestResult()], Date.now());
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('string error');
        });
        (0, vitest_1.it)('uses custom endpoint when configured', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const uploader = new uploader_1.CloudUploader({
                apiKey: 'key',
                cloudEndpoint: 'https://custom.api.dev/v2',
            });
            await uploader.upload([createTestResult()], Date.now());
            (0, vitest_1.expect)(mockFetch.mock.calls[0][0]).toBe('https://custom.api.dev/v2/runs');
        });
        (0, vitest_1.it)('handles artifact upload failure gracefully', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    runId: 'run-1',
                    artifactUploadUrls: {
                        '/tmp/screenshot.png': 'https://storage.example.com/upload/screenshot',
                    },
                }),
            })
                .mockResolvedValueOnce({ ok: false, status: 403 });
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(Buffer.from('png-data'));
            const testData = createTestResult({
                attachments: {
                    screenshots: ['/tmp/screenshot.png'],
                    videos: [],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([testData], Date.now() - 1000);
            // Main upload should still succeed even if artifact upload fails
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(console.warn).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Failed to upload artifact'));
        });
        (0, vitest_1.it)('skips artifact upload when file does not exist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    runId: 'run-1',
                    artifactUploadUrls: {
                        '/tmp/missing.png': 'https://storage.example.com/upload/missing',
                    },
                }),
            });
            mockFs.existsSync.mockReturnValue(false);
            const testData = createTestResult({
                attachments: {
                    screenshots: ['/tmp/missing.png'],
                    videos: [],
                    traces: [],
                    custom: [],
                },
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([testData], Date.now() - 1000);
            (0, vitest_1.expect)(result.success).toBe(true);
            // Only main upload, no artifact upload attempt
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('handles empty results array', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ runId: 'run-1' }),
            });
            const uploader = new uploader_1.CloudUploader({ apiKey: 'key' });
            const result = await uploader.upload([], Date.now());
            (0, vitest_1.expect)(result.success).toBe(true);
            const body = JSON.parse(mockFetch.mock.calls[0][1].body);
            (0, vitest_1.expect)(body.totalTests).toBe(0);
            (0, vitest_1.expect)(body.passRate).toBe(0);
        });
    });
});
