import type { TestHistory, DigestOptions } from '../types';
export interface DigestData {
    period: string;
    startDate: string;
    endDate: string;
    runsAnalyzed: number;
    passRateTrend: {
        direction: 'up' | 'down' | 'stable';
        from: number;
        to: number;
    } | null;
    newFlakyTests: Array<{
        testId: string;
        flakinessScore: number;
    }>;
    recoveredTests: Array<{
        testId: string;
        stableForRuns: number;
    }>;
    performanceTrends: Array<{
        testId: string;
        percentChange: number;
    }>;
    summary: string;
}
export declare class HealthDigest {
    analyze(history: TestHistory, options: DigestOptions): DigestData;
    generateMarkdown(data: DigestData): string;
    generateText(data: DigestData): string;
    private calculatePassRateTrend;
    private findNewFlakyTests;
    private findRecoveredTests;
    private findPerformanceTrends;
    private buildRecommendations;
}
