import type { TestResultData, SmartReporterOptions } from '../types';
export declare function exportJunitXml(results: TestResultData[], options: SmartReporterOptions, outputDir?: string, basename?: string): string;
