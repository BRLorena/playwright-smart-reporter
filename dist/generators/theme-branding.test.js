"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const html_generator_1 = require("./html-generator");
const createTestResult = (overrides = {}) => ({
    testId: 'test-1',
    title: 'Test One',
    file: 'tests/example.spec.ts',
    status: 'passed',
    duration: 1000,
    retry: 0,
    steps: [],
    history: [],
    ...overrides,
});
const createTestHistory = () => ({
    runs: [],
    tests: {},
    summaries: [],
});
function buildHtmlData(overrides = {}) {
    return {
        results: [createTestResult()],
        history: createTestHistory(),
        startTime: Date.now(),
        options: {},
        ...overrides,
    };
}
(0, vitest_1.describe)('theme-branding', () => {
    (0, vitest_1.describe)('theme presets', () => {
        (0, vitest_1.it)('dark preset sets data-theme="dark" on html tag', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'dark' } },
            }));
            (0, vitest_1.expect)(html).toContain('<html lang="en" data-theme="dark">');
        });
        (0, vitest_1.it)('light preset sets data-theme="light" on html tag', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'light' } },
            }));
            (0, vitest_1.expect)(html).toContain('<html lang="en" data-theme="light">');
        });
        (0, vitest_1.it)('high-contrast preset sets data-theme="high-contrast" on html tag', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'high-contrast' } },
            }));
            (0, vitest_1.expect)(html).toContain('<html lang="en" data-theme="high-contrast">');
        });
        (0, vitest_1.it)('default preset does not set data-theme attribute', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'default' } },
            }));
            (0, vitest_1.expect)(html).toContain('<html lang="en">');
        });
        (0, vitest_1.it)('high-contrast preset applies high-contrast CSS variables', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'high-contrast' } },
            }));
            (0, vitest_1.expect)(html).toContain('--bg-primary: #000000');
            (0, vitest_1.expect)(html).toContain('--accent-green: #00ff00');
            (0, vitest_1.expect)(html).toContain('--accent-red: #ff0000');
            (0, vitest_1.expect)(html).toContain('text-decoration: underline !important');
        });
    });
    (0, vitest_1.describe)('custom theme colors', () => {
        (0, vitest_1.it)('primary maps to --accent-blue CSS variable', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { primary: '#ff0000' } },
            }));
            (0, vitest_1.expect)(html).toContain('--accent-blue: #ff0000');
        });
        (0, vitest_1.it)('success maps to --accent-green CSS variable', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { success: '#00ff00' } },
            }));
            (0, vitest_1.expect)(html).toContain('--accent-green: #00ff00');
        });
        (0, vitest_1.it)('primary and success map to different CSS variables', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { primary: '#ff0000', success: '#00ff00' } },
            }));
            (0, vitest_1.expect)(html).toContain('--accent-blue: #ff0000');
            (0, vitest_1.expect)(html).toContain('--accent-green: #00ff00');
        });
        (0, vitest_1.it)('background maps to --bg-primary', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { background: '#111111' } },
            }));
            (0, vitest_1.expect)(html).toContain('--bg-primary: #111111');
        });
        (0, vitest_1.it)('error maps to --accent-red', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { error: '#ee0000' } },
            }));
            (0, vitest_1.expect)(html).toContain('--accent-red: #ee0000');
        });
    });
    (0, vitest_1.describe)('forcedLightPreset dead code', () => {
        (0, vitest_1.it)('light preset does not produce invalid CSS like ":root { data-theme: light; }"', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { theme: { preset: 'light' } },
            }));
            (0, vitest_1.expect)(html).not.toContain(':root { data-theme: light; }');
        });
    });
    (0, vitest_1.describe)('branding config', () => {
        (0, vitest_1.it)('renders logo image when branding.logo is set', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { branding: { logo: 'https://example.com/logo.png' } },
            }));
            (0, vitest_1.expect)(html).toContain('logo-image');
            (0, vitest_1.expect)(html).toContain('https://example.com/logo.png');
        });
        (0, vitest_1.it)('renders custom title when branding.title is set', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { branding: { title: 'My Company Tests' } },
            }));
            (0, vitest_1.expect)(html).toContain('My Company Tests');
        });
        (0, vitest_1.it)('renders custom footer when branding.footer is set', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { branding: { footer: 'Copyright 2024 My Company' } },
            }));
            (0, vitest_1.expect)(html).toContain('Copyright 2024 My Company');
        });
        (0, vitest_1.it)('suppresses powered-by attribution when hidePoweredBy is true', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: { branding: { hidePoweredBy: true } },
            }));
            (0, vitest_1.expect)(html).not.toContain('Powered by');
        });
        (0, vitest_1.it)('shows powered-by attribution by default', () => {
            const { html } = (0, html_generator_1.generateHtml)(buildHtmlData({
                options: {},
            }));
            (0, vitest_1.expect)(html).toContain('Powered by');
        });
    });
});
