package com.bullrun.security.service.analytics;

import org.springframework.stereotype.Component;

/**
 * Strategy implementation for portfolio risk and exposure analysis.
 * Implements AnalyticsStrategy using PortfolioRiskAnalyzer.
 */
@Component("riskAnalyticsStrategy")
public class RiskAnalyticsStrategy implements AnalyticsStrategy {

    private final PortfolioRiskAnalyzer riskAnalyzer;

    public RiskAnalyticsStrategy(PortfolioRiskAnalyzer riskAnalyzer) {
        this.riskAnalyzer = riskAnalyzer;
    }

    @Override
    public String getStrategyName() {
        return "RISK";
    }

    @Override
    public AnalyticsCategory getCategory() {
        return AnalyticsCategory.RISK;
    }

    @Override
    public AnalyticsResult execute(PortfolioAnalysisContext context) {
        return riskAnalyzer.analyze(context);
    }
}
