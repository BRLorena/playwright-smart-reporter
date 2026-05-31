import type { TestResultData, TestHistory, CIInfo, FailureCluster, QualityGateResult, QuarantineEntry } from '../types';
export interface ExecutivePdfData {
    results: TestResultData[];
    history: TestHistory;
    startTime: number;
    ciInfo?: CIInfo;
    failureClusters?: FailureCluster[];
    projectName?: string;
    qualityGateResult?: QualityGateResult;
    quarantineEntries?: QuarantineEntry[];
    quarantineThreshold?: number;
    branding?: {
        title?: string;
        footer?: string;
    };
}
export type PdfThemeName = 'corporate' | 'dark' | 'minimal';
export declare function generateExecutivePdf(data: ExecutivePdfData, outputDir: string, basename?: string, theme?: PdfThemeName): string;
