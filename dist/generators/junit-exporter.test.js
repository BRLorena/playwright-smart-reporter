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
const junit_exporter_1 = require("./junit-exporter");
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
(0, vitest_1.describe)('junit-exporter', () => {
    const mockFs = vitest_1.vi.mocked(fs);
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('exportJunitXml', () => {
        (0, vitest_1.it)('produces valid XML file at expected path', () => {
            const results = [createTestResult()];
            const options = { outputFile: '/reports/smart-report.html' };
            const outputPath = (0, junit_exporter_1.exportJunitXml)(results, options);
            (0, vitest_1.expect)(outputPath).toBe(path.resolve('/reports', 'smart-report-junit.xml'));
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledOnce();
            const [writtenPath, writtenContent] = mockFs.writeFileSync.mock.calls[0];
            (0, vitest_1.expect)(writtenPath).toBe(outputPath);
            (0, vitest_1.expect)(writtenContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        });
        (0, vitest_1.it)('root <testsuites> has correct aggregate counts', () => {
            const results = [
                createTestResult({ testId: '1', status: 'passed', duration: 1000 }),
                createTestResult({ testId: '2', status: 'failed', duration: 2000 }),
                createTestResult({ testId: '3', status: 'skipped', duration: 0 }),
                createTestResult({ testId: '4', status: 'timedOut', duration: 3000 }),
                createTestResult({ testId: '5', status: 'interrupted', duration: 500 }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // tests="5"
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*tests="5"/);
            // failures = failed + timedOut = 2
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*failures="2"/);
            // skipped = 1
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*skipped="1"/);
            // errors = interrupted = 1
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*errors="1"/);
            // total time = (1000+2000+0+3000+500)/1000 = 6.500
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*time="6\.500"/);
        });
        (0, vitest_1.it)('tests grouped by spec file into <testsuite> elements', () => {
            const results = [
                createTestResult({ testId: '1', file: 'tests/auth.spec.ts', title: 'Login' }),
                createTestResult({ testId: '2', file: 'tests/auth.spec.ts', title: 'Logout' }),
                createTestResult({ testId: '3', file: 'tests/home.spec.ts', title: 'Home page' }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // Two testsuite elements
            const suiteMatches = xml.match(/<testsuite /g);
            (0, vitest_1.expect)(suiteMatches).toHaveLength(2);
            // auth suite has 2 tests
            (0, vitest_1.expect)(xml).toMatch(/<testsuite name="tests\/auth\.spec\.ts"[^>]*tests="2"/);
            // home suite has 1 test
            (0, vitest_1.expect)(xml).toMatch(/<testsuite name="tests\/home\.spec\.ts"[^>]*tests="1"/);
        });
        (0, vitest_1.it)('each <testsuite> has timestamp attribute', () => {
            const results = [
                createTestResult({ file: 'tests/a.spec.ts' }),
                createTestResult({ testId: '2', file: 'tests/b.spec.ts' }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // Each testsuite should have a timestamp
            const suiteRegex = /<testsuite[^>]*timestamp="([^"]+)"/g;
            const timestamps = [];
            let match;
            while ((match = suiteRegex.exec(xml)) !== null) {
                timestamps.push(match[1]);
            }
            (0, vitest_1.expect)(timestamps).toHaveLength(2);
            // Timestamps should be valid ISO strings
            for (const ts of timestamps) {
                (0, vitest_1.expect)(new Date(ts).toISOString()).toBe(ts);
            }
            // All suites share the same timestamp
            (0, vitest_1.expect)(timestamps[0]).toBe(timestamps[1]);
        });
        (0, vitest_1.it)('failed tests have <failure> with type, message, and body', () => {
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'Expected true to be false\n  at test.spec.ts:10:5',
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<failure');
            (0, vitest_1.expect)(xml).toMatch(/type="AssertionError"/);
            (0, vitest_1.expect)(xml).toMatch(/message="Expected true to be false"/);
            // Body contains full error (escaped)
            (0, vitest_1.expect)(xml).toContain('at test.spec.ts:10:5');
        });
        (0, vitest_1.it)('timed-out tests have <failure> with type Timeout', () => {
            const results = [
                createTestResult({
                    status: 'timedOut',
                    error: 'Test exceeded 30000ms timeout',
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<failure');
            (0, vitest_1.expect)(xml).toMatch(/type="Timeout"/);
        });
        (0, vitest_1.it)('skipped tests have <skipped />', () => {
            const results = [createTestResult({ status: 'skipped' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<skipped />');
        });
        (0, vitest_1.it)('interrupted tests have <error>', () => {
            const results = [createTestResult({ status: 'interrupted' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<error');
            (0, vitest_1.expect)(xml).toMatch(/type="Interrupted"/);
            (0, vitest_1.expect)(xml).toMatch(/message="Test was interrupted"/);
        });
        (0, vitest_1.it)('custom properties: stability-grade and stability-score', () => {
            const results = [
                createTestResult({
                    stabilityScore: createStabilityScore({ overall: 85, grade: 'B' }),
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<property name="stability-grade" value="B" />');
            (0, vitest_1.expect)(xml).toContain('<property name="stability-score" value="85" />');
        });
        (0, vitest_1.it)('custom properties: flakiness-score exercises toFixed(2) rounding', () => {
            const results = [createTestResult({ flakinessScore: 0.1 })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<property name="flakiness-score" value="0.10" />');
        });
        (0, vitest_1.it)('custom properties: performance-trend', () => {
            const results = [createTestResult({ performanceTrend: '20% slower' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<property name="performance-trend" value="20% slower" />');
        });
        (0, vitest_1.it)('custom properties: tags', () => {
            const results = [createTestResult({ tags: ['@smoke', '@critical'] })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<property name="tags" value="@smoke,@critical" />');
        });
        (0, vitest_1.it)('custom properties: retries (only when retry > 0)', () => {
            const results = [
                createTestResult({ testId: '1', retry: 0 }),
                createTestResult({ testId: '2', retry: 3 }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // Only one retries property (for test with retry=3)
            const retryMatches = xml.match(/name="retries"/g);
            (0, vitest_1.expect)(retryMatches).toHaveLength(1);
            (0, vitest_1.expect)(xml).toContain('<property name="retries" value="3" />');
        });
        (0, vitest_1.it)('custom properties: outcome', () => {
            const results = [createTestResult({ outcome: 'flaky' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<property name="outcome" value="flaky" />');
        });
        (0, vitest_1.it)('XML is well-formed with special characters in test names (& < > quotes)', () => {
            const results = [
                createTestResult({
                    title: 'Test with & and <angle> "brackets" & \'quotes\'',
                    file: 'tests/special&chars.spec.ts',
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // Ampersands should be escaped
            (0, vitest_1.expect)(xml).toContain('&amp;');
            // Angle brackets should be escaped
            (0, vitest_1.expect)(xml).toContain('&lt;');
            (0, vitest_1.expect)(xml).toContain('&gt;');
            // Quotes should be escaped
            (0, vitest_1.expect)(xml).toContain('&quot;');
            (0, vitest_1.expect)(xml).toContain('&apos;');
            // Raw unescaped characters should NOT appear in attribute values
            (0, vitest_1.expect)(xml).not.toMatch(/name="[^"]*[<>][^"]*"/);
        });
        (0, vitest_1.it)('error messages with special XML characters are escaped in <failure>', () => {
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'Expected <div class="foo"> to have text & not be empty',
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('&lt;div class=&quot;foo&quot;&gt;');
            (0, vitest_1.expect)(xml).toContain('text &amp; not be empty');
        });
        (0, vitest_1.it)('outputDir parameter is respected', () => {
            const results = [createTestResult()];
            const options = { outputFile: '/default/smart-report.html' };
            const outputPath = (0, junit_exporter_1.exportJunitXml)(results, options, '/custom/output');
            (0, vitest_1.expect)(outputPath).toBe(path.resolve('/custom/output', 'smart-report-junit.xml'));
        });
        (0, vitest_1.it)('uses cwd when no outputFile or outputDir specified', () => {
            const results = [createTestResult()];
            const outputPath = (0, junit_exporter_1.exportJunitXml)(results, {});
            (0, vitest_1.expect)(outputPath).toBe(path.resolve(process.cwd(), 'smart-report-junit.xml'));
        });
        (0, vitest_1.it)('testcase classname replaces slashes with dots and strips spec extension', () => {
            const results = [createTestResult({ file: 'tests/auth/login.spec.ts' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('classname="tests.auth.login"');
        });
        (0, vitest_1.it)('handles empty results array without crashing', () => {
            const outputPath = (0, junit_exporter_1.exportJunitXml)([], {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*tests="0"/);
            (0, vitest_1.expect)(xml).toMatch(/testsuites[^>]*failures="0"/);
            (0, vitest_1.expect)(outputPath).toBeDefined();
        });
        (0, vitest_1.it)('failure message uses first line of error when multi-line', () => {
            const results = [
                createTestResult({
                    status: 'failed',
                    error: 'First line error\nSecond line detail\nThird line stack',
                }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // Message attribute should only have first line
            (0, vitest_1.expect)(xml).toMatch(/message="First line error"/);
            // Body should have full error
            (0, vitest_1.expect)(xml).toContain('Second line detail');
            (0, vitest_1.expect)(xml).toContain('Third line stack');
        });
        (0, vitest_1.it)('failure defaults to "Test failed" message when no error provided', () => {
            const results = [createTestResult({ status: 'failed' })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toMatch(/message="Test failed"/);
        });
        (0, vitest_1.it)('writes XML with utf-8 encoding', () => {
            (0, junit_exporter_1.exportJunitXml)([createTestResult()], {});
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.any(String), 'utf-8');
        });
        (0, vitest_1.it)('testsuite-level counts are correct per spec file', () => {
            const results = [
                createTestResult({ testId: '1', file: 'tests/auth.spec.ts', status: 'passed', duration: 1000 }),
                createTestResult({ testId: '2', file: 'tests/auth.spec.ts', status: 'failed', duration: 2000 }),
                createTestResult({ testId: '3', file: 'tests/auth.spec.ts', status: 'skipped', duration: 0 }),
            ];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            // The auth suite should have: tests=3, failures=1, skipped=1, time=3.000
            (0, vitest_1.expect)(xml).toMatch(/<testsuite name="tests\/auth\.spec\.ts"[^>]*tests="3"/);
            (0, vitest_1.expect)(xml).toMatch(/<testsuite name="tests\/auth\.spec\.ts"[^>]*failures="1"/);
            (0, vitest_1.expect)(xml).toMatch(/<testsuite name="tests\/auth\.spec\.ts"[^>]*skipped="1"/);
        });
        (0, vitest_1.it)('properties block is always present even with no custom properties', () => {
            const results = [createTestResult()];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toContain('<properties>');
            (0, vitest_1.expect)(xml).toContain('</properties>');
        });
        (0, vitest_1.it)('testcase time is in seconds', () => {
            const results = [createTestResult({ duration: 2500 })];
            (0, junit_exporter_1.exportJunitXml)(results, {});
            const xml = mockFs.writeFileSync.mock.calls[0][1];
            (0, vitest_1.expect)(xml).toMatch(/testcase[^>]*time="2\.500"/);
        });
    });
});
