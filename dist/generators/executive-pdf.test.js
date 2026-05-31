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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const executive_pdf_1 = require("./executive-pdf");
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
function createBasicData(overrides = {}) {
    return {
        results: [createTestResult()],
        history: createTestHistory(),
        startTime: Date.now() - 5000,
        ...overrides,
    };
}
(0, vitest_1.describe)('executive-pdf', () => {
    let tmpDir;
    (0, vitest_1.beforeEach)(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-pdf-'));
    });
    (0, vitest_1.afterEach)(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('returns a file path ending in .pdf', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir);
        (0, vitest_1.expect)(result).toMatch(/\.pdf$/);
    });
    (0, vitest_1.it)('returns the expected filename', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir);
        (0, vitest_1.expect)(path.basename(result)).toBe('smart-report.pdf');
    });
    (0, vitest_1.it)('creates a file at the returned path', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir);
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
    });
    (0, vitest_1.it)('generated file starts with PDF magic bytes', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir);
        const buffer = fs.readFileSync(result);
        const header = buffer.subarray(0, 5).toString('ascii');
        (0, vitest_1.expect)(header).toBe('%PDF-');
    });
    (0, vitest_1.it)('generated file has reasonable size (> 1KB)', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir);
        const stats = fs.statSync(result);
        (0, vitest_1.expect)(stats.size).toBeGreaterThan(1024);
    });
    (0, vitest_1.it)('handles empty results array without throwing', () => {
        const data = createBasicData({ results: [] });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir);
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
    });
    (0, vitest_1.it)('handles missing history summaries', () => {
        const data = createBasicData({
            history: createTestHistory({ summaries: undefined }),
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir);
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
    });
    (0, vitest_1.it)('handles empty history summaries', () => {
        const data = createBasicData({
            history: createTestHistory({ summaries: [] }),
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles missing CI info', () => {
        const data = createBasicData({ ciInfo: undefined });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles CI info with all fields', () => {
        const ciInfo = {
            provider: 'github',
            branch: 'main',
            commit: 'abc1234',
            buildId: '42',
        };
        const data = createBasicData({ ciInfo });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles missing failure clusters', () => {
        const data = createBasicData({ failureClusters: undefined });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles results with all tests passed (no failures)', () => {
        const results = [
            createTestResult({ testId: '1', status: 'passed', outcome: 'expected' }),
            createTestResult({ testId: '2', status: 'passed', outcome: 'expected' }),
            createTestResult({ testId: '3', status: 'passed', outcome: 'expected' }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles results with failures and AI suggestions', () => {
        const failedTest = createTestResult({
            testId: 'fail-1',
            title: 'Login should work',
            status: 'failed',
            outcome: 'unexpected',
            error: 'TimeoutError: element not found',
            aiSuggestion: 'Add explicit wait for the login button',
        });
        const clusters = [
            {
                id: 'cluster-1',
                errorType: 'TimeoutError',
                count: 1,
                tests: [failedTest],
                aiSuggestion: 'Consider increasing timeout or adding waits',
            },
        ];
        const data = createBasicData({
            results: [failedTest],
            failureClusters: clusters,
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles results with no stability scores', () => {
        const results = [
            createTestResult({ testId: '1', stabilityScore: undefined }),
            createTestResult({ testId: '2', stabilityScore: undefined }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles results with stability scores', () => {
        const results = [
            createTestResult({ testId: '1', stabilityScore: createStabilityScore({ grade: 'A' }) }),
            createTestResult({ testId: '2', stabilityScore: createStabilityScore({ grade: 'C' }) }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('custom project name appears in PDF content', () => {
        const data = createBasicData({ projectName: 'MyProject-E2E' });
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir);
        const buffer = fs.readFileSync(result);
        const content = buffer.toString('latin1');
        (0, vitest_1.expect)(content).toContain('MyProject-E2E');
    });
    (0, vitest_1.it)('handles history with multiple summaries for sparklines', () => {
        const summaries = Array.from({ length: 10 }, (_, i) => createRunSummary({
            runId: `run-${i}`,
            passRate: 70 + i * 3,
            duration: 5000 + i * 500,
        }));
        const data = createBasicData({
            history: createTestHistory({ summaries }),
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir);
        (0, vitest_1.expect)(fs.statSync(result).size).toBeGreaterThan(1024);
    });
    (0, vitest_1.it)('handles mixed test statuses (pass, fail, skip, flaky)', () => {
        const results = [
            createTestResult({ testId: '1', status: 'passed', outcome: 'expected' }),
            createTestResult({ testId: '2', status: 'failed', outcome: 'unexpected', error: 'Assertion failed' }),
            createTestResult({ testId: '3', status: 'skipped', outcome: 'skipped' }),
            createTestResult({ testId: '4', status: 'passed', outcome: 'flaky' }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles failure clusters without AI suggestion', () => {
        const failedTest = createTestResult({
            testId: 'fail-1',
            status: 'failed',
            outcome: 'unexpected',
            error: 'Connection refused',
        });
        const clusters = [
            {
                id: 'cluster-1',
                errorType: 'ConnectionError',
                count: 1,
                tests: [failedTest],
                // no aiSuggestion
            },
        ];
        const data = createBasicData({
            results: [failedTest],
            failureClusters: clusters,
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('creates output directory if it does not exist', () => {
        const nestedDir = path.join(tmpDir, 'nested', 'output');
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), nestedDir);
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
    });
    (0, vitest_1.it)('handles very long test names in failure table', () => {
        const longName = 'A'.repeat(200);
        const results = [
            createTestResult({
                testId: 'long-1',
                title: longName,
                status: 'failed',
                outcome: 'unexpected',
                error: 'Some error',
            }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    (0, vitest_1.it)('handles CI info with partial fields', () => {
        const ciInfo = {
            provider: 'jenkins',
            // branch and commit undefined
        };
        const data = createBasicData({ ciInfo });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir)).not.toThrow();
    });
    // ── Theme variants ─────────────────────────────────────────────
    (0, vitest_1.it)('generates dark theme PDF with correct filename', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir, 'report', 'dark');
        (0, vitest_1.expect)(path.basename(result)).toBe('report-dark.pdf');
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
        const header = fs.readFileSync(result).subarray(0, 5).toString('ascii');
        (0, vitest_1.expect)(header).toBe('%PDF-');
    });
    (0, vitest_1.it)('generates minimal theme PDF with correct filename', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir, 'report', 'minimal');
        (0, vitest_1.expect)(path.basename(result)).toBe('report-minimal.pdf');
        (0, vitest_1.expect)(fs.existsSync(result)).toBe(true);
        const header = fs.readFileSync(result).subarray(0, 5).toString('ascii');
        (0, vitest_1.expect)(header).toBe('%PDF-');
    });
    (0, vitest_1.it)('corporate theme uses default filename (no suffix)', () => {
        const result = (0, executive_pdf_1.generateExecutivePdf)(createBasicData(), tmpDir, 'report', 'corporate');
        (0, vitest_1.expect)(path.basename(result)).toBe('report.pdf');
    });
    (0, vitest_1.it)('dark theme produces a valid PDF with failures', () => {
        const results = [
            createTestResult({ testId: '1', status: 'passed', outcome: 'expected' }),
            createTestResult({ testId: '2', status: 'failed', outcome: 'unexpected', error: 'Boom' }),
            createTestResult({ testId: '3', status: 'passed', outcome: 'flaky' }),
        ];
        const data = createBasicData({ results });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir, 'dark-test', 'dark')).not.toThrow();
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir, 'dark-test', 'dark');
        (0, vitest_1.expect)(fs.statSync(result).size).toBeGreaterThan(1024);
    });
    (0, vitest_1.it)('minimal theme produces a valid PDF with history', () => {
        const summaries = Array.from({ length: 5 }, (_, i) => createRunSummary({ runId: `run-${i}`, passRate: 80 + i * 2 }));
        const data = createBasicData({
            history: createTestHistory({ summaries }),
        });
        (0, vitest_1.expect)(() => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir, 'minimal-test', 'minimal')).not.toThrow();
        const result = (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir, 'minimal-test', 'minimal');
        (0, vitest_1.expect)(fs.statSync(result).size).toBeGreaterThan(1024);
    });
    (0, vitest_1.it)('all 3 themed PDFs can be generated side by side', () => {
        const data = createBasicData();
        const themes = ['corporate', 'dark', 'minimal'];
        const paths = themes.map(t => (0, executive_pdf_1.generateExecutivePdf)(data, tmpDir, 'multi', t));
        (0, vitest_1.expect)(paths.map(p => path.basename(p))).toEqual([
            'multi.pdf', 'multi-dark.pdf', 'multi-minimal.pdf',
        ]);
        for (const p of paths) {
            (0, vitest_1.expect)(fs.existsSync(p)).toBe(true);
            (0, vitest_1.expect)(fs.statSync(p).size).toBeGreaterThan(1024);
        }
    });
});
