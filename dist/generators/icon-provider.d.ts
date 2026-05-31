/**
 * Icon Provider - Lucide-based SVG icons for the report
 *
 * Uses inline SVG strings from Lucide (https://lucide.dev, MIT license) for
 * consistent, theme-aware icons. All icons use stroke="currentColor" so they
 * inherit text color via CSS custom properties across all themes.
 *
 * Works in both standard and CSP-safe modes (no external requests needed).
 */
/**
 * Returns an inline SVG string for the given icon name.
 *
 * @param name  Icon identifier (e.g. 'search', 'bar-chart-2', 'bug')
 * @param size  Pixel width & height (default 16)
 * @returns     SVG markup string, or empty string if icon not found
 */
export declare function icon(name: string, size?: number): string;
