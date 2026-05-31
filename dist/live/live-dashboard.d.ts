interface DashboardOptions {
    jsonlFile: string;
    sseUrl?: string;
}
export interface LiveReportPageOptions {
    jsonlFile: string;
    sseUrl?: string;
    title?: string;
    theme?: string;
}
export declare function generateLiveDashboard(options: DashboardOptions): string;
export declare function generateLiveReportPage(options: LiveReportPageOptions): string;
export {};
