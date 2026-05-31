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
exports.HistoryCollector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const sanitizers_1 = require("../utils/sanitizers");
/**
 * Manages test history persistence and retrieval
 */
class HistoryCollector {
    constructor(options, outputDir) {
        this.history = { runs: [], tests: {}, summaries: [] };
        // Issue #21: Support {project} placeholder in historyFile path
        let historyFile = options.historyFile ?? 'test-history.json';
        if (options.projectName) {
            // Replace {project} placeholder with actual project name
            historyFile = historyFile.replace('{project}', options.projectName);
            // If no placeholder was used but projectName is set, prepend project name
            if (!options.historyFile?.includes('{project}')) {
                const ext = path.extname(historyFile);
                const base = path.basename(historyFile, ext);
                const dir = path.dirname(historyFile);
                historyFile = path.join(dir, `${base}-${options.projectName}${ext}`);
            }
        }
        this.options = {
            outputFile: options.outputFile ?? 'smart-report.html',
            historyFile,
            maxHistoryRuns: options.maxHistoryRuns ?? 10,
            performanceThreshold: options.performanceThreshold ?? 0.2,
            enableRetryAnalysis: options.enableRetryAnalysis ?? true,
            enableFailureClustering: options.enableFailureClustering ?? true,
            enableStabilityScore: options.enableStabilityScore ?? true,
            enableGalleryView: options.enableGalleryView ?? true,
            enableComparison: options.enableComparison ?? true,
            enableAIRecommendations: options.enableAIRecommendations ?? true,
            enableAISuiteHealth: options.enableAISuiteHealth ?? true,
            enableTrendsView: options.enableTrendsView ?? true,
            enableTraceViewer: options.enableTraceViewer ?? true,
            enableHistoryDrilldown: options.enableHistoryDrilldown ?? false,
            stabilityThreshold: options.stabilityThreshold ?? 70,
            retryFailureThreshold: options.retryFailureThreshold ?? 3,
            cspSafe: options.cspSafe ?? false,
            enableNetworkLogs: options.enableNetworkLogs ?? true,
            networkLogFilter: options.networkLogFilter ?? undefined,
            networkLogExcludeAssets: options.networkLogExcludeAssets ?? true,
            networkLogMaxEntries: options.networkLogMaxEntries ?? 50,
            slackWebhook: options.slackWebhook,
            teamsWebhook: options.teamsWebhook,
            baselineRunId: options.baselineRunId,
            // Cloud options
            apiKey: options.apiKey,
            projectId: options.projectId,
            uploadToCloud: options.uploadToCloud ?? false,
            cloudEndpoint: options.cloudEndpoint,
            uploadArtifacts: options.uploadArtifacts ?? true,
            // Issue #21: Store project name for reference
            projectName: options.projectName,
            // Issue #22: Step filtering
            filterPwApiSteps: options.filterPwApiSteps ?? false,
            // Issue #20: Path resolution
            relativeToCwd: options.relativeToCwd ?? false,
            // Issue #26: External run ID (sanitized for safe use in filenames and HTML)
            runId: options.runId ? (0, sanitizers_1.sanitizeFilename)(options.runId.trim(), 100) : undefined,
            // Premium options (pass through for reference)
            licenseKey: options.licenseKey,
            exportJson: options.exportJson,
            exportPdf: options.exportPdf,
            exportJunit: options.exportJunit,
            theme: options.theme,
            notifications: options.notifications,
            branding: options.branding,
            qualityGates: options.qualityGates,
            quarantine: options.quarantine,
            live: options.live,
            exportPdfFull: options.exportPdfFull,
        };
        this.outputDir = outputDir;
        this.currentRun = {
            runId: `run-${this.options.runId ?? Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        this.startTime = Date.now();
    }
    /**
     * Load test history from disk
     */
    loadHistory() {
        const historyPath = path.resolve(this.outputDir, this.options.historyFile);
        if (fs.existsSync(historyPath)) {
            try {
                const loaded = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
                // Support both old and new format
                if (loaded.tests) {
                    // New format
                    this.history = loaded;
                }
                else {
                    // Old format: convert to new format
                    this.history = { runs: [], tests: loaded, summaries: [] };
                }
                // Ensure summaries array exists
                if (!this.history.summaries) {
                    this.history.summaries = [];
                }
                if (!this.history.runs) {
                    this.history.runs = [];
                }
                if (!this.history.runFiles) {
                    this.history.runFiles = {};
                }
            }
            catch (err) {
                console.warn('Failed to load history:', err);
                this.history = { runs: [], tests: {}, summaries: [] };
            }
        }
    }
    /**
     * Update history with test results
     */
    updateHistory(results) {
        const timestamp = new Date().toISOString();
        const runId = this.currentRun.runId;
        for (const result of results) {
            if (!this.history.tests[result.testId]) {
                this.history.tests[result.testId] = [];
            }
            this.history.tests[result.testId].push({
                passed: result.status === 'passed' || result.outcome === 'expected' || result.outcome === 'flaky',
                duration: result.duration,
                timestamp,
                ...(this.options.enableHistoryDrilldown ? { runId } : {}),
                skipped: result.status === 'skipped',
                retry: result.retry, // NEW: Track retry count
            });
            // Keep only last N runs
            if (this.history.tests[result.testId].length > this.options.maxHistoryRuns) {
                this.history.tests[result.testId] = this.history.tests[result.testId].slice(-this.options.maxHistoryRuns);
            }
        }
        // Add run summary
        const passed = results.filter(r => r.status === 'passed' ||
            r.outcome === 'expected' ||
            r.outcome === 'flaky').length;
        const failed = results.filter(r => (r.status === 'failed' || r.status === 'timedOut') &&
            r.outcome !== 'expected' && r.outcome !== 'flaky').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const flaky = results.filter(r => r.outcome === 'flaky').length;
        const slow = results.filter(r => r.performanceTrend?.startsWith('↑')).length;
        const total = results.length;
        const duration = Date.now() - this.startTime;
        const summary = {
            runId: this.currentRun.runId,
            timestamp: this.currentRun.timestamp,
            total,
            passed,
            failed,
            skipped,
            flaky,
            slow,
            duration,
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        };
        this.history.summaries.push(summary);
        // Keep only last N summaries
        if (this.history.summaries.length > this.options.maxHistoryRuns) {
            this.history.summaries = this.history.summaries.slice(-this.options.maxHistoryRuns);
        }
        if (this.options.enableHistoryDrilldown) {
            this.history.runs.push({ ...this.currentRun });
            if (this.history.runs.length > this.options.maxHistoryRuns) {
                this.history.runs = this.history.runs.slice(-this.options.maxHistoryRuns);
            }
            const historyPath = path.resolve(this.outputDir, this.options.historyFile);
            const historyDir = path.dirname(historyPath);
            const runsDir = path.join(historyDir, 'history-runs');
            if (!fs.existsSync(runsDir)) {
                fs.mkdirSync(runsDir, { recursive: true });
            }
            const snapshots = {};
            for (const result of results) {
                const screenshots = result.attachments?.screenshots?.filter(s => !s.startsWith('data:')) ?? [];
                const videos = result.attachments?.videos ?? [];
                const traces = result.attachments?.traces ?? [];
                const custom = result.attachments?.custom ?? [];
                const hasAttachments = screenshots.length > 0 || videos.length > 0 || traces.length > 0 || custom.length > 0;
                const attachments = hasAttachments
                    ? { screenshots, videos, traces, custom }
                    : undefined;
                snapshots[result.testId] = {
                    testId: result.testId,
                    title: result.title,
                    file: result.file,
                    status: result.status,
                    duration: result.duration,
                    retry: result.retry,
                    error: result.error,
                    steps: result.steps ?? [],
                    aiSuggestion: result.aiSuggestion,
                    aiSuggestionHtml: result.aiSuggestion ? (0, utils_1.renderMarkdownLite)(result.aiSuggestion) : undefined,
                    attachments,
                };
            }
            const runFile = {
                runId,
                timestamp: this.currentRun.timestamp,
                tests: snapshots,
            };
            const runFileName = `${runId}.json`;
            const runFilePath = path.join(runsDir, runFileName);
            fs.writeFileSync(runFilePath, JSON.stringify(runFile, null, 2));
            if (!this.history.runFiles)
                this.history.runFiles = {};
            this.history.runFiles[runId] = `./history-runs/${runFileName}`;
            // Prune old run files
            const keepRunIds = new Set(this.history.runs.map(r => r.runId));
            for (const existingRunId of Object.keys(this.history.runFiles)) {
                if (keepRunIds.has(existingRunId))
                    continue;
                const rel = this.history.runFiles[existingRunId];
                if (rel) {
                    try {
                        fs.unlinkSync(path.resolve(historyDir, rel));
                    }
                    catch {
                        // ignore
                    }
                }
                delete this.history.runFiles[existingRunId];
            }
        }
        // Save to disk
        const historyPath = path.resolve(this.outputDir, this.options.historyFile);
        fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2));
    }
    /**
     * Get history for a specific test
     */
    getTestHistory(testId) {
        return this.history.tests[testId] || [];
    }
    /**
     * Get full history
     */
    getHistory() {
        return this.history;
    }
    /**
     * Get current run metadata
     */
    getCurrentRun() {
        return this.currentRun;
    }
    /**
     * Get options
     */
    getOptions() {
        return this.options;
    }
    /**
     * Get baseline run for comparison (if enabled)
     */
    getBaselineRun() {
        if (!this.options.enableComparison || !this.history.summaries) {
            return null;
        }
        // If specific baseline specified, find it
        if (this.options.baselineRunId) {
            return this.history.summaries.find(s => s.runId === this.options.baselineRunId) || null;
        }
        // Otherwise, use previous run
        return this.history.summaries.length > 0
            ? this.history.summaries[this.history.summaries.length - 1]
            : null;
    }
}
exports.HistoryCollector = HistoryCollector;
