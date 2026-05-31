export interface SseClient {
    write(data: string): boolean;
    end(): void;
}
export interface SseHandler {
    addClient(client: SseClient): void;
    removeClient(client: SseClient): void;
    clientCount(): number;
    stop(): void;
}
export declare function buildSseHandler(jsonlPath: string): SseHandler;
