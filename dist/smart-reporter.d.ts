import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import type { SmartReporterOptions } from './types';
/**
 * Smart Reporter - Orchestrates all modular components to analyze and report
 * on Playwright test results with AI insights and advanced analytics.
 *
 * Public API:
 * - Implements Playwright's Reporter interface
 * - Constructor takes SmartReporterOptions
 * - Methods: onBegin, onTestEnd, onEnd
 */
declare class SmartReporter implements Reporter {
    private historyCollector;
    private stepCollector;
    private attachmentCollector;
    private networkCollector;
    private flakinessAnalyzer;
    private performanceAnalyzer;
    private retryAnalyzer;
    private failureClusterer;
    private stabilityScorer;
    private aiAnalyzer;
    private slackNotifier;
    private teamsNotifier;
    private cloudUploader;
    private license;
    private notificationManager?;
    private options;
    private results;
    private resultsMap;
    private outputDir;
    private startTime;
    private fullConfig;
    private runnerErrors;
    private ciInfo?;
    private liveWriter;
    private liveFirstFailureSent;
    constructor(options?: SmartReporterOptions);
    /**
     * Called when the test run begins
     * Initializes collectors, analyzers, and loads test history
     * @param config - Playwright full configuration
     * @param _suite - Root test suite (unused)
     */
    onBegin(config: FullConfig, suite: Suite): void;
    onError(error: unknown): void;
    /**
     * Called when a test completes
     * Collects test data, runs analyzers, and stores results
     * @param test - Playwright test case
     * @param result - Test execution result
     */
    onTestEnd(test: TestCase, result: TestResult): Promise<void>;
    /**
     * Called when the test run completes
     * Performs final analysis, generates HTML report, updates history, and sends notifications
     * @param result - Full test run result
     */
    onEnd(result: FullResult): Promise<void>;
    /**
     * Create a unique test ID from test file, title, and project name
     * Issue #26: Include project name for parameterized projects
     * @param test - Playwright TestCase
     * @returns Test ID string (e.g., "[Chrome] src/tests/login.spec.ts::Login Test")
     */
    private getTestId;
}
export declare function mergeHistories(historyFiles: string[], outputFile: string, maxHistoryRuns?: number): void;
export default SmartReporter;
