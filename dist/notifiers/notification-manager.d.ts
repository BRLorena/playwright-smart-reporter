import type { TestResultData, NotificationConfig, RunComparison } from '../types';
export declare class NotificationManager {
    private configs;
    constructor(configs: NotificationConfig[]);
    notify(results: TestResultData[], startTime: number, comparison?: RunComparison): Promise<void>;
}
