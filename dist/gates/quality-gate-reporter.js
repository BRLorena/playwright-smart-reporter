"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGateReport = formatGateReport;
const ruleLabels = {
    maxFailures: 'Max failures',
    minPassRate: 'Min pass rate',
    maxFlakyRate: 'Max flaky rate',
    minStabilityGrade: 'Min stability grade',
    noNewFailures: 'No new failures',
};
function formatRuleLine(rule) {
    const label = ruleLabels[rule.rule] || rule.rule;
    if (rule.skipped) {
        return `  \u25CB ${padRight(label, 20)} (skipped \u2014 no comparison data)`;
    }
    const icon = rule.passed ? '\u2713' : '\u2717';
    return `  ${icon} ${padRight(label, 20)} ${rule.actual} ${rule.threshold}`;
}
function padRight(str, width) {
    return str + ' '.repeat(Math.max(0, width - str.length));
}
function formatGateReport(result) {
    const separator = '\u2500'.repeat(45);
    const lines = [];
    lines.push('');
    lines.push('  Quality Gates');
    lines.push(`  ${separator}`);
    for (const rule of result.rules) {
        lines.push(formatRuleLine(rule));
    }
    lines.push(`  ${separator}`);
    const nonSkipped = result.rules.filter(r => !r.skipped);
    const failed = nonSkipped.filter(r => !r.passed);
    const status = result.passed ? 'PASSED' : 'FAILED';
    if (result.passed) {
        lines.push(`  Result: ${status} (${nonSkipped.length} of ${nonSkipped.length} rules passed)`);
    }
    else {
        lines.push(`  Result: ${status} (${failed.length} of ${nonSkipped.length} rules breached)`);
    }
    lines.push('');
    return lines.join('\n');
}
