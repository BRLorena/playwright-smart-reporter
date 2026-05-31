import type { CIInfo } from '../types';
interface LiveTestInput {
    testId: string;
    title: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
    duration: number;
    retry: number;
    error?: string;
}
export declare class LiveWriter {
    private outputFile;
    private totalExpected;
    private tracked;
    private noop;
    constructor(options: {
        outputFile: string;
        noop?: boolean;
    });
    static disabled(): LiveWriter;
    getOutputPath(): string;
    start(totalExpected: number, ciInfo?: CIInfo): void;
    writeTestResult(input: LiveTestInput): void;
    complete(duration: number): void;
    cleanup(): void;
    private computeCounters;
}
export {};
