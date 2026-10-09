package com.bullrun.security.service.analytics;

import org.springframework.stereotype.Component;

/**
 * Strategy implementation for portfolio returns, PnL, and performance benchmarks.
 * Implements AnalyticsStrategy using PortfolioPerformanceAnalyzer.
 */
@Component("performanceAnalyticsStrategy")
public class PerformanceAnalyticsStrategy implements AnalyticsStrategy {

    private final PortfolioPerformanceAnalyzer performanceAnalyzer;

    public PerformanceAnalyticsStrategy(PortfolioPerformanceAnalyzer performanceAnalyzer) {
        this.performanceAnalyzer = performanceAnalyzer;
    }

    @Override
    public String getStrategyName() {
        return "PERFORMANCE";
    }

    @Override
    public AnalyticsCategory getCategory() {
        return AnalyticsCategory.PERFORMANCE;
    }

    @Override
    public AnalyticsResult execute(PortfolioAnalysisContext context) {
        return performanceAnalyzer.analyze(context);
    }
}
