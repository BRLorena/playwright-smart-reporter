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
exports.LiveWriter = void 0;
const fs = __importStar(require("fs"));
class LiveWriter {
    constructor(options) {
        this.totalExpected = 0;
        this.tracked = new Map();
        this.outputFile = options.outputFile;
        this.noop = options.noop ?? false;
    }
    static disabled() {
        return new LiveWriter({ outputFile: '', noop: true });
    }
    getOutputPath() {
        return this.outputFile;
    }
    start(totalExpected, ciInfo) {
        if (this.noop)
            return;
        this.totalExpected = totalExpected;
        this.tracked.clear();
        const event = {
            event: 'start',
            timestamp: new Date().toISOString(),
            totalExpected,
            ...(ciInfo ? { ciInfo } : {}),
        };
        fs.writeFileSync(this.outputFile, JSON.stringify(event) + '\n');
    }
    writeTestResult(input) {
        if (this.noop)
            return;
        const existing = this.tracked.get(input.testId);
        if (existing) {
            this.tracked.set(input.testId, {
                status: input.status,
                retry: input.retry,
                wasRetried: true,
            });
        }
        else {
            this.tracked.set(input.testId, {
                status: input.status,
                retry: input.retry,
                wasRetried: false,
            });
        }
        const counters = this.computeCounters();
        const errorSummary = input.error
            ? input.error.split('\n')[0].slice(0, 500)
            : undefined;
        const event = {
            event: 'test',
            timestamp: new Date().toISOString(),
            testId: input.testId,
            title: input.title,
            file: input.file,
            status: input.status,
            duration: input.duration,
            retry: input.retry,
            counters,
            ...(errorSummary ? { error: errorSummary } : {}),
        };
        fs.appendFileSync(this.outputFile, JSON.stringify(event) + '\n');
    }
    complete(duration) {
        if (this.noop)
            return;
        const event = {
            event: 'complete',
            timestamp: new Date().toISOString(),
            duration,
            counters: this.computeCounters(),
        };
        fs.appendFileSync(this.outputFile, JSON.stringify(event) + '\n');
    }
    cleanup() {
        if (this.noop)
            return;
        if (fs.existsSync(this.outputFile)) {
            fs.unlinkSync(this.outputFile);
        }
    }
    computeCounters() {
        let passed = 0;
        let failed = 0;
        let skipped = 0;
        let flaky = 0;
        for (const [, tracked] of this.tracked) {
            if (tracked.wasRetried && tracked.status === 'passed') {
                flaky++;
            }
            else if (tracked.status === 'passed') {
                passed++;
            }
            else if (tracked.status === 'failed' || tracked.status === 'timedOut' || tracked.status === 'interrupted') {
                failed++;
            }
            else if (tracked.status === 'skipped') {
                skipped++;
            }
        }
        const completed = this.tracked.size;
        return {
            passed,
            failed,
            skipped,
            flaky,
            completed,
            totalExpected: this.totalExpected,
        };
    }
}
exports.LiveWriter = LiveWriter;
