import type { TestResultData, QualityGateConfig, QualityGateResult, RunComparison } from '../types';
export declare class QualityGateEvaluator {
    evaluate(config: QualityGateConfig, results: TestResultData[], comparison?: RunComparison): QualityGateResult;
    private evaluateMaxFailures;
    private evaluateMinPassRate;
    private evaluateMaxFlakyRate;
    private evaluateMinStabilityGrade;
    private evaluateNoNewFailures;
}
