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
const live_writer_1 = require("./live-writer");
vitest_1.vi.mock('fs');
(0, vitest_1.describe)('LiveWriter', () => {
    const mockFs = vitest_1.vi.mocked(fs);
    let writer;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        mockFs.existsSync.mockReturnValue(false);
        writer = new live_writer_1.LiveWriter({ outputFile: '/tmp/live.jsonl' });
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.describe)('start', () => {
        (0, vitest_1.it)('writes a start event with total expected count', () => {
            writer.start(47);
            (0, vitest_1.expect)(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
            const written = mockFs.writeFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.event).toBe('start');
            (0, vitest_1.expect)(event.totalExpected).toBe(47);
            (0, vitest_1.expect)(event.timestamp).toBeDefined();
        });
        (0, vitest_1.it)('includes CI info when provided', () => {
            writer.start(10, { provider: 'github', branch: 'main', commit: 'abc123' });
            const written = mockFs.writeFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.ciInfo).toEqual({ provider: 'github', branch: 'main', commit: 'abc123' });
        });
    });
    (0, vitest_1.describe)('writeTestResult', () => {
        (0, vitest_1.it)('appends a test event with counters', () => {
            writer.start(3);
            mockFs.appendFileSync.mockImplementation(() => { });
            writer.writeTestResult({
                testId: 'file.ts::test1',
                title: 'test1',
                file: 'file.ts',
                status: 'passed',
                duration: 1200,
                retry: 0,
            });
            (0, vitest_1.expect)(mockFs.appendFileSync).toHaveBeenCalledTimes(1);
            const written = mockFs.appendFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.event).toBe('test');
            (0, vitest_1.expect)(event.testId).toBe('file.ts::test1');
            (0, vitest_1.expect)(event.status).toBe('passed');
            (0, vitest_1.expect)(event.counters.passed).toBe(1);
            (0, vitest_1.expect)(event.counters.completed).toBe(1);
            (0, vitest_1.expect)(event.counters.totalExpected).toBe(3);
        });
        (0, vitest_1.it)('tracks retries: updates counters when a retry replaces a failure', () => {
            writer.start(2);
            mockFs.appendFileSync.mockImplementation(() => { });
            writer.writeTestResult({
                testId: 'file.ts::flaky',
                title: 'flaky',
                file: 'file.ts',
                status: 'failed',
                duration: 500,
                retry: 0,
            });
            writer.writeTestResult({
                testId: 'file.ts::flaky',
                title: 'flaky',
                file: 'file.ts',
                status: 'passed',
                duration: 600,
                retry: 1,
            });
            const written = mockFs.appendFileSync.mock.calls[1][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.counters.passed).toBe(0);
            (0, vitest_1.expect)(event.counters.failed).toBe(0);
            (0, vitest_1.expect)(event.counters.flaky).toBe(1);
            (0, vitest_1.expect)(event.counters.completed).toBe(1);
        });
        (0, vitest_1.it)('includes error summary for failed tests (first line only)', () => {
            writer.start(1);
            mockFs.appendFileSync.mockImplementation(() => { });
            writer.writeTestResult({
                testId: 'file.ts::broken',
                title: 'broken',
                file: 'file.ts',
                status: 'failed',
                duration: 300,
                retry: 0,
                error: 'Expected 200, got 500\n    at Object.test (file.ts:10:5)',
            });
            const written = mockFs.appendFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.error).toBe('Expected 200, got 500');
        });
        (0, vitest_1.it)('truncates error to 500 characters', () => {
            writer.start(1);
            mockFs.appendFileSync.mockImplementation(() => { });
            const longError = 'A'.repeat(600);
            writer.writeTestResult({
                testId: 'file.ts::long-error',
                title: 'long-error',
                file: 'file.ts',
                status: 'failed',
                duration: 100,
                retry: 0,
                error: longError,
            });
            const written = mockFs.appendFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.error).toHaveLength(500);
        });
        (0, vitest_1.it)('does not truncate error shorter than 500 characters', () => {
            writer.start(1);
            mockFs.appendFileSync.mockImplementation(() => { });
            const shortError = 'B'.repeat(400);
            writer.writeTestResult({
                testId: 'file.ts::short-error',
                title: 'short-error',
                file: 'file.ts',
                status: 'failed',
                duration: 100,
                retry: 0,
                error: shortError,
            });
            const written = mockFs.appendFileSync.mock.calls[0][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.error).toHaveLength(400);
        });
    });
    (0, vitest_1.describe)('complete', () => {
        (0, vitest_1.it)('appends a complete event with final counters', () => {
            writer.start(1);
            mockFs.appendFileSync.mockImplementation(() => { });
            writer.writeTestResult({
                testId: 'file.ts::t1',
                title: 't1',
                file: 'file.ts',
                status: 'passed',
                duration: 100,
                retry: 0,
            });
            writer.complete(5000);
            (0, vitest_1.expect)(mockFs.appendFileSync).toHaveBeenCalledTimes(2);
            const written = mockFs.appendFileSync.mock.calls[1][1];
            const event = JSON.parse(written.trim());
            (0, vitest_1.expect)(event.event).toBe('complete');
            (0, vitest_1.expect)(event.duration).toBe(5000);
            (0, vitest_1.expect)(event.counters.passed).toBe(1);
        });
    });
    (0, vitest_1.describe)('cleanup', () => {
        (0, vitest_1.it)('removes the output file if it exists', () => {
            mockFs.existsSync.mockReturnValue(true);
            writer.cleanup();
            (0, vitest_1.expect)(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/live.jsonl');
        });
        (0, vitest_1.it)('does nothing if file does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);
            writer.cleanup();
            (0, vitest_1.expect)(mockFs.unlinkSync).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('disabled writer', () => {
        (0, vitest_1.it)('returns a no-op writer when disabled', () => {
            const noop = live_writer_1.LiveWriter.disabled();
            noop.start(10);
            noop.writeTestResult({ testId: 'x', title: 'x', file: 'x', status: 'passed', duration: 0, retry: 0 });
            noop.complete(0);
            noop.cleanup();
            (0, vitest_1.expect)(mockFs.writeFileSync).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockFs.appendFileSync).not.toHaveBeenCalled();
        });
    });
});
