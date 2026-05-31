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
const prompt_builder_1 = require("./prompt-builder");
vitest_1.vi.mock('fs');
const mockFs = vitest_1.vi.mocked(fs);
function makeConfig(rootDir = '/project') {
    return {
        rootDir,
        configFile: '',
        globalSetup: null,
        globalTeardown: null,
        globalTimeout: 0,
        grep: /./,
        grepInvert: null,
        maxFailures: 0,
        metadata: {},
        preserveOutput: 'always',
        projects: [],
        reporter: [],
        reportSlowTests: null,
        quiet: false,
        shard: null,
        updateSnapshots: 'missing',
        version: '1.0.0',
        workers: 1,
        webServer: null,
    };
}
function makeTestCase(overrides = {}) {
    const title = overrides.title ?? 'Test title';
    const titlePath = overrides.titlePath ?? ['Suite', title];
    return {
        title,
        location: {
            file: overrides.file ?? '/project/tests/login.spec.ts',
            line: overrides.line ?? 10,
            column: overrides.column ?? 5,
        },
        titlePath: () => titlePath,
    };
}
function makeTestResult(overrides = {}) {
    return {
        errors: overrides.errors ?? [],
        stdout: overrides.stdout ?? [],
        stderr: overrides.stderr ?? [],
        attachments: overrides.attachments ?? [],
        status: 'failed',
        duration: 1000,
        startTime: new Date(),
        retry: 0,
        parallelIndex: 0,
        workerIndex: 0,
        steps: [],
        annotations: [],
    };
}
/**
 * Creates a TestError. Note: pickCopyPromptErrors removes single-line errors
 * that appear as a substring of any other formatted error (including themselves).
 * To produce a non-empty prompt, errors must be multiline -- provide a stack
 * different from message.
 */
