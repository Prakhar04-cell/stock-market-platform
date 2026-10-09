package com.bullrun.security.controller;

import com.bullrun.security.dto.PnLReportDto;
import com.bullrun.security.dto.PortfolioSummaryDto;
import com.bullrun.security.dto.RiskMetricsDto;
import com.bullrun.security.exception.AccessDeniedException;
import com.bullrun.security.security.UserPrincipal;
import com.bullrun.security.service.PnLCalculator;
import com.bullrun.security.service.PortfolioAnalyticsService;
import com.bullrun.security.service.RiskAnalyzer;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/java/portfolio")
public class PortfolioAnalyticsController {

    private final PortfolioAnalyticsService portfolioAnalyticsService;
    private final PnLCalculator pnLCalculator;
    private final RiskAnalyzer riskAnalyzer;
    private final com.bullrun.security.service.analytics.AnalyticsExecutionService analyticsExecutionService;

    public PortfolioAnalyticsController(
        PortfolioAnalyticsService portfolioAnalyticsService,
        PnLCalculator pnLCalculator,
        RiskAnalyzer riskAnalyzer,
        com.bullrun.security.service.analytics.AnalyticsExecutionService analyticsExecutionService
    ) {
        this.portfolioAnalyticsService = portfolioAnalyticsService;
        this.pnLCalculator = pnLCalculator;
        this.riskAnalyzer = riskAnalyzer;
        this.analyticsExecutionService = analyticsExecutionService;
    }

    /**
     * Get user portfolio analytics (valuation, holdings, allocation, concentration, diversification).
     */
    @GetMapping("/{userId}")
    public ResponseEntity<PortfolioSummaryDto> getPortfolio(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        PortfolioSummaryDto summary = portfolioAnalyticsService.getPortfolioAnalytics(effectiveUserId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Alias for GET /api/java/portfolio/{userId}/analytics.
     */
    @GetMapping("/{userId}/analytics")
    public ResponseEntity<PortfolioSummaryDto> getPortfolioAnalytics(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return getPortfolio(userId, principal);
    }

    /**
     * Get user P&L calculation (realized, unrealized, total, day P&L, position breakdown).
     */
    @GetMapping("/{userId}/pnl")
    public ResponseEntity<PnLReportDto> getPnL(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        PnLReportDto pnl = pnLCalculator.calculatePnL(effectiveUserId);
        return ResponseEntity.ok(pnl);
    }

    /**
     * Get user portfolio risk metrics (exposure, concentration, VaR loss estimate, risk score).
     */
    @GetMapping("/{userId}/risk")
    public ResponseEntity<RiskMetricsDto> getRisk(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        RiskMetricsDto risk = riskAnalyzer.analyzeRisk(effectiveUserId);
        return ResponseEntity.ok(risk);
    }

    /**
     * Executes a specific analytics strategy polymorphically (PART A & B).
     */
    @GetMapping("/{userId}/strategy/{strategyName}")
    public ResponseEntity<com.bullrun.security.service.analytics.AnalyticsResult> getStrategyResult(
        @PathVariable String userId,
        @PathVariable String strategyName,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        com.bullrun.security.service.analytics.PortfolioAnalysisContext context =
            analyticsExecutionService.buildContextForUser(effectiveUserId);
        com.bullrun.security.service.analytics.AnalyticsResult result =
            analyticsExecutionService.executeStrategy(strategyName, context);
        return ResponseEntity.ok(result);
    }

    /**
     * Executes all registered analytics strategies concurrently using CompletableFuture (PART C).
     */
    @GetMapping("/{userId}/strategies/all-concurrent")
    public ResponseEntity<java.util.Map<String, com.bullrun.security.service.analytics.AnalyticsResult>> getAllStrategiesConcurrent(
        @PathVariable String userId,
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        String effectiveUserId = resolveAndAuthorizeUserId(userId, principal);
        com.bullrun.security.service.analytics.PortfolioAnalysisContext context =
            analyticsExecutionService.buildContextForUser(effectiveUserId);
        java.util.Map<String, com.bullrun.security.service.analytics.AnalyticsResult> results =
            analyticsExecutionService.executeAllStrategiesConcurrently(context);
        return ResponseEntity.ok(results);
    }

    /**
     * Lists all registered strategy names available for polymorphic execution.
     */
    @GetMapping("/strategies")
    public ResponseEntity<java.util.Set<String>> getRegisteredStrategies() {
        return ResponseEntity.ok(analyticsExecutionService.getAvailableStrategies());
    }

    /**
     * Returns thread-safe tracker statistics (PART C).
     */
    @GetMapping("/tracker")
    public ResponseEntity<java.util.Map<String, Object>> getTrackerStats() {
        return ResponseEntity.ok(analyticsExecutionService.getTracker().getSnapshotStatistics());
    }

    private String resolveAndAuthorizeUserId(String targetUserId, UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        // Support 'me' alias
        if ("me".equalsIgnoreCase(targetUserId)) {
            return principal.getId();
        }

        // Strict RBAC: normal user can only access their own analytics
        if (!principal.isAdmin() && !principal.getId().equals(targetUserId)) {
            throw new AccessDeniedException("You are not authorized to view another user's portfolio analytics.");
        }

        return targetUserId;
    }
}
