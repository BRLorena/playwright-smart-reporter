export type LicenseTier = 'community' | 'starter' | 'pro' | 'team';
export interface LicenseInfo {
    tier: LicenseTier;
    valid: boolean;
    org?: string;
    expiry?: string;
    error?: string;
}
export interface ThemeConfig {
    preset?: 'default' | 'dark' | 'light' | 'high-contrast' | 'ocean' | 'sunset' | 'dracula' | 'cyberpunk' | 'forest' | 'rose';
    primary?: string;
    background?: string;
    surface?: string;
    text?: string;
    accent?: string;
    success?: string;
    error?: string;
    warning?: string;
}
export interface BrandingConfig {
    logo?: string;
    title?: string;
    footer?: string;
    hidePoweredBy?: boolean;
}
export interface NotificationCondition {
    minFailures?: number;
    maxPassRate?: number;
    tags?: string[];
    stabilityGradeDrop?: boolean;
}
export interface NotificationConfig {
    channel: 'slack' | 'teams' | 'pagerduty' | 'email' | 'webhook';
    config: Record<string, string>;
    conditions?: NotificationCondition;
    template?: string;
}
export interface ThresholdConfig {
    flakinessStable?: number;
    flakinessUnstable?: number;
    performanceRegression?: number;
    stabilityWeightFlakiness?: number;
    stabilityWeightPerformance?: number;
    stabilityWeightReliability?: number;
    gradeA?: number;
    gradeB?: number;
    gradeC?: number;
    gradeD?: number;
}
export interface SmartReporterOptions {
    outputFile?: string;
    historyFile?: string;
    maxHistoryRuns?: number;
    performanceThreshold?: number;
    slackWebhook?: string;
    teamsWebhook?: string;
    enableRetryAnalysis?: boolean;
    enableFailureClustering?: boolean;
    enableStabilityScore?: boolean;
    enableGalleryView?: boolean;
    enableComparison?: boolean;
    enableAIRecommendations?: boolean;
    enableAISuiteHealth?: boolean;
    enableTrendsView?: boolean;
    enableTraceViewer?: boolean;
    enableHistoryDrilldown?: boolean;
    stabilityThreshold?: number;
    retryFailureThreshold?: number;
    thresholds?: ThresholdConfig;
    baselineRunId?: string;
    cspSafe?: boolean;
    enableNetworkLogs?: boolean;
    networkLogFilter?: string;
    networkLogExcludeAssets?: boolean;
    networkLogMaxEntries?: number;
    filterPwApiSteps?: boolean;
    relativeToCwd?: boolean;
    projectName?: string;
    maxEmbeddedSize?: number;
    apiKey?: string;
    projectId?: string;
    uploadToCloud?: boolean;
    cloudEndpoint?: string;
    uploadArtifacts?: boolean;
    runId?: string;
    aiProvider?: 'anthropic' | 'openai' | 'gemini' | 'copilot' | 'ollama';
    ollamaBaseUrl?: string;
    ollamaModel?: string;
    geminiModel?: string;
    copilotModel?: string;
    licenseKey?: string;
    exportJson?: boolean;
    exportPdf?: boolean;
    exportJunit?: boolean;
    theme?: ThemeConfig;
    notifications?: NotificationConfig[];
    branding?: BrandingConfig;
    qualityGates?: QualityGateConfig;
    quarantine?: QuarantineConfig;
    live?: LiveConfig;
    exportPdfFull?: boolean;
}
export interface TestHistoryEntry {
    passed: boolean;
    duration: number;
    timestamp: string;
    skipped?: boolean;
    retry?: number;
    runId?: string;
}
export interface RunSummary {
    runId: string;
    timestamp: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    slow: number;
    duration: number;
    passRate: number;
    ciInfo?: CIInfo;
}
export interface RunMetadata {
    runId: string;
    timestamp: string;
}
export interface TestHistory {
    runs: RunMetadata[];
    tests: {
        [testId: string]: TestHistoryEntry[];
    };
    summaries?: RunSummary[];
    runFiles?: Record<string, string>;
}
export interface TestResultSnapshot {
    testId: string;
    title: string;
    file: string;
    status: TestResultData['status'];
    duration: number;
    retry: number;
    error?: string;
    steps: StepData[];
    aiSuggestion?: string;
    aiSuggestionHtml?: string;
    attachments?: AttachmentData;
}
export interface RunSnapshotFile {
    runId: string;
    timestamp: string;
    tests: Record<string, TestResultSnapshot>;
}
export interface CIInfo {
    provider: string;
    branch?: string;
    commit?: string;
    buildId?: string;
}
export interface StepData {
    title: string;
    duration: number;
    category: string;
    isSlowest?: boolean;
}
export interface TestAnnotation {
    type: string;
    description?: string;
}
export interface TestResultData {
    testId: string;
    title: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    duration: number;
    error?: string;
    retry: number;
    outcome?: 'expected' | 'unexpected' | 'flaky' | 'skipped';
    expectedStatus?: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    aiPrompt?: string;
    flakinessScore?: number;
    flakinessIndicator?: string;
    performanceTrend?: string;
    averageDuration?: number;
    aiSuggestion?: string;
    steps: StepData[];
    screenshot?: string;
    videoPath?: string;
    tracePath?: string;
    traceData?: string;
    history: TestHistoryEntry[];
    tags?: string[];
    suite?: string;
    suites?: string[];
    browser?: string;
    project?: string;
    annotations?: TestAnnotation[];
    retryInfo?: RetryInfo;
    failureCluster?: FailureCluster;
    stabilityScore?: StabilityScore;
    attachments?: AttachmentData;
    performanceMetrics?: PerformanceMetrics;
    networkLogs?: NetworkLogData;
}
export interface RetryInfo {
    totalRetries: number;
    passedOnRetry: number;
    failedRetries: number;
    retryPattern: boolean[];
    needsAttention: boolean;
}
export interface FailureCluster {
    id: string;
    errorType: string;
    count: number;
    tests: TestResultData[];
    aiSuggestion?: string;
}
export interface StabilityScore {
    overall: number;
    flakiness: number;
    performance: number;
    reliability: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    needsAttention: boolean;
}
export interface AttachmentData {
    screenshots: string[];
    videos: string[];
    traces: string[];
    custom: CustomAttachment[];
}
export interface CustomAttachment {
    name: string;
    contentType: string;
    path?: string;
    body?: string;
}
export interface PerformanceMetrics {
    averageDuration: number;
    currentDuration: number;
    percentChange: number;
    absoluteChange: number;
    threshold: number;
    isRegression: boolean;
    isImprovement: boolean;
    severity: 'low' | 'medium' | 'high';
}
export interface RunComparison {
    baselineRun: RunSummary;
    currentRun: RunSummary;
    changes: ComparisonChanges;
}
export interface ComparisonChanges {
    newFailures: TestResultData[];
    fixedTests: TestResultData[];
    newTests: TestResultData[];
    regressions: TestResultData[];
    improvements: TestResultData[];
}
export interface TestRecommendation {
    type: 'flakiness' | 'retry' | 'performance' | 'cluster' | 'suite';
    priority: number;
    title: string;
    description: string;
    action: string;
    affectedTests: string[];
    icon: string;
}
export interface GalleryItem {
    id: string;
    testTitle: string;
    testId: string;
    status: string;
    dataUri?: string;
    videoPath?: string;
    tracePath?: string;
}
export interface NetworkLogEntry {
    method: string;
    url: string;
    urlPath: string;
    status: number;
    statusText: string;
    duration: number;
    timestamp: string;
    contentType?: string;
    requestSize: number;
    responseSize: number;
    timings?: {
        dns: number;
        connect: number;
        ssl: number;
        wait: number;
        receive: number;
    };
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: unknown;
    responseBody?: unknown;
}
export interface NetworkLogData {
    entries: NetworkLogEntry[];
    totalRequests: number;
    totalDuration: number;
    summary: {
        byStatus: Record<number, number>;
        byMethod: Record<string, number>;
        slowest: NetworkLogEntry | null;
        errors: NetworkLogEntry[];
    };
}
export interface SuiteStats {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    slow: number;
    needsRetry: number;
    passRate: number;
    averageStability: number;
}
export interface QualityGateConfig {
    maxFailures?: number;
    minPassRate?: number;
    maxFlakyRate?: number;
    minStabilityGrade?: 'A' | 'B' | 'C' | 'D';
    noNewFailures?: boolean;
}
export interface QualityGateRuleResult {
    rule: string;
    passed: boolean;
    actual: string;
    threshold: string;
    skipped?: boolean;
}
export interface QualityGateResult {
    passed: boolean;
    rules: QualityGateRuleResult[];
}
export interface QuarantineConfig {
    enabled: boolean;
    threshold?: number;
    maxQuarantined?: number;
    outputFile?: string;
}
export interface QuarantineEntry {
    testId: string;
    title: string;
    file: string;
    flakinessScore: number;
    quarantinedAt: string;
}
export interface QuarantineFile {
    generatedAt: string;
    threshold: number;
    entries: QuarantineEntry[];
}
export interface LiveConfig {
    enabled: boolean;
    outputFile?: string;
    dashboard?: boolean;
    notifyOnFirstFailure?: boolean;
}
export interface LiveEvent {
    event: 'start' | 'test' | 'complete';
    timestamp: string;
}
export interface LiveStartEvent extends LiveEvent {
    event: 'start';
    totalExpected: number;
    ciInfo?: CIInfo;
}
export interface LiveTestEvent extends LiveEvent {
    event: 'test';
    testId: string;
    title: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    duration: number;
    error?: string;
    retry: number;
    counters: LiveCounters;
}
export interface LiveCompleteEvent extends LiveEvent {
    event: 'complete';
    duration: number;
    counters: LiveCounters;
}
export interface LiveCounters {
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    completed: number;
    totalExpected: number;
}
export interface DigestOptions {
    period: 'daily' | 'weekly' | 'monthly';
    historyFile: string;
    output?: string;
    ai?: boolean;
    format?: 'markdown' | 'text';
}
