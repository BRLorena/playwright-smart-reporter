import type { SmartReporterOptions } from '../types';
/**
 * Exports the HTML report as a PDF using Playwright's chromium browser.
 *
 * Playwright-core is loaded via dynamic import to avoid a hard dependency.
 * If playwright-core is not installed or chromium is not available, a warning
 * is logged and null is returned — the reporter will not crash.
 *
 * @param htmlPath - Absolute path to the generated HTML report file
 * @param options - Smart reporter options (unused currently, reserved for future PDF config)
 * @param outputDir - Optional output directory for the PDF. Defaults to the same directory as htmlPath.
 * @returns The absolute path to the generated PDF, or null if generation was skipped/failed
 */
export declare function exportPdfReport(htmlPath: string, options: SmartReporterOptions, outputDir?: string): Promise<string | null>;
