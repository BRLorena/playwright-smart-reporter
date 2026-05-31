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
const path = __importStar(require("path"));
const json_exporter_1 = require("./json-exporter");
vitest_1.vi.mock('fs');
function createTestResult(overrides = {}) {
    return {
        testId: 'test-1',
        title: 'Test One',
        file: 'tests/example.spec.ts',
        status: 'passed',
        duration: 1000,
        retry: 0,
        steps: [],
        history: [],
        ...overrides,
    };
}
function createTestHistory(overrides = {}) {
    return {
        runs: [],
        tests: {},
        summaries: [],
        ...overrides,
    };
}
function createRunSummary(overrides = {}) {
    return {
        runId: 'run-1',
        timestamp: new Date().toISOString(),
        total: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        flaky: 1,
        slow: 1,
        duration: 5000,
        passRate: 80,
        ...overrides,
    };
}
function createStabilityScore(overrides = {}) {
    return {
        overall: 90,
        flakiness: 95,
        performance: 85,
        reliability: 90,
        grade: 'A',
        needsAttention: false,
        ...overrides,
    };
}
(0, vitest_1.describe)('json-exporter', () => {
    const mockFs = vitest_1.vi.mocked(fs);
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Mock readFileSync for package.json version lookup
        mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.8' }));
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('exportJsonData', () => {
        (0, vitest_1.it)('produces valid JSON file at expected path', () => {
            const results = [createTestResult()];
            const history = createTestHistory();
            const options = { outputFile: '/reports/smart-report.html' };
            const outputPath = (0, json_exporter_1.exportJsonData)(results, history, Date.now(), options);
            (0, vitest_1.expect)(outputPath).toBe(path.resolve('/reports', 'smart-report-data.json'));
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledOnce();
            const [writtenPath, writtenContent] = mockFs.writeFileSync.mock.calls[0];
            (0, vitest_1.expect)(writtenPath).toBe(outputPath);
            // Verify structural correctness of the JSON
            const parsed = JSON.parse(writtenContent);
            (0, vitest_1.expect)(parsed.metadata.reporterVersion).toBeDefined();
            (0, vitest_1.expect)(Array.isArray(parsed.tests)).toBe(true);
            (0, vitest_1.expect)(parsed.summary.total).toBe(1);
        });
        (0, vitest_1.it)('summary fields are correct (total, passed, failed, skipped, flaky, passRate)', () => {
            // The passed filter is: status==='passed' || outcome==='expected' || outcome==='flaky'
            // The failed filter is: outcome==='unexpected' && (status==='failed' || status==='timedOut')
            const results = [
                createTestResult({ testId: '1', status: 'passed', outcome: 'expected' }),
                createTestResult({ testId: '2', status: 'failed', outcome: 'unexpected' }),
                createTestResult({ testId: '3', status: 'skipped', outcome: 'skipped' }),
                createTestResult({ testId: '4', status: 'passed', outcome: 'flaky' }),
                createTestResult({ testId: '5', status: 'timedOut', outcome: 'unexpected' }),
            ];
            const history = createTestHistory();
            const options = {};
            const startTime = Date.now();
            (0, json_exporter_1.exportJsonData)(results, history, startTime, options);
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.summary.total).toBe(5);
            // #1: status=passed -> yes; #4: status=passed + outcome=flaky -> yes
            // #2, #3, #5 don't match any passed condition
            (0, vitest_1.expect)(written.summary.passed).toBe(2);
            // #2: outcome=unexpected + status=failed; #5: outcome=unexpected + status=timedOut
            (0, vitest_1.expect)(written.summary.failed).toBe(2);
            (0, vitest_1.expect)(written.summary.skipped).toBe(1);
            (0, vitest_1.expect)(written.summary.flaky).toBe(1);
            (0, vitest_1.expect)(written.summary.passRate).toBe(40); // 2/5 * 100
            (0, vitest_1.expect)(written.summary.duration).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('stability grade calculation (average across tests)', () => {
            const results = [
                createTestResult({ testId: '1', stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: '2', stabilityScore: createStabilityScore({ grade: 'B' }) }),
                createTestResult({ testId: '3', stabilityScore: createStabilityScore({ grade: 'A' }) }),
            ];
            const history = createTestHistory();
            const options = {};
            (0, json_exporter_1.exportJsonData)(results, history, Date.now(), options);
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            // A=5, B=4, A=5 => avg = 14/3 = 4.67 => round = 5 => 'A'
            (0, vitest_1.expect)(written.summary.stabilityGrade).toBe('A');
        });
        (0, vitest_1.it)('stability grade averages to middle grade correctly', () => {
            const results = [
                createTestResult({ testId: '1', stabilityScore: createStabilityScore({ grade: 'A' }) }),
                createTestResult({ testId: '2', stabilityScore: createStabilityScore({ grade: 'C' }) }),
            ];
            const history = createTestHistory();
            (0, json_exporter_1.exportJsonData)(results, history, Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            // A=5, C=3 => avg = 8/2 = 4 => 'B'
            (0, vitest_1.expect)(written.summary.stabilityGrade).toBe('B');
        });
        (0, vitest_1.it)('tests array contains all required fields', () => {
            const results = [
                createTestResult({
                    testId: 'abc-123',
                    title: 'Login test',
                    file: 'tests/login.spec.ts',
                    status: 'failed',
                    duration: 2500,
                    retry: 2,
                    error: 'Element not found',
                    outcome: 'unexpected',
                    flakinessScore: 0.3,
                    stabilityScore: createStabilityScore({ overall: 75, grade: 'C' }),
                    performanceTrend: '↑ 15% slower',
                    tags: ['@smoke'],
                    suite: 'Auth',
                    browser: 'chromium',
                    project: 'Desktop Chrome',
                    aiSuggestion: 'Add wait before click',
                }),
            ];
            const history = createTestHistory();
            (0, json_exporter_1.exportJsonData)(results, history, Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            const test = written.tests[0];
            (0, vitest_1.expect)(test.testId).toBe('abc-123');
            (0, vitest_1.expect)(test.title).toBe('Login test');
            (0, vitest_1.expect)(test.file).toBe('tests/login.spec.ts');
            (0, vitest_1.expect)(test.status).toBe('failed');
            (0, vitest_1.expect)(test.duration).toBe(2500);
            (0, vitest_1.expect)(test.retry).toBe(2);
            (0, vitest_1.expect)(test.error).toBe('Element not found');
            (0, vitest_1.expect)(test.outcome).toBe('unexpected');
            (0, vitest_1.expect)(test.flakinessScore).toBe(0.3);
            (0, vitest_1.expect)(test.stabilityScore).toEqual({ overall: 75, grade: 'C' });
            (0, vitest_1.expect)(test.performanceTrend).toBe('↑ 15% slower');
            (0, vitest_1.expect)(test.tags).toEqual(['@smoke']);
            (0, vitest_1.expect)(test.suite).toBe('Auth');
            (0, vitest_1.expect)(test.browser).toBe('chromium');
            (0, vitest_1.expect)(test.project).toBe('Desktop Chrome');
            (0, vitest_1.expect)(test.aiSuggestion).toBe('Add wait before click');
        });
        (0, vitest_1.it)('failure clusters are included when present', () => {
            const clusterTest = createTestResult({ testId: 'fail-1', status: 'failed' });
            const clusters = [
                {
                    id: 'cluster-1',
                    errorType: 'TimeoutError',
                    count: 3,
                    tests: [clusterTest],
                    aiSuggestion: 'Increase timeout',
                },
            ];
            (0, json_exporter_1.exportJsonData)([clusterTest], createTestHistory(), Date.now(), {}, undefined, clusters);
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.failureClusters).toHaveLength(1);
            (0, vitest_1.expect)(written.failureClusters[0].id).toBe('cluster-1');
            (0, vitest_1.expect)(written.failureClusters[0].errorType).toBe('TimeoutError');
            (0, vitest_1.expect)(written.failureClusters[0].count).toBe(3);
            (0, vitest_1.expect)(written.failureClusters[0].testIds).toEqual(['fail-1']);
            (0, vitest_1.expect)(written.failureClusters[0].aiSuggestion).toBe('Increase timeout');
        });
        (0, vitest_1.it)('comparison data is included when present', () => {
            const comparison = {
                baselineRun: createRunSummary({ runId: 'baseline', passRate: 70 }),
                currentRun: createRunSummary({ runId: 'current', passRate: 90 }),
                changes: {
                    newFailures: [],
                    fixedTests: [],
                    newTests: [],
                    regressions: [],
                    improvements: [],
                },
            };
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), {}, comparison);
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.comparison).toBeDefined();
            (0, vitest_1.expect)(written.comparison.baselineRun.runId).toBe('baseline');
            (0, vitest_1.expect)(written.comparison.currentRun.runId).toBe('current');
            (0, vitest_1.expect)(written.comparison.changes).toBeDefined();
        });
        (0, vitest_1.it)('history data is included', () => {
            const history = createTestHistory({
                runs: [
                    { runId: 'run-1', timestamp: '2024-01-01T00:00:00Z' },
                    { runId: 'run-2', timestamp: '2024-01-02T00:00:00Z' },
                ],
                summaries: [
                    createRunSummary({ runId: 'run-1' }),
                    createRunSummary({ runId: 'run-2' }),
                ],
            });
            (0, json_exporter_1.exportJsonData)([createTestResult()], history, Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.history).toBeDefined();
            (0, vitest_1.expect)(written.history.runCount).toBe(2);
            (0, vitest_1.expect)(written.history.runs).toHaveLength(2);
            (0, vitest_1.expect)(written.history.summaries).toHaveLength(2);
        });
        (0, vitest_1.it)('handles history with undefined summaries', () => {
            const history = createTestHistory({
                runs: [{ runId: 'run-1', timestamp: '2024-01-01T00:00:00Z' }],
                summaries: undefined,
            });
            (0, json_exporter_1.exportJsonData)([createTestResult()], history, Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.history.runCount).toBe(1);
            (0, vitest_1.expect)(written.history.runs).toHaveLength(1);
            (0, vitest_1.expect)(written.history.summaries).toBeUndefined();
        });
        (0, vitest_1.it)('handles empty results array', () => {
            (0, json_exporter_1.exportJsonData)([], createTestHistory(), Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.summary.total).toBe(0);
            (0, vitest_1.expect)(written.summary.passed).toBe(0);
            (0, vitest_1.expect)(written.summary.failed).toBe(0);
            (0, vitest_1.expect)(written.summary.skipped).toBe(0);
            (0, vitest_1.expect)(written.summary.flaky).toBe(0);
            (0, vitest_1.expect)(written.summary.passRate).toBe(0);
            (0, vitest_1.expect)(written.tests).toEqual([]);
        });
        (0, vitest_1.it)('handles results with no stability scores', () => {
            const results = [
                createTestResult({ testId: '1' }),
                createTestResult({ testId: '2' }),
            ];
            (0, json_exporter_1.exportJsonData)(results, createTestHistory(), Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.summary.stabilityGrade).toBeUndefined();
            (0, vitest_1.expect)(written.tests[0].stabilityScore).toBeUndefined();
            (0, vitest_1.expect)(written.tests[1].stabilityScore).toBeUndefined();
        });
        (0, vitest_1.it)('version comes from package.json (not hardcoded)', () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.5.0' }));
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.metadata.reporterVersion).toBe('2.5.0');
        });
        (0, vitest_1.it)('falls back to 0.0.0 when package.json read fails', () => {
            mockFs.readFileSync.mockImplementation((p) => {
                if (typeof p === 'string' && p.includes('package.json')) {
                    throw new Error('ENOENT');
                }
                return '';
            });
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.metadata.reporterVersion).toBe('0.0.0');
        });
        (0, vitest_1.it)('outputDir parameter is respected', () => {
            const results = [createTestResult()];
            const history = createTestHistory();
            const options = { outputFile: '/default/smart-report.html' };
            const outputPath = (0, json_exporter_1.exportJsonData)(results, history, Date.now(), options, undefined, undefined, '/custom/output');
            (0, vitest_1.expect)(outputPath).toBe(path.resolve('/custom/output', 'smart-report-data.json'));
        });
        (0, vitest_1.it)('uses cwd when no outputFile or outputDir specified', () => {
            const results = [createTestResult()];
            const history = createTestHistory();
            const outputPath = (0, json_exporter_1.exportJsonData)(results, history, Date.now(), {});
            (0, vitest_1.expect)(outputPath).toBe(path.resolve(process.cwd(), 'smart-report-data.json'));
        });
        (0, vitest_1.it)('metadata includes generatedAt timestamp', () => {
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), {});
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.metadata.generatedAt).toBeDefined();
            // Should be a valid ISO date string
            (0, vitest_1.expect)(new Date(written.metadata.generatedAt).toISOString()).toBe(written.metadata.generatedAt);
        });
        (0, vitest_1.it)('metadata includes projectName when configured', () => {
            const options = { projectName: 'my-project' };
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), options);
            const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
            (0, vitest_1.expect)(written.metadata.projectName).toBe('my-project');
        });
        (0, vitest_1.it)('JSON output is pretty-printed with 2-space indentation', () => {
            (0, json_exporter_1.exportJsonData)([createTestResult()], createTestHistory(), Date.now(), {});
            const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
            // Pretty-printed JSON has newlines and indentation
            (0, vitest_1.expect)(writtenContent).toContain('\n');
            (0, vitest_1.expect)(writtenContent).toContain('  ');
        });
    });
});
