"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference lib="dom" />
const vitest_1 = require("vitest");
const playwright_1 = require("playwright");
const REPORT_URL = 'http://localhost:9222/smart-report.html';
// Helper to extract filter state from the page
async function getFilterState(page) {
    return page.evaluate(() => {
        const summaryEl = document.getElementById('live-filter-summary');
        const summaryText = summaryEl?.textContent?.trim() || '';
        const match = summaryText.match(/(\d+) of (\d+)/);
        const allMatch = summaryText.match(/All (\d+)/);
        return {
            summary: summaryText,
            matchCount: match ? parseInt(match[1]) : (allMatch ? parseInt(allMatch[1]) : -1),
            total: match ? parseInt(match[2]) : (allMatch ? parseInt(allMatch[1]) : -1),
            checkedFiles: Array.from(document.querySelectorAll('#live-filter-files-list input[type="checkbox"]:checked')).map(b => b.getAttribute('data-file')),
            uncheckedFiles: Array.from(document.querySelectorAll('#live-filter-files-list input[type="checkbox"]:not(:checked)')).map(b => b.getAttribute('data-file')),
            checkedSuites: Array.from(document.querySelectorAll('#live-filter-suites-list input[type="checkbox"]:checked')).map(b => b.getAttribute('data-suite')),
            selectedTags: Array.from(document.querySelectorAll('.live-filter-chip.selected')).map(c => c.getAttribute('data-tag')),
            grep: document.getElementById('live-filter-grep')?.value || '',
        };
    });
}
(0, vitest_1.describe)('Live filter UI integration', () => {
    let browser;
    let page;
    let pageErrors;
    (0, vitest_1.beforeAll)(async () => {
        browser = await playwright_1.chromium.launch();
        page = await browser.newPage();
        pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));
        await page.goto(REPORT_URL, { waitUntil: 'networkidle', timeout: 10000 });
        // Navigate to Live tab and open filter panel
        await page.locator('[data-view="live"]').click();
        await page.waitForTimeout(500);
        await page.evaluate(() => window.toggleFilterPanel());
        await page.waitForTimeout(300);
        // Expand all sections so checkboxes are interactable
        await page.evaluate(() => {
            ['files', 'suites'].forEach(s => {
                const el = document.getElementById('live-filter-body-' + s);
                if (el)
                    el.style.display = '';
            });
        });
    }, 15000);
    (0, vitest_1.beforeEach)(async () => {
        await page.evaluate(() => window.clearAllFilters());
        await page.waitForTimeout(250);
    });
    (0, vitest_1.afterAll)(async () => {
        await browser?.close();
    });
    // ---- Basics ----
    (0, vitest_1.it)('has no JS errors on page load', () => {
        (0, vitest_1.expect)(pageErrors).toEqual([]);
    });
    (0, vitest_1.it)('shows the Run button, Filter toggle, and cascadeFilters function', async () => {
        (0, vitest_1.expect)(await page.locator('#live-run-btn').isVisible()).toBe(true);
        (0, vitest_1.expect)(await page.locator('#live-filter-toggle').isVisible()).toBe(true);
        const hasCascade = await page.evaluate(() => typeof window.cascadeFilters);
        (0, vitest_1.expect)(hasCascade).toBe('function');
    });
    (0, vitest_1.it)('has all window functions defined', async () => {
        const funcs = await page.evaluate(() => ({
            toggleFilterPanel: typeof window.toggleFilterPanel,
            runTests: typeof window.runTests,
            cancelTests: typeof window.cancelTests,
            updateFilterSummary: typeof window.updateFilterSummary,
            cascadeFilters: typeof window.cascadeFilters,
            clearAllFilters: typeof window.clearAllFilters,
            selectAllFiles: typeof window.selectAllFiles,
            toggleFilterChip: typeof window.toggleFilterChip,
            toggleFileFilter: typeof window.toggleFileFilter,
            toggleSuiteFilter: typeof window.toggleSuiteFilter,
            toggleFilterSection: typeof window.toggleFilterSection,
        }));
        for (const [name, type] of Object.entries(funcs)) {
            (0, vitest_1.expect)(type, `${name} should be a function`).toBe('function');
        }
    });
    // ---- Baseline state ----
    (0, vitest_1.it)('baseline: all tests selected, all files/suites checked', async () => {
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(28);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(4);
        (0, vitest_1.expect)(s.checkedSuites).toHaveLength(6);
        (0, vitest_1.expect)(s.selectedTags).toHaveLength(0);
        (0, vitest_1.expect)(s.grep).toBe('');
        (0, vitest_1.expect)(s.summary).toContain('All');
    });
    // ---- Individual tag selection ----
    (0, vitest_1.it)('tag @experimental: 1 test, cascades to demo.spec.ts only', async () => {
        await page.locator('.live-filter-chip[data-tag="@experimental"]').click();
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['demo.spec.ts']);
        (0, vitest_1.expect)(s.checkedSuites).toEqual(['demo.spec.ts']);
    });
    (0, vitest_1.it)('tag @regression: 1 test, cascades to feature-demo.spec.ts only', async () => {
        await page.locator('.live-filter-chip[data-tag="@regression"]').click();
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['feature-demo.spec.ts']);
    });
    (0, vitest_1.it)('tag @smoke: 1 test, cascades to feature-demo.spec.ts only', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['feature-demo.spec.ts']);
    });
    // ---- Multiple tags (OR logic) ----
    (0, vitest_1.it)('two tags in same file: @smoke + @regression = 2 tests, 1 file', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(150);
        await page.locator('.live-filter-chip[data-tag="@regression"]').click();
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(2);
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['feature-demo.spec.ts']);
    });
    (0, vitest_1.it)('two tags across files: @smoke + @experimental = 2 tests, 2 files', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(150);
        await page.locator('.live-filter-chip[data-tag="@experimental"]').click();
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(2);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(2);
    });
    (0, vitest_1.it)('all 3 tags: 3 tests', async () => {
        for (const tag of ['@smoke', '@regression', '@experimental']) {
            await page.locator(`.live-filter-chip[data-tag="${tag}"]`).click();
            await page.waitForTimeout(100);
        }
        await page.waitForTimeout(200);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(3);
    });
    // ---- Tag select/deselect restoration ----
    (0, vitest_1.it)('deselecting a tag restores all files and suites', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(1);
        // Deselect
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(300);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(4);
        (0, vitest_1.expect)(s.checkedSuites).toHaveLength(6);
        (0, vitest_1.expect)(s.summary).toContain('All');
    });
    (0, vitest_1.it)('toggling tags on/off one by one restores correctly at each step', async () => {
        // Add all 3
        for (const tag of ['@smoke', '@regression', '@experimental']) {
            await page.locator(`.live-filter-chip[data-tag="${tag}"]`).click();
            await page.waitForTimeout(150);
        }
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(3);
        // Remove one by one
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(200);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(2);
        await page.locator('.live-filter-chip[data-tag="@regression"]').click();
        await page.waitForTimeout(200);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        await page.locator('.live-filter-chip[data-tag="@experimental"]').click();
        await page.waitForTimeout(200);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(28);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(4);
    });
    // ---- Grep cascading ----
    (0, vitest_1.it)('grep "homepage": 3 tests, narrows to 2 files', async () => {
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(3);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(2);
        (0, vitest_1.expect)(s.checkedFiles).toContain('demo.spec.ts');
        (0, vitest_1.expect)(s.checkedFiles).toContain('feature-demo.spec.ts');
    });
    (0, vitest_1.it)('grep "login": 1 test, narrows to 1 file', async () => {
        await page.locator('#live-filter-grep').fill('login');
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(1);
        (0, vitest_1.expect)(s.checkedFiles).toContain('demo.spec.ts');
    });
    (0, vitest_1.it)('grep "search": 2 tests, includes Search functionality suite', async () => {
        await page.locator('#live-filter-grep').fill('search');
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(2);
        (0, vitest_1.expect)(s.checkedSuites).toContain('Search functionality');
    });
    (0, vitest_1.it)('clearing grep restores all files and suites', async () => {
        await page.locator('#live-filter-grep').fill('login');
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(1);
        await page.locator('#live-filter-grep').fill('');
        await page.waitForTimeout(300);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(4);
        (0, vitest_1.expect)(s.checkedSuites).toHaveLength(6);
    });
    // ---- Tag + grep combined ----
    (0, vitest_1.it)('tag + grep intersection: @smoke + "homepage" = 1 test', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(200);
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['feature-demo.spec.ts']);
    });
    (0, vitest_1.it)('non-overlapping tag + grep: @experimental + "search" = 0 tests, 0 files', async () => {
        await page.locator('.live-filter-chip[data-tag="@experimental"]').click();
        await page.waitForTimeout(200);
        await page.locator('#live-filter-grep').fill('search');
        await page.waitForTimeout(300);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(0);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(0);
    });
    (0, vitest_1.it)('removing grep while tag stays narrows back to tag-only results', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(200);
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        // Remove grep, keep tag
        await page.locator('#live-filter-grep').fill('');
        await page.waitForTimeout(300);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1); // @smoke still selected
        (0, vitest_1.expect)(s.checkedFiles).toEqual(['feature-demo.spec.ts']);
    });
    (0, vitest_1.it)('adding tag while grep is set re-cascades files', async () => {
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(2); // demo + feature-demo
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(300);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(1); // only feature-demo
    });
    // ---- File deselection (no primary filters) ----
    (0, vitest_1.it)('file deselection: demo.spec.ts = 18 remaining', async () => {
        await page.locator('#live-filter-files-list input[data-file="demo.spec.ts"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(18);
    });
    (0, vitest_1.it)('file deselection: feature-demo.spec.ts = 12 remaining', async () => {
        await page.locator('#live-filter-files-list input[data-file="feature-demo.spec.ts"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(12);
    });
    (0, vitest_1.it)('file deselection: both main files = 2 remaining (parallel only)', async () => {
        await page.locator('#live-filter-files-list input[data-file="demo.spec.ts"]').uncheck();
        await page.waitForTimeout(100);
        await page.locator('#live-filter-files-list input[data-file="feature-demo.spec.ts"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(2);
    });
    (0, vitest_1.it)('select none files = 0 tests', async () => {
        await page.evaluate(() => window.selectAllFiles(false));
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(0);
    });
    (0, vitest_1.it)('individual file test counts sum to 28', async () => {
        const files = ['demo.spec.ts', 'feature-demo.spec.ts', 'parallel/test1.spec.ts', 'parallel/test2.spec.ts'];
        let total = 0;
        for (const file of files) {
            await page.evaluate(() => window.clearAllFilters());
            await page.waitForTimeout(100);
            await page.evaluate(() => window.selectAllFiles(false));
            await page.waitForTimeout(100);
            await page.locator(`#live-filter-files-list input[data-file="${file}"]`).check();
            await page.evaluate((f) => {
                window.selectedFiles = {};
                window.selectedFiles[f] = true;
                window.updateFilterSummary();
            }, file);
            await page.waitForTimeout(200);
            const s = await getFilterState(page);
            total += s.matchCount;
        }
        (0, vitest_1.expect)(total).toBe(28);
    });
    // ---- Suite deselection (AND logic: all suites must be selected) ----
    (0, vitest_1.it)('suite deselection: API Documentation filters at least 1 test', async () => {
        await page.locator('#live-filter-suites-list input[data-suite="API Documentation"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBeLessThan(28);
    });
    (0, vitest_1.it)('suite deselection: demo.spec.ts = 18 remaining (matches file deselection)', async () => {
        await page.locator('#live-filter-suites-list input[data-suite="demo.spec.ts"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(18);
    });
    (0, vitest_1.it)('suite deselection: feature-demo.spec.ts = 12 remaining (matches file deselection)', async () => {
        await page.locator('#live-filter-suites-list input[data-suite="feature-demo.spec.ts"]').uncheck();
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(12);
    });
    // ---- Tag then manual file adjustment ----
    (0, vitest_1.it)('tag then manual file deselect narrows to 0', async () => {
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(1);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(1);
        // Deselect the only remaining file
        await page.locator(`#live-filter-files-list input[data-file="${s.checkedFiles[0]}"]`).uncheck();
        await page.waitForTimeout(250);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(0);
    });
    (0, vitest_1.it)('grep then manual file deselect narrows further', async () => {
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        let s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBe(3);
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(2);
        // Deselect one file
        await page.locator(`#live-filter-files-list input[data-file="${s.checkedFiles[0]}"]`).uncheck();
        await page.waitForTimeout(250);
        s = await getFilterState(page);
        (0, vitest_1.expect)(s.matchCount).toBeLessThan(3);
        (0, vitest_1.expect)(s.matchCount).toBeGreaterThan(0);
    });
    // ---- clearAllFilters ----
    (0, vitest_1.it)('clearAllFilters resets tags, grep, files, suites, and summary', async () => {
        // Set up a complex state
        await page.locator('.live-filter-chip[data-tag="@smoke"]').click();
        await page.waitForTimeout(100);
        await page.locator('#live-filter-grep').fill('homepage');
        await page.waitForTimeout(300);
        await page.evaluate(() => window.clearAllFilters());
        await page.waitForTimeout(250);
        const s = await getFilterState(page);
        (0, vitest_1.expect)(s.selectedTags).toHaveLength(0);
        (0, vitest_1.expect)(s.grep).toBe('');
        (0, vitest_1.expect)(s.checkedFiles).toHaveLength(4);
        (0, vitest_1.expect)(s.checkedSuites).toHaveLength(6);
        (0, vitest_1.expect)(s.summary).toContain('All');
        (0, vitest_1.expect)(s.matchCount).toBe(28);
    });
    // ---- Panel toggle ----
    (0, vitest_1.it)('filter sections collapse and expand', async () => {
        await page.evaluate(() => window.toggleFilterSection('tags'));
        await page.waitForTimeout(200);
        (0, vitest_1.expect)(await page.locator('#live-filter-body-tags').isVisible()).toBe(false);
        await page.evaluate(() => window.toggleFilterSection('tags'));
        await page.waitForTimeout(200);
        (0, vitest_1.expect)(await page.locator('#live-filter-body-tags').isVisible()).toBe(true);
    });
});
