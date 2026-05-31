import type { TestResultData, QuarantineConfig, QuarantineFile } from '../types';
export declare class QuarantineGenerator {
    private config;
    constructor(config: QuarantineConfig);
    generate(results: TestResultData[], outputDir: string): QuarantineFile | null;
    getOutputPath(outputDir: string): string;
}
