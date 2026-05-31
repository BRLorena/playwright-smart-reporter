"use strict";
/**
 * Premium Pipeline Integration Tests
 *
 * Tests the SmartReporter constructor's license-gating logic:
 * - Community tier: theme/branding stripped, warnings emitted, no Starter features activated
 * - Starter/Pro tier: theme/branding preserved, notifications wired, custom AI model accepted
 * - Team tier: all Starter/Pro features work (Team is a superset of Pro)
 *
 * Strategy: test the constructor and onEnd() in isolation by mocking fs, html-generator,
 * the license module, and the export functions. This lets us verify wiring contracts
 * without running the full Playwright reporter lifecycle.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// ---------------------------------------------------------------------------
// Module-level mocks — hoisted before any imports
// ---------------------------------------------------------------------------
vitest_1.vi.mock('fs', () => {
    const m = {
        existsSync: vitest_1.vi.fn().mockReturnValue(false),
        mkdirSync: vitest_1.vi.fn(),
        writeFileSync: vitest_1.vi.fn(),
        readFileSync: vitest_1.vi.fn().mockReturnValue(JSON.stringify({ runs: [], tests: {}, summaries: [] })),
        copyFileSync: vitest_1.vi.fn(),
        statSync: vitest_1.vi.fn().mockReturnValue({ size: 100 }),
    };
    return { ...m, default: m };
});
vitest_1.vi.mock('./generators/html-generator', () => ({
    generateHtml: vitest_1.vi.fn().mockReturnValue({ html: '<html></html>' }),
}));
vitest_1.vi.mock('./generators/json-exporter', () => ({
    exportJsonData: vitest_1.vi.fn().mockReturnValue('/tmp/smart-report-data.json'),
}));
vitest_1.vi.mock('./generators/junit-exporter', () => ({
    exportJunitXml: vitest_1.vi.fn().mockReturnValue('/tmp/junit.xml'),
}));
vitest_1.vi.mock('./generators/pdf-exporter', () => ({
    exportPdfReport: vitest_1.vi.fn().mockResolvedValue('/tmp/report.pdf'),
}));
vitest_1.vi.mock('./generators/executive-pdf', () => ({
    generateExecutivePdf: vitest_1.vi.fn().mockReturnValue('/tmp/executive.pdf'),
}));
vitest_1.vi.mock('./gates', () => ({
    QualityGateEvaluator: vitest_1.vi.fn().mockImplementation(() => ({
        evaluate: vitest_1.vi.fn().mockReturnValue({ passed: true, rules: [] }),
    })),
    formatGateReport: vitest_1.vi.fn().mockReturnValue(''),
}));
vitest_1.vi.mock('./quarantine', () => ({
    QuarantineGenerator: vitest_1.vi.fn().mockImplementation(() => ({
        generate: vitest_1.vi.fn().mockReturnValue(null),
        getOutputPath: vitest_1.vi.fn().mockReturnValue('/tmp/.smart-quarantine.json'),
    })),
}));
vitest_1.vi.mock('./cloud/uploader', () => ({
    CloudUploader: vitest_1.vi.fn().mockImplementation(() => ({
        isEnabled: vitest_1.vi.fn().mockReturnValue(false),
        upload: vitest_1.vi.fn().mockResolvedValue({ success: false }),
    })),
}));
vitest_1.vi.mock('./notifiers', () => ({
    SlackNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        notify: vitest_1.vi.fn().mockResolvedValue(undefined),
        sendMessage: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
    TeamsNotifier: vitest_1.vi.fn().mockImplementation(() => ({
        notify: vitest_1.vi.fn().mockResolvedValue(undefined),
        sendMessage: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
    NotificationManager: vitest_1.vi.fn().mockImplementation(() => ({
        notify: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
vitest_1.vi.mock('./collectors', () => ({
    HistoryCollector: vitest_1.vi.fn().mockImplementation(() => ({
        loadHistory: vitest_1.vi.fn(),
        getTestHistory: vitest_1.vi.fn().mockReturnValue([]),
        getOptions: vitest_1.vi.fn().mockReturnValue({}),
        getBaselineRun: vitest_1.vi.fn().mockReturnValue(undefined),
        getHistory: vitest_1.vi.fn().mockReturnValue({ runs: [], tests: {}, summaries: [], runFiles: {} }),
        getCurrentRun: vitest_1.vi.fn().mockReturnValue({ runId: 'run-1', timestamp: new Date().toISOString() }),
        updateHistory: vitest_1.vi.fn(),
    })),
    StepCollector: vitest_1.vi.fn().mockImplementation(() => ({
        extractSteps: vitest_1.vi.fn().mockReturnValue([]),
    })),
    AttachmentCollector: vitest_1.vi.fn().mockImplementation(() => ({
        collectAttachments: vitest_1.vi.fn().mockReturnValue({ screenshots: [], videos: [], traces: [], custom: [] }),
    })),
    NetworkCollector: vitest_1.vi.fn().mockImplementation(() => ({
        collectFromTrace: vitest_1.vi.fn().mockResolvedValue({ entries: [] }),
    })),
}));
vitest_1.vi.mock('./analyzers', () => ({
    FlakinessAnalyzer: vitest_1.vi.fn().mockImplementation(() => ({ analyze: vitest_1.vi.fn() })),
    PerformanceAnalyzer: vitest_1.vi.fn().mockImplementation(() => ({ analyze: vitest_1.vi.fn() })),
    RetryAnalyzer: vitest_1.vi.fn().mockImplementation(() => ({ analyze: vitest_1.vi.fn() })),
    FailureClusterer: vitest_1.vi.fn().mockImplementation(() => ({ clusterFailures: vitest_1.vi.fn().mockReturnValue([]) })),
    StabilityScorer: vitest_1.vi.fn().mockImplementation(() => ({ scoreTest: vitest_1.vi.fn() })),
    AIAnalyzer: vitest_1.vi.fn().mockImplementation(() => ({
        analyzeFailed: vitest_1.vi.fn().mockResolvedValue(undefined),
        analyzeClusters: vitest_1.vi.fn().mockResolvedValue(undefined),
        analyzeSuiteHealth: vitest_1.vi.fn().mockResolvedValue(undefined),
    })),
}));
// ---------------------------------------------------------------------------
// Mock the license module so premium-integration tests control tier directly
// without needing real JWT signatures (license validation is tested elsewhere)
// ---------------------------------------------------------------------------
const mockValidate = vitest_1.vi.fn();
const mockHasFeature = vitest_1.vi.fn();
vitest_1.vi.mock('./license', () => ({
    LicenseValidator: vitest_1.vi.fn().mockImplementation(() => ({
        validate: mockValidate,
    })),
}));
// Attach hasFeature as a static method on the mocked constructor
const license_1 = require("./license");
license_1.LicenseValidator.hasFeature = mockHasFeature;
// ---------------------------------------------------------------------------
// Minimal fake Playwright lifecycle objects
// ---------------------------------------------------------------------------
const fakeConfig = {
    rootDir: '/tmp',
    configFile: '/tmp/playwright.config.ts',
    projects: [],
    forbidOnly: false,
    fullyParallel: false,
    globalSetup: null,
    globalTeardown: null,
    globalTimeout: 0,
    grep: /.*/,
    grepInvert: null,
    maxFailures: 0,
    metadata: {},
    preserveOutput: 'always',
    reporter: [],
    reportSlowTests: null,
    quiet: false,
    shard: null,
    updateSnapshots: 'missing',
    version: '1.40.0',
    workers: 1,
    webServer: null,
};
const fakeSuite = { allTests: () => [] };
const fakeFullResult = { status: 'passed', startTime: new Date(), duration: 1000 };
// ---------------------------------------------------------------------------
// Import modules after mocks are registered
// ---------------------------------------------------------------------------
const smart_reporter_1 = __importDefault(require("./smart-reporter"));
const json_exporter_1 = require("./generators/json-exporter");
const junit_exporter_1 = require("./generators/junit-exporter");
const pdf_exporter_1 = require("./generators/pdf-exporter");
const executive_pdf_1 = require("./generators/executive-pdf");
const html_generator_1 = require("./generators/html-generator");
const notifiers_1 = require("./notifiers");
const analyzers_1 = require("./analyzers");
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, vitest_1.describe)('Premium Pipeline Integration', () => {
    let originalEnv;
    (0, vitest_1.beforeEach)(() => {
        originalEnv = { ...process.env };
        delete process.env.SMART_REPORTER_LICENSE_KEY;
        // Default to community tier — overridden in pro/team describe blocks
        mockValidate.mockReturnValue({ tier: 'community', valid: true });
        mockHasFeature.mockImplementation((_license, requiredTier) => {
            if (requiredTier === 'community')
                return true;
            return false;
        });
        // Clear call counts only — do NOT reset implementations set by vi.mock() factories
        vitest_1.vi.mocked(json_exporter_1.exportJsonData).mockClear();
        vitest_1.vi.mocked(junit_exporter_1.exportJunitXml).mockClear();
        vitest_1.vi.mocked(pdf_exporter_1.exportPdfReport).mockClear();
        vitest_1.vi.mocked(executive_pdf_1.generateExecutivePdf).mockClear();
        vitest_1.vi.mocked(html_generator_1.generateHtml).mockClear();
        vitest_1.vi.mocked(notifiers_1.NotificationManager).mockClear();
        vitest_1.vi.mocked(analyzers_1.AIAnalyzer).mockClear();
    });
    (0, vitest_1.afterEach)(() => {
        process.env = originalEnv;
        // Do NOT use vi.restoreAllMocks() — in Vitest 2.x it resets vi.fn() implementations
        // inside vi.mock() factory objects, breaking subsequent tests.
        // Instead, spies on console are set up per-test with mockImplementation and
        // will be cleaned up individually.
    });
    // =========================================================================
    // Community tier
    // =========================================================================
    (0, vitest_1.describe)('community tier (no license key)', () => {
        (0, vitest_1.it)('strips theme from options and emits a console warning', () => {
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const opts = {
                theme: { preset: 'dark', primary: '#ff0000' },
            };
            new smart_reporter_1.default(opts);
            (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Custom themes require a Starter or Pro license'));
        });
        (0, vitest_1.it)('strips branding from options and emits a console warning', () => {
            const warnSpy = vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const opts = {
                branding: { title: 'Acme Corp', logo: 'https://acme.com/logo.png' },
            };
            new smart_reporter_1.default(opts);
            (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith(vitest_1.expect.stringContaining('Custom branding requires a Starter or Pro license'));
        });
        (0, vitest_1.it)('does NOT call exportJsonData even when exportJson: true', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportJson: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(json_exporter_1.exportJsonData).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does NOT call exportJunitXml even when exportJunit: true', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportJunit: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(junit_exporter_1.exportJunitXml).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does NOT call exportPdfReport even when exportPdf: true', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportPdf: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(pdf_exporter_1.exportPdfReport).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('does NOT instantiate NotificationManager even when notifications configured', () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            new smart_reporter_1.default({
                notifications: [{ channel: 'slack', config: { webhookUrl: 'https://example.com' } }],
            });
            (0, vitest_1.expect)(notifiers_1.NotificationManager).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls AIAnalyzer with provider options', () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            new smart_reporter_1.default({});
            (0, vitest_1.expect)(analyzers_1.AIAnalyzer).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ aiProvider: undefined }));
        });
        (0, vitest_1.it)('emits upsell message at the end for community tier', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const logSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({});
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const logCalls = logSpy.mock.calls.map(c => String(c[0]));
            (0, vitest_1.expect)(logCalls.some(m => m.includes('Starter features available'))).toBe(true);
        });
        (0, vitest_1.it)('theme config is absent from generateHtml call (stripped at construction time)', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ theme: { preset: 'dark' } });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(vitest_1.vi.mocked(html_generator_1.generateHtml)).toHaveBeenCalled();
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.theme).toBeUndefined();
        });
        (0, vitest_1.it)('branding config is absent from generateHtml call (stripped at construction time)', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ branding: { title: 'Acme' } });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.branding).toBeUndefined();
        });
    });
    // =========================================================================
    // Pro tier (mocked license)
    // =========================================================================
    (0, vitest_1.describe)('pro tier (mocked license)', () => {
        (0, vitest_1.beforeEach)(() => {
            mockValidate.mockReturnValue({ tier: 'pro', valid: true, org: 'Test Org' });
            mockHasFeature.mockImplementation((_license, requiredTier) => {
                if (requiredTier === 'community')
                    return true;
                if (requiredTier === 'pro')
                    return true;
                return false;
            });
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
        });
        (0, vitest_1.it)('calls exportJsonData when exportJson: true', async () => {
            const reporter = new smart_reporter_1.default({ exportJson: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(json_exporter_1.exportJsonData).toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls exportJunitXml when exportJunit: true', async () => {
            const reporter = new smart_reporter_1.default({ exportJunit: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(junit_exporter_1.exportJunitXml).toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls generateExecutivePdf when exportPdf: true (default)', async () => {
            const reporter = new smart_reporter_1.default({ exportPdf: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(executive_pdf_1.generateExecutivePdf).toHaveBeenCalled();
            (0, vitest_1.expect)(pdf_exporter_1.exportPdfReport).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls exportPdfReport when exportPdf: true and exportPdfFull: true', async () => {
            const reporter = new smart_reporter_1.default({ exportPdf: true, exportPdfFull: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(pdf_exporter_1.exportPdfReport).toHaveBeenCalled();
            (0, vitest_1.expect)(executive_pdf_1.generateExecutivePdf).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('preserves theme config — passed through to generateHtml', async () => {
            const theme = { preset: 'dark', primary: '#336699' };
            const reporter = new smart_reporter_1.default({ theme });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.theme).toEqual(theme);
        });
        (0, vitest_1.it)('preserves branding config — passed through to generateHtml', async () => {
            const branding = { title: 'My Co', footer: 'footer text' };
            const reporter = new smart_reporter_1.default({ branding });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.branding).toEqual(branding);
        });
        (0, vitest_1.it)('instantiates NotificationManager when notifications configured', () => {
            new smart_reporter_1.default({
                notifications: [{ channel: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' } }],
            });
            (0, vitest_1.expect)(notifiers_1.NotificationManager).toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls AIAnalyzer with provider options (pro tier)', () => {
            new smart_reporter_1.default({ licenseKey: 'test-key' });
            (0, vitest_1.expect)(analyzers_1.AIAnalyzer).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ aiProvider: undefined }));
        });
        (0, vitest_1.it)('does NOT emit upsell message for pro tier', async () => {
            const logSpy = vitest_1.vi.mocked(console.log);
            const reporter = new smart_reporter_1.default({});
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const logCalls = logSpy.mock.calls.map(c => String(c[0]));
            (0, vitest_1.expect)(logCalls.some(m => m.includes('Starter features available'))).toBe(false);
        });
    });
    // =========================================================================
    // Team tier (superset of Pro)
    // =========================================================================
    (0, vitest_1.describe)('team tier (mocked license)', () => {
        (0, vitest_1.beforeEach)(() => {
            mockValidate.mockReturnValue({ tier: 'team', valid: true, org: 'Team Org' });
            mockHasFeature.mockImplementation((_license, requiredTier) => {
                if (requiredTier === 'community')
                    return true;
                if (requiredTier === 'pro')
                    return true;
                if (requiredTier === 'team')
                    return true;
                return false;
            });
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
        });
        (0, vitest_1.it)('calls exportJsonData (Team includes Starter features)', async () => {
            const reporter = new smart_reporter_1.default({ exportJson: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(json_exporter_1.exportJsonData).toHaveBeenCalled();
        });
        (0, vitest_1.it)('calls exportJunitXml (Team includes Starter features)', async () => {
            const reporter = new smart_reporter_1.default({ exportJunit: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            (0, vitest_1.expect)(junit_exporter_1.exportJunitXml).toHaveBeenCalled();
        });
        (0, vitest_1.it)('preserves theme config for team tier', async () => {
            const theme = { preset: 'high-contrast' };
            const reporter = new smart_reporter_1.default({ theme });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.theme).toEqual(theme);
        });
        (0, vitest_1.it)('preserves branding config for team tier', async () => {
            const branding = { title: 'Enterprise Suite', hidePoweredBy: true };
            const reporter = new smart_reporter_1.default({ branding });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const callArg = vitest_1.vi.mocked(html_generator_1.generateHtml).mock.calls[0]?.[0];
            (0, vitest_1.expect)(callArg?.options?.branding).toEqual(branding);
        });
        (0, vitest_1.it)('calls AIAnalyzer with provider options (team tier)', () => {
            new smart_reporter_1.default({});
            (0, vitest_1.expect)(analyzers_1.AIAnalyzer).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ aiProvider: undefined }));
        });
    });
    // =========================================================================
    // Export gating console messages (community tier)
    // =========================================================================
    (0, vitest_1.describe)('export gating messages (community tier)', () => {
        (0, vitest_1.it)('logs JSON export upsell message when exportJson requested without license', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const logSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportJson: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const logCalls = logSpy.mock.calls.map(c => String(c[0]));
            (0, vitest_1.expect)(logCalls.some(m => m.includes('JSON export requires a Starter or Pro license'))).toBe(true);
        });
        (0, vitest_1.it)('logs JUnit export upsell message when exportJunit requested without license', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const logSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportJunit: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const logCalls = logSpy.mock.calls.map(c => String(c[0]));
            (0, vitest_1.expect)(logCalls.some(m => m.includes('JUnit export requires a Starter or Pro license'))).toBe(true);
        });
        (0, vitest_1.it)('logs PDF export upsell message when exportPdf requested without license', async () => {
            vitest_1.vi.spyOn(console, 'warn').mockImplementation(() => { });
            const logSpy = vitest_1.vi.spyOn(console, 'log').mockImplementation(() => { });
            const reporter = new smart_reporter_1.default({ exportPdf: true });
            reporter.onBegin(fakeConfig, fakeSuite);
            await reporter.onEnd(fakeFullResult);
            const logCalls = logSpy.mock.calls.map(c => String(c[0]));
            (0, vitest_1.expect)(logCalls.some(m => m.includes('PDF export requires a Starter or Pro license'))).toBe(true);
        });
    });
});
