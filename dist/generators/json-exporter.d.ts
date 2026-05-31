import type { TestResultData, TestHistory, SmartReporterOptions, RunComparison, FailureCluster } from '../types';
export interface JsonExportData {
    metadata: {
        generatedAt: string;
        reporterVersion: string;
        projectName?: string;
    };
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        flaky: number;
        duration: number;
        passRate: number;
        stabilityGrade?: string;
    };
    tests: JsonTestEntry[];
    failureClusters?: JsonClusterEntry[];
    comparison?: RunComparison;
    history?: {
        runCount: number;
        runs: TestHistory['runs'];
        summaries?: TestHistory['summaries'];
    };
}
interface JsonTestEntry {
    testId: string;
    title: string;
    file: string;
    status: string;
    duration: number;
    error?: string;
    retry: number;
    outcome?: string;
    flakinessScore?: number;
    stabilityScore?: {
        overall: number;
        grade: string;
    };
    performanceTrend?: string;
    tags?: string[];
    suite?: string;
    browser?: string;
    project?: string;
    aiSuggestion?: string;
}
interface JsonClusterEntry {
    id: string;
    errorType: string;
    count: number;
    testIds: string[];
    aiSuggestion?: string;
}
export declare function exportJsonData(results: TestResultData[], history: TestHistory, startTime: number, options: SmartReporterOptions, comparison?: RunComparison, failureClusters?: FailureCluster[], outputDir?: string, basename?: string): string;
export {};
