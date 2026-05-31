export declare class PagerDutyNotifier {
    private routingKey;
    constructor(routingKey: string);
    trigger(summary: string, failures: number, total: number): Promise<void>;
}
