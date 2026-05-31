/**
 * HTML Generator - Main orchestrator for HTML report generation
 * Coordinates all other generators and generates the complete HTML document
 *
 * REDESIGNED: Modern app-shell layout with sidebar, top bar, and master-detail view
 */
import type { TestResultData, TestHistory, RunComparison, RunSnapshotFile, SmartReporterOptions, FailureCluster, CIInfo, LicenseTier, QualityGateResult, QuarantineEntry } from '../types';
export interface GeneratedReport {
    html: string;
    css?: string;
    js?: string;
}
export interface HtmlGeneratorData {
    results: TestResultData[];
    history: TestHistory;
    startTime: number;
    options: SmartReporterOptions;
    comparison?: RunComparison;
    historyRunSnapshots?: Record<string, RunSnapshotFile>;
    failureClusters?: FailureCluster[];
    ciInfo?: CIInfo;
    licenseTier?: LicenseTier;
    outputBasename?: string;
    qualityGateResult?: QualityGateResult;
    quarantinedTestIds?: Set<string>;
    quarantineEntries?: QuarantineEntry[];
    quarantineThreshold?: number;
    aiSuiteHealthSummary?: string;
}
/**
 * Generate complete HTML report with new app-shell layout
 */
export declare function generateHtml(data: HtmlGeneratorData): GeneratedReport;
