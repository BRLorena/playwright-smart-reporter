export declare class EmailNotifier {
    private config;
    constructor(config: Record<string, string>);
    send(message: string, context: {
        total: number;
        passed: number;
        failed: number;
        passRate: number;
    }): Promise<void>;
    private sendViaSendGrid;
}