function makeError(overrides = {}) {
    const message = overrides.message ?? 'Expected true to be false';
    return {
        message,
        stack: overrides.stack ?? `${message}\n  at tests/test.spec.ts:10:5`,
        value: overrides.value,
        snippet: overrides.snippet,
        location: overrides.location,
    };
}
(0, vitest_1.describe)('buildPlaywrightStyleAiPrompt', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockFs.existsSync.mockReturnValue(false);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('returns empty string when there are no errors', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({ errors: [] }),
        });
        (0, vitest_1.expect)(result).toBe('');
    });
    (0, vitest_1.it)('builds a prompt with test info and error details', () => {
        const error = makeError({
            message: 'Locator resolved to hidden element',
            stack: 'Locator resolved to hidden element\n  at login.spec.ts:15:3',
        });
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase({ title: 'should login', titlePath: ['Auth', 'Login', 'should login'] }),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result).toContain('# Instructions');
        (0, vitest_1.expect)(result).toContain('Playwright test failed');
        (0, vitest_1.expect)(result).toContain('# Test info');
        (0, vitest_1.expect)(result).toContain('Auth >> Login >> should login');
        (0, vitest_1.expect)(result).toContain('tests/login.spec.ts:10:5');
        (0, vitest_1.expect)(result).toContain('# Error details');
        (0, vitest_1.expect)(result).toContain('Locator resolved to hidden element');
    });
    (0, vitest_1.it)('uses safeRelativePath to show relative file paths', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig('/project'),
            test: makeTestCase({ file: '/project/tests/deep/test.spec.ts' }),
            result: makeTestResult({
                errors: [makeError()],
            }),
        });
        (0, vitest_1.expect)(result).toContain('tests/deep/test.spec.ts');
        (0, vitest_1.expect)(result).not.toContain('/project/tests/deep/test.spec.ts');
    });
    (0, vitest_1.it)('keeps absolute path when file is outside rootDir (path traversal guard)', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig('/project'),
            test: makeTestCase({ file: '/other/repo/test.spec.ts' }),
            result: makeTestResult({
                errors: [makeError()],
            }),
        });
        (0, vitest_1.expect)(result).toContain('/other/repo/test.spec.ts');
    });
    (0, vitest_1.it)('includes stdout when present', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                stdout: ['console output here'],
            }),
        });
        (0, vitest_1.expect)(result).toContain('# Stdout');
        (0, vitest_1.expect)(result).toContain('console output here');
    });
    (0, vitest_1.it)('includes stderr when present', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                stderr: ['error output here'],
            }),
        });
        (0, vitest_1.expect)(result).toContain('# Stderr');
        (0, vitest_1.expect)(result).toContain('error output here');
    });
    (0, vitest_1.it)('does not include stdout/stderr sections when empty', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                stdout: [],
                stderr: [],
            }),
        });
        (0, vitest_1.expect)(result).not.toContain('# Stdout');
        (0, vitest_1.expect)(result).not.toContain('# Stderr');
    });
    (0, vitest_1.it)('strips ANSI codes from error text', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError({
                        message: '\x1b[31mRed error\x1b[0m',
                        stack: '\x1b[31mRed error\x1b[0m\n  at test.ts:1:1',
                    })],
            }),
        });
        (0, vitest_1.expect)(result).toContain('Red error');
        (0, vitest_1.expect)(result).not.toContain('\x1b[31m');
    });
    (0, vitest_1.it)('includes error location in formatted error', () => {
        const error = makeError({
            message: 'Timeout',
            stack: 'Timeout\n  at slow.spec.ts:25:10',
            location: { file: '/project/tests/slow.spec.ts', line: 25, column: 10 },
        });
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result).toContain('at /project/tests/slow.spec.ts:25:10');
    });
    (0, vitest_1.it)('includes error snippet when present', () => {
        const error = makeError({
            message: 'Assertion failed',
            stack: 'Assertion failed\n  at test.spec.ts:5:3',
            snippet: '  expect(value).toBe(true)',
        });
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result).toContain('expect(value).toBe(true)');
    });
    (0, vitest_1.it)('truncates prompt at 200,000 characters', () => {
        const longMessage = 'x'.repeat(250000);
        const error = makeError({
            message: longMessage,
            stack: longMessage + '\n  at test.ts:1:1',
        });
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result.length).toBeLessThanOrEqual(200000 + 20);
        (0, vitest_1.expect)(result).toContain('(truncated)');
    });
    (0, vitest_1.it)('builds code frame from error location', () => {
        mockFs.readFileSync.mockReturnValue('line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7');
        const error = makeError({
            message: 'fail',
            stack: 'fail\n  at test.spec.ts:4:3',
            location: { file: '/project/tests/test.spec.ts', line: 4, column: 3 },
        });
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result).toContain('# Test source');
        (0, vitest_1.expect)(result).toContain('> ');
        (0, vitest_1.expect)(result).toContain('^');
    });
    (0, vitest_1.it)('falls back to test location for code frame when error has no location', () => {
        mockFs.readFileSync.mockReturnValue('line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\nline 10\nline 11\nline 12');
        const error = makeError();
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase({ line: 10, column: 5 }),
            result: makeTestResult({ errors: [error] }),
        });
        (0, vitest_1.expect)(result).toContain('# Test source');
    });
    (0, vitest_1.it)('reads stdout from attachment when present', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                stdout: [],
                attachments: [
                    { name: 'stdout', contentType: 'text/plain', body: Buffer.from('Attached stdout') },
                ],
            }),
        });
        (0, vitest_1.expect)(result).toContain('# Stdout');
        (0, vitest_1.expect)(result).toContain('Attached stdout');
    });
    (0, vitest_1.it)('reads stderr from attachment when present', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                stderr: [],
                attachments: [
                    { name: 'stderr', contentType: 'text/plain', body: Buffer.from('Attached stderr') },
                ],
            }),
        });
        (0, vitest_1.expect)(result).toContain('# Stderr');
        (0, vitest_1.expect)(result).toContain('Attached stderr');
    });
    (0, vitest_1.it)('includes error-context attachment content', () => {
        const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
            config: makeConfig(),
            test: makeTestCase(),
            result: makeTestResult({
                errors: [makeError()],
                attachments: [
                    {
                        name: 'error-context',
                        contentType: 'text/markdown',
                        body: Buffer.from('# Page snapshot\n```yaml\n- button "Login"\n```'),
                    },
                ],
            }),
        });
        (0, vitest_1.expect)(result).toContain('# Page snapshot');
        (0, vitest_1.expect)(result).toContain('button "Login"');
    });
    (0, vitest_1.describe)('pickCopyPromptErrors deduplication', () => {
        (0, vitest_1.it)('keeps multiline errors and filters single-line substrings', () => {
            const error1 = makeError({
                message: 'Expected true',
                stack: undefined,
            });
            const error2 = makeError({
                message: 'Expected true to be false',
                stack: 'Expected true to be false\n  at file.ts:1',
            });
            const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig(),
                test: makeTestCase(),
                result: makeTestResult({ errors: [error1, error2] }),
            });
            // The multiline error survives; the one-liner "Expected true" is a
            // substring of the multiline text so it gets deduplicated away.
            (0, vitest_1.expect)(result).toContain('Expected true to be false');
        });
        (0, vitest_1.it)('removes single-line errors that are substrings of a multiline error', () => {
            // A one-line error that appears as a substring of a multiline error
            // gets deduplicated by pickCopyPromptErrors
            const shortError = {
                message: 'Expected true',
                stack: 'Expected true',
            };
            const longError = makeError({
                message: 'Expected true to be false',
                stack: 'Expected true to be false\n  at tests/test.spec.ts:10:5',
            });
            const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig(),
                test: makeTestCase(),
                result: makeTestResult({ errors: [shortError, longError] }),
            });
            // The multiline error survives; "Expected true" is a substring so it's removed
            (0, vitest_1.expect)(result).toContain('Expected true to be false');
            // Only one error block should appear (the multiline one)
            const errorBlocks = result.split('# Error details')[1];
            const codeBlocks = errorBlocks?.match(/```/g) ?? [];
            // Each error is wrapped in a pair of ```, so 2 = one error
            (0, vitest_1.expect)(codeBlocks.length).toBe(2);
        });
        (0, vitest_1.it)('uses error.value when message is absent', () => {
            const error = makeError({
                message: undefined,
                stack: 'Value-based error\n  at test.ts:1:1',
                value: 'Value-based error',
            });
            const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig(),
                test: makeTestCase(),
                result: makeTestResult({ errors: [error] }),
            });
            (0, vitest_1.expect)(result).toContain('Value-based error');
        });
    });
    (0, vitest_1.describe)('code frame building', () => {
        (0, vitest_1.it)('reads source file and builds frame with line marker', () => {
            const lines = Array.from({ length: 10 }, (_, i) => `const line${i + 1} = ${i + 1};`);
            mockFs.readFileSync.mockReturnValue(lines.join('\n'));
            const error = makeError({
                message: 'fail',
                stack: 'fail\n  at test.spec.ts:5:7',
                location: { file: '/project/tests/test.spec.ts', line: 5, column: 7 },
            });
            const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig(),
                test: makeTestCase(),
                result: makeTestResult({ errors: [error] }),
            });
            (0, vitest_1.expect)(result).toContain('# Test source');
            (0, vitest_1.expect)(result).toMatch(/> \d+ \|/);
            (0, vitest_1.expect)(result).toContain('^');
        });
        (0, vitest_1.it)('handles non-existent source file gracefully', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('ENOENT');
            });
            const error = makeError({
                message: 'fail',
                stack: 'fail\n  at missing.spec.ts:1:1',
                location: { file: '/project/tests/missing.spec.ts', line: 1, column: 1 },
            });
            const result = (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig(),
                test: makeTestCase(),
                result: makeTestResult({ errors: [error] }),
            });
            (0, vitest_1.expect)(result).toContain('# Error details');
            (0, vitest_1.expect)(result).not.toContain('# Test source');
        });
        (0, vitest_1.it)('resolves relative file paths against rootDir', () => {
            mockFs.readFileSync.mockReturnValue('line 1\nline 2\nline 3');
            const error = makeError({
                message: 'fail',
                stack: 'fail\n  at relative.spec.ts:2:1',
                location: { file: 'tests/relative.spec.ts', line: 2, column: 1 },
            });
            (0, prompt_builder_1.buildPlaywrightStyleAiPrompt)({
                config: makeConfig('/project'),
                test: makeTestCase(),
                result: makeTestResult({ errors: [error] }),
            });
            (0, vitest_1.expect)(mockFs.readFileSync).toHaveBeenCalledWith('/project/tests/relative.spec.ts', 'utf-8');
        });
    });
});
