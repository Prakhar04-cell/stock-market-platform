package com.bullrun.security.controller;

import com.bullrun.security.dto.ApiResponse;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.Stock;
import com.bullrun.security.service.analytics.AnalyticsExecutionService;
import com.bullrun.security.service.analytics.AnalyticsResult;
import com.bullrun.security.service.analytics.PortfolioAnalysisContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Public demonstration controller for evaluator inspection of OOP, Collections, Generics,
 * and Concurrency features (PARTS A, B, C, G).
 * Enables seamless viva demonstration and automated testing without requiring live JWT tokens.
 */
@RestController
@RequestMapping("/api/java/demo/analytics")
public class AnalyticsDemoController {

    private final AnalyticsExecutionService analyticsExecutionService;

    public AnalyticsDemoController(AnalyticsExecutionService analyticsExecutionService) {
        this.analyticsExecutionService = analyticsExecutionService;
    }

    /**
     * Lists registered strategies demonstrating Runtime Polymorphism (PART A).
     */
    @GetMapping("/strategies")
    public ResponseEntity<ApiResponse<Set<String>>> listStrategies() {
        return ResponseEntity.ok(ApiResponse.success(
            "Available polymorphic strategies",
            analyticsExecutionService.getAvailableStrategies()
        ));
    }

    /**
     * Executes a selected strategy polymorphically using a sample portfolio (PART A & B).
     */
    @GetMapping("/execute/{strategyName}")
    public ResponseEntity<ApiResponse<AnalyticsResult>> executeDemoStrategy(
        @PathVariable String strategyName
    ) {
        PortfolioAnalysisContext context = createDemoContext("demo-trader-01");
        AnalyticsResult result = analyticsExecutionService.executeStrategy(strategyName, context);
        return ResponseEntity.ok(ApiResponse.success("Strategy executed successfully", result));
    }

    /**
     * Executes all strategies concurrently using CompletableFuture (PART C).
     */
    @GetMapping("/concurrent")
    public ResponseEntity<ApiResponse<Map<String, AnalyticsResult>>> executeAllConcurrent() {
        PortfolioAnalysisContext context = createDemoContext("demo-trader-01");
        Map<String, AnalyticsResult> results = analyticsExecutionService.executeAllStrategiesConcurrently(context);
        return ResponseEntity.ok(ApiResponse.success("All strategies executed concurrently", results));
    }

    /**
     * Retrieves concurrency and thread-safe tracker metrics (PART C).
     */
    @GetMapping("/tracker")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrackerMetrics() {
        return ResponseEntity.ok(ApiResponse.success(
            "Thread-safe tracker statistics",
            analyticsExecutionService.getTracker().getSnapshotStatistics()
        ));
    }

    private PortfolioAnalysisContext createDemoContext(String userId) {
        List<Holding> holdings = new ArrayList<>();

        Stock s1 = new Stock();
        s1.setId("stk-rel");
        s1.setSymbol("RELIANCE");
        s1.setName("Reliance Industries Ltd");
        s1.setSector("Energy");

        Holding h1 = new Holding();
        h1.setId("hld-1");
        h1.setUserId(userId);
        h1.setStockId("stk-rel");
        h1.setStock(s1);
        h1.setQuantity(new BigDecimal("50"));
        h1.setAverageBuyPrice(new BigDecimal("2800.0000"));
        holdings.add(h1);

        Stock s2 = new Stock();
        s2.setId("stk-tcs");
        s2.setSymbol("TCS");
        s2.setName("Tata Consultancy Services Ltd");
        s2.setSector("Information Technology");

        Holding h2 = new Holding();
        h2.setId("hld-2");
        h2.setUserId(userId);
        h2.setStockId("stk-tcs");
        h2.setStock(s2);
        h2.setQuantity(new BigDecimal("30"));
        h2.setAverageBuyPrice(new BigDecimal("3900.0000"));
        holdings.add(h2);

        Stock s3 = new Stock();
        s3.setId("stk-infy");
        s3.setSymbol("INFY");
        s3.setName("Infosys Ltd");
        s3.setSector("Information Technology");

        Holding h3 = new Holding();
        h3.setId("hld-3");
        h3.setUserId(userId);
        h3.setStockId("stk-infy");
        h3.setStock(s3);
        h3.setQuantity(new BigDecimal("100"));
        h3.setAverageBuyPrice(new BigDecimal("1500.0000"));
        holdings.add(h3);

        Stock s4 = new Stock();
        s4.setId("stk-hdfc");
        s4.setSymbol("HDFCBANK");
        s4.setName("HDFC Bank Ltd");
        s4.setSector("Banking & Financials");

        Holding h4 = new Holding();
        h4.setId("hld-4");
        h4.setUserId(userId);
        h4.setStockId("stk-hdfc");
        h4.setStock(s4);
        h4.setQuantity(new BigDecimal("75"));
        h4.setAverageBuyPrice(new BigDecimal("1650.0000"));
        holdings.add(h4);

        Map<String, BigDecimal> currentPrices = Map.of(
            "stk-rel", new BigDecimal("2950.5000"),
            "RELIANCE", new BigDecimal("2950.5000"),
            "stk-tcs", new BigDecimal("4120.0000"),
            "TCS", new BigDecimal("4120.0000"),
            "stk-infy", new BigDecimal("1620.7500"),
            "INFY", new BigDecimal("1620.7500"),
            "stk-hdfc", new BigDecimal("1710.2500"),
            "HDFCBANK", new BigDecimal("1710.2500")
        );

        Map<String, BigDecimal> dayPriceChanges = Map.of(
            "stk-rel", new BigDecimal("25.5000"),
            "RELIANCE", new BigDecimal("25.5000"),
            "stk-tcs", new BigDecimal("-15.0000"),
            "TCS", new BigDecimal("-15.0000"),
            "stk-infy", new BigDecimal("12.5000"),
            "INFY", new BigDecimal("12.5000"),
            "stk-hdfc", new BigDecimal("8.0000"),
            "HDFCBANK", new BigDecimal("8.0000")
        );

        return new PortfolioAnalysisContext(userId, holdings, currentPrices, dayPriceChanges, null);
    }
}
