package com.bullrun.security.service.analytics;

/**
 * Common interface for executing portfolio analytics strategies.
 * Demonstrates OOP Interfaces and Polymorphism.
 * Implementations execute domain-specific analytics through a unified contract.
 */
public interface AnalyticsStrategy {

    /**
     * Unique name of the strategy (used for dynamic polymorphic strategy resolution).
     */
    String getStrategyName();

    /**
     * High-level category of analytics performed by this strategy.
     */
    AnalyticsCategory getCategory();

    /**
     * Executes the strategy against the provided portfolio context.
     *
     * @param context Immutable portfolio data context
     * @return Standardized analytics result with metrics and collections
     */
    AnalyticsResult execute(PortfolioAnalysisContext context);
}
