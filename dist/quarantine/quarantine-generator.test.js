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
const quarantine_generator_1 = require("./quarantine-generator");
const quarantine_helper_1 = require("./quarantine-helper");
vitest_1.vi.mock('fs');
const mockFs = vitest_1.vi.mocked(fs);
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
(0, vitest_1.describe)('QuarantineGenerator', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('generate', () => {
        (0, vitest_1.it)('quarantines tests with flakinessScore above threshold', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.3 });
            const results = [
                createTestResult({ testId: 'flaky-1', title: 'Flaky test', flakinessScore: 0.5 }),
                createTestResult({ testId: 'stable-1', title: 'Stable test', flakinessScore: 0.1 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result.entries).toHaveLength(1);
            (0, vitest_1.expect)(result.entries[0].testId).toBe('flaky-1');
        });
        (0, vitest_1.it)('excludes tests below threshold', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.3 });
            const results = [
                createTestResult({ testId: 'low', flakinessScore: 0.1 }),
                createTestResult({ testId: 'medium', flakinessScore: 0.2 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('applies default threshold of 0.3 when not specified', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({ testId: 'above', flakinessScore: 0.3 }),
                createTestResult({ testId: 'below', flakinessScore: 0.29 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result.entries).toHaveLength(1);
            (0, vitest_1.expect)(result.entries[0].testId).toBe('above');
            (0, vitest_1.expect)(result.threshold).toBe(0.3);
        });
        (0, vitest_1.it)('respects custom threshold', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.5 });
            const results = [
                createTestResult({ testId: 't1', flakinessScore: 0.6 }),
                createTestResult({ testId: 't2', flakinessScore: 0.5 }),
                createTestResult({ testId: 't3', flakinessScore: 0.4 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(2);
            (0, vitest_1.expect)(result.entries.map(e => e.testId)).toEqual(['t1', 't2']);
        });
        (0, vitest_1.it)('caps entries at maxQuarantined', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, maxQuarantined: 2 });
            const results = [
                createTestResult({ testId: 'low', flakinessScore: 0.4 }),
                createTestResult({ testId: 'high', flakinessScore: 0.9 }),
                createTestResult({ testId: 'mid', flakinessScore: 0.6 }),
                createTestResult({ testId: 'mid2', flakinessScore: 0.5 }),
                createTestResult({ testId: 'highest', flakinessScore: 0.95 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(2);
            (0, vitest_1.expect)(result.entries.map(e => e.testId)).toEqual(['highest', 'high']);
        });
        (0, vitest_1.it)('sorts by flakinessScore descending', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({ testId: 'low', flakinessScore: 0.4 }),
                createTestResult({ testId: 'high', flakinessScore: 0.9 }),
                createTestResult({ testId: 'mid', flakinessScore: 0.6 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries.map(e => e.testId)).toEqual(['high', 'mid', 'low']);
            (0, vitest_1.expect)(result.entries.map(e => e.flakinessScore)).toEqual([0.9, 0.6, 0.4]);
        });
        (0, vitest_1.it)('returns null for empty results array', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const result = generator.generate([], '/output');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('returns null when all tests are below threshold', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.5 });
            const results = [
                createTestResult({ flakinessScore: 0.1 }),
                createTestResult({ flakinessScore: 0.2 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('excludes skipped tests', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({ testId: 'skipped-flaky', flakinessScore: 0.8, outcome: 'skipped' }),
                createTestResult({ testId: 'active-flaky', flakinessScore: 0.7, outcome: 'flaky' }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(1);
            (0, vitest_1.expect)(result.entries[0].testId).toBe('active-flaky');
        });
        (0, vitest_1.it)('excludes skipped tests even when they have high flakiness', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({ testId: 's1', flakinessScore: 1.0, outcome: 'skipped' }),
                createTestResult({ testId: 's2', flakinessScore: 0.9, outcome: 'skipped' }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('writes file to outputDir with default filename', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [createTestResult({ flakinessScore: 0.5 })];
            generator.generate(results, '/my/output/dir');
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledOnce();
            const writtenPath = mockFs.writeFileSync.mock.calls[0][0];
            (0, vitest_1.expect)(writtenPath).toBe(path.resolve('/my/output/dir', '.smart-quarantine.json'));
        });
        (0, vitest_1.it)('writes file with custom outputFile name', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, outputFile: 'quarantine.json' });
            const results = [createTestResult({ flakinessScore: 0.5 })];
            generator.generate(results, '/output');
            const writtenPath = mockFs.writeFileSync.mock.calls[0][0];
            (0, vitest_1.expect)(writtenPath).toBe(path.resolve('/output', 'quarantine.json'));
        });
        (0, vitest_1.it)('writes valid JSON content to the file', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [createTestResult({ testId: 'x', flakinessScore: 0.5 })];
            generator.generate(results, '/output');
            const writtenContent = mockFs.writeFileSync.mock.calls[0][1];
            const parsed = JSON.parse(writtenContent);
            (0, vitest_1.expect)(parsed.generatedAt).toBeDefined();
            (0, vitest_1.expect)(parsed.threshold).toBe(0.3);
            (0, vitest_1.expect)(parsed.entries).toHaveLength(1);
        });
        (0, vitest_1.it)('does not write file when no tests qualify', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            generator.generate([], '/output');
            (0, vitest_1.expect)(mockFs.writeFileSync).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('quarantine entry has correct fields', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({
                    testId: 'abc-123',
                    title: 'Login flow',
                    file: 'tests/login.spec.ts',
                    flakinessScore: 0.75,
                }),
            ];
            const result = generator.generate(results, '/output');
            const entry = result.entries[0];
            (0, vitest_1.expect)(entry.testId).toBe('abc-123');
            (0, vitest_1.expect)(entry.title).toBe('Login flow');
            (0, vitest_1.expect)(entry.file).toBe('tests/login.spec.ts');
            (0, vitest_1.expect)(entry.flakinessScore).toBe(0.75);
            (0, vitest_1.expect)(entry.quarantinedAt).toBeDefined();
            (0, vitest_1.expect)(new Date(entry.quarantinedAt).toISOString()).toBe(entry.quarantinedAt);
        });
        (0, vitest_1.it)('generatedAt is a valid ISO timestamp', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [createTestResult({ flakinessScore: 0.5 })];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
        });
        (0, vitest_1.it)('threshold in output matches config threshold', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.7 });
            const results = [createTestResult({ flakinessScore: 0.8 })];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.threshold).toBe(0.7);
        });
        (0, vitest_1.it)('includes tests at exactly the threshold boundary', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, threshold: 0.3 });
            const results = [
                createTestResult({ testId: 'exact', flakinessScore: 0.3 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(1);
            (0, vitest_1.expect)(result.entries[0].testId).toBe('exact');
        });
        (0, vitest_1.it)('excludes results without flakinessScore', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = [
                createTestResult({ testId: 'no-score' }),
                createTestResult({ testId: 'has-score', flakinessScore: 0.8 }),
                createTestResult({ testId: 'undefined-score', flakinessScore: undefined }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(1);
            (0, vitest_1.expect)(result.entries[0].testId).toBe('has-score');
        });
        (0, vitest_1.it)('caps entries at default maxQuarantined of 50', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const results = Array.from({ length: 60 }, (_, i) => createTestResult({ testId: `test-${i}`, flakinessScore: 0.5 + (i * 0.001) }));
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(50);
        });
        (0, vitest_1.it)('maxQuarantined takes highest flakiness scores when capping', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, maxQuarantined: 2 });
            const results = [
                createTestResult({ testId: 'low', flakinessScore: 0.4 }),
                createTestResult({ testId: 'high', flakinessScore: 0.9 }),
                createTestResult({ testId: 'mid', flakinessScore: 0.6 }),
            ];
            const result = generator.generate(results, '/output');
            (0, vitest_1.expect)(result.entries).toHaveLength(2);
            (0, vitest_1.expect)(result.entries.map(e => e.testId)).toEqual(['high', 'mid']);
        });
    });
    (0, vitest_1.describe)('getOutputPath', () => {
        (0, vitest_1.it)('returns resolved path with default filename', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true });
            const result = generator.getOutputPath('/my/dir');
            (0, vitest_1.expect)(result).toBe(path.resolve('/my/dir', '.smart-quarantine.json'));
        });
        (0, vitest_1.it)('returns resolved path with custom filename', () => {
            const generator = new quarantine_generator_1.QuarantineGenerator({ enabled: true, outputFile: 'custom.json' });
            const result = generator.getOutputPath('/output');
            (0, vitest_1.expect)(result).toBe(path.resolve('/output', 'custom.json'));
        });
    });
});
(0, vitest_1.describe)('getQuarantinedPattern', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('returns undefined when file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);
        const result = (0, quarantine_helper_1.getQuarantinedPattern)('/nonexistent/path.json');
        (0, vitest_1.expect)(result).toBeUndefined();
    });
    (0, vitest_1.it)('uses default file path when none provided', () => {
        mockFs.existsSync.mockReturnValue(false);
        (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(mockFs.existsSync).toHaveBeenCalledWith('.smart-quarantine.json');
    });
    (0, vitest_1.it)('returns undefined when file has no entries', () => {
        const quarantineData = {
            generatedAt: new Date().toISOString(),
            threshold: 0.3,
            entries: [],
        };
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(quarantineData));
        const result = (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(result).toBeUndefined();
    });
    (0, vitest_1.it)('returns regex matching test titles', () => {
        const quarantineData = {
            generatedAt: new Date().toISOString(),
            threshold: 0.3,
            entries: [
                { testId: 't1', title: 'Login test', file: 'a.spec.ts', flakinessScore: 0.5, quarantinedAt: new Date().toISOString() },
            ],
        };
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(quarantineData));
        const result = (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(result).toBeInstanceOf(RegExp);
        (0, vitest_1.expect)(result.test('Login test')).toBe(true);
        (0, vitest_1.expect)(result.test('Other test')).toBe(false);
    });
    (0, vitest_1.it)('escapes regex special characters in titles', () => {
        const quarantineData = {
            generatedAt: new Date().toISOString(),
            threshold: 0.3,
            entries: [
                { testId: 't1', title: 'Test (with) [brackets] and .dots', file: 'a.spec.ts', flakinessScore: 0.5, quarantinedAt: new Date().toISOString() },
            ],
        };
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(quarantineData));
        const result = (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(result).toBeInstanceOf(RegExp);
        (0, vitest_1.expect)(result.test('Test (with) [brackets] and .dots')).toBe(true);
        (0, vitest_1.expect)(result.test('Test with brackets and xdots')).toBe(false);
    });
    (0, vitest_1.it)('handles multiple entries with OR pattern', () => {
        const quarantineData = {
            generatedAt: new Date().toISOString(),
            threshold: 0.3,
            entries: [
                { testId: 't1', title: 'Login test', file: 'a.spec.ts', flakinessScore: 0.8, quarantinedAt: new Date().toISOString() },
                { testId: 't2', title: 'Checkout flow', file: 'b.spec.ts', flakinessScore: 0.6, quarantinedAt: new Date().toISOString() },
                { testId: 't3', title: 'Search feature', file: 'c.spec.ts', flakinessScore: 0.4, quarantinedAt: new Date().toISOString() },
            ],
        };
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(quarantineData));
        const result = (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(result).toBeInstanceOf(RegExp);
        (0, vitest_1.expect)(result.test('Login test')).toBe(true);
        (0, vitest_1.expect)(result.test('Checkout flow')).toBe(true);
        (0, vitest_1.expect)(result.test('Search feature')).toBe(true);
        (0, vitest_1.expect)(result.test('Unknown test')).toBe(false);
    });
    (0, vitest_1.it)('uses custom file path when provided', () => {
        mockFs.existsSync.mockReturnValue(false);
        (0, quarantine_helper_1.getQuarantinedPattern)('/custom/quarantine.json');
        (0, vitest_1.expect)(mockFs.existsSync).toHaveBeenCalledWith('/custom/quarantine.json');
    });
    (0, vitest_1.it)('handles titles with pipe characters correctly', () => {
        const quarantineData = {
            generatedAt: new Date().toISOString(),
            threshold: 0.3,
            entries: [
                { testId: 't1', title: 'Test | with pipe', file: 'a.spec.ts', flakinessScore: 0.5, quarantinedAt: new Date().toISOString() },
            ],
        };
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(quarantineData));
        const result = (0, quarantine_helper_1.getQuarantinedPattern)();
        (0, vitest_1.expect)(result).toBeInstanceOf(RegExp);
        (0, vitest_1.expect)(result.test('Test | with pipe')).toBe(true);
    });
});
