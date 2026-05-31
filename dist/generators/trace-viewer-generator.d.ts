/**
 * Embedded Trace Viewer Generator
 * Builds a comprehensive trace viewer that matches Playwright's native viewer
 * Features: Timeline, Before/After snapshots, Console, Source, Network waterfall, Metadata
 */
/**
 * Generate the inlined JSZip script
 * This must be included before generateTraceViewerScript() in the HTML
 */
export declare function generateJSZipScript(): string;
/**
 * Generate the embedded trace viewer HTML and styles
 */
export declare function generateTraceViewerHtml(): string;
/**
 * Generate trace viewer styles
 */
export declare function generateTraceViewerStyles(monoFont: string): string;
/**
 * Generate trace viewer JavaScript
 */
export declare function generateTraceViewerScript(): string;
