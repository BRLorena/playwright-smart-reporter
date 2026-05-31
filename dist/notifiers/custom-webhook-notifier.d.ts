export declare class CustomWebhookNotifier {
    private url;
    constructor(url: string);
    send(payload: string, headers?: Record<string, string>): Promise<void>;
}
