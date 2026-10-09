package com.bullrun.security.service.analytics;

import com.bullrun.security.exception.InvalidAnalyticsRequestException;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.Stock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PART A: Java OOP - Inheritance, Polymorphism, Interfaces, & Exceptions")
class AnalyticsOopPolymorphismTest {

    private PortfolioRiskAnalyzer riskAnalyzer;
    private PortfolioPerformanceAnalyzer performanceAnalyzer;
    private DiversificationAnalyticsStrategy diversificationStrategy;

    private List<Holding> sampleHoldings;
    private Map<String, BigDecimal> currentPrices;
    private Map<String, BigDecimal> dayChanges;

    @BeforeEach
    void setUp() {
        riskAnalyzer = new PortfolioRiskAnalyzer();
        performanceAnalyzer = new PortfolioPerformanceAnalyzer();
        diversificationStrategy = new DiversificationAnalyticsStrategy();

        sampleHoldings = new ArrayList<>();

        Stock s1 = new Stock();
        s1.setId("stk-tcs");
        s1.setSymbol("TCS");
        s1.setName("Tata Consultancy Services");
        s1.setSector("Information Technology");

        Holding h1 = new Holding();
        h1.setId("hld-1");
        h1.setStockId("stk-tcs");
        h1.setStock(s1);
        h1.setQuantity(new BigDecimal("10"));
        h1.setAverageBuyPrice(new BigDecimal("3500.0000"));
        sampleHoldings.add(h1);

        Stock s2 = new Stock();
        s2.setId("stk-infy");
        s2.setSymbol("INFY");
        s2.setName("Infosys");
        s2.setSector("Information Technology");

        Holding h2 = new Holding();
        h2.setId("hld-2");
        h2.setStockId("stk-infy");
        h2.setStock(s2);
        h2.setQuantity(new BigDecimal("20"));
        h2.setAverageBuyPrice(new BigDecimal("1500.0000"));
        sampleHoldings.add(h2);

        currentPrices = Map.of(
            "stk-tcs", new BigDecimal("3800.0000"),
            "TCS", new BigDecimal("3800.0000"),
            "stk-infy", new BigDecimal("1600.0000"),
            "INFY", new BigDecimal("1600.0000")
        );

        dayChanges = Map.of(
            "stk-tcs", new BigDecimal("50.0000"),
            "TCS", new BigDecimal("50.0000"),
            "stk-infy", new BigDecimal("-20.0000"),
            "INFY", new BigDecimal("-20.0000")
        );
    }

    @Test
    @DisplayName("OOP Inheritance: AbstractPortfolioAnalyzer executes template method and subclasses compute specialized metrics")
    void testInheritanceAndTemplateMethod() {
        PortfolioAnalysisContext context = new PortfolioAnalysisContext(
            "usr-101",
            sampleHoldings,
            currentPrices,
            dayChanges,
            null
        );

        // Verify PortfolioRiskAnalyzer extends AbstractPortfolioAnalyzer
        assertTrue(riskAnalyzer instanceof AbstractPortfolioAnalyzer, "Risk analyzer must extend AbstractPortfolioAnalyzer");
        AnalyticsResult riskResult = riskAnalyzer.analyze(context);

        assertNotNull(riskResult);
        assertEquals("PORTFOLIO_RISK_ANALYZER", riskResult.getStrategyName());
        assertEquals(AnalyticsCategory.RISK, riskResult.getCategory());
        assertTrue(riskResult.isSuccess());

        // Template method computed common metrics
        assertNotNull(riskResult.getMetrics().get("totalInvested"));
        assertNotNull(riskResult.getMetrics().get("totalMarketValue"));
        assertEquals(2, riskResult.getUniqueSymbols().size());

        // Subclass computed specific metrics
        assertNotNull(riskResult.getMetrics().get("riskScore"));
        assertNotNull(riskResult.getMetrics().get("var95DailyAmount"));
        assertNotNull(riskResult.getMetrics().get("hhiConcentrationIndex"));

        // Verify PortfolioPerformanceAnalyzer extends AbstractPortfolioAnalyzer
        assertTrue(performanceAnalyzer instanceof AbstractPortfolioAnalyzer, "Performance analyzer must extend AbstractPortfolioAnalyzer");
        AnalyticsResult perfResult = performanceAnalyzer.analyze(context);

        assertNotNull(perfResult);
        assertEquals("PORTFOLIO_PERFORMANCE_ANALYZER", perfResult.getStrategyName());
        assertEquals(AnalyticsCategory.PERFORMANCE, perfResult.getCategory());
        assertNotNull(perfResult.getMetrics().get("winningPositionsCount"));
        assertNotNull(perfResult.getMetrics().get("alphaSpreadPercentage"));
    }

    @Test
    @DisplayName("OOP Polymorphism: Multiple strategies executed via common AnalyticsStrategy interface")
    void testRuntimePolymorphism() {
        AnalyticsStrategy riskStrategy = new RiskAnalyticsStrategy(riskAnalyzer);
        AnalyticsStrategy perfStrategy = new PerformanceAnalyticsStrategy(performanceAnalyzer);
        AnalyticsStrategy divStrategy = diversificationStrategy;

        List<AnalyticsStrategy> strategies = List.of(riskStrategy, perfStrategy, divStrategy);
        PortfolioAnalysisContext context = new PortfolioAnalysisContext(
            "usr-101",
            sampleHoldings,
            currentPrices,
            dayChanges,
            null
        );

        Map<String, AnalyticsResult> results = new HashMap<>();

        // Polymorphic invocation loop: single interface reference executing 3 distinct strategies
        for (AnalyticsStrategy strategy : strategies) {
            AnalyticsResult res = strategy.execute(context);
            results.put(strategy.getStrategyName(), res);
            assertTrue(res.isSuccess());
        }

        assertEquals(3, results.size());
        assertTrue(results.containsKey("RISK"));
        assertTrue(results.containsKey("PERFORMANCE"));
        assertTrue(results.containsKey("DIVERSIFICATION"));

        assertEquals(AnalyticsCategory.RISK, results.get("RISK").getCategory());
        assertEquals(AnalyticsCategory.PERFORMANCE, results.get("PERFORMANCE").getCategory());
        assertEquals(AnalyticsCategory.DIVERSIFICATION, results.get("DIVERSIFICATION").getCategory());
    }

    @Test
    @DisplayName("Exception Handling: Null or invalid context throws InvalidAnalyticsRequestException")
    void testCustomExceptionHandling() {
        assertThrows(InvalidAnalyticsRequestException.class, () -> {
            riskAnalyzer.analyze(null);
        }, "Null context must throw InvalidAnalyticsRequestException");

        assertThrows(InvalidAnalyticsRequestException.class, () -> {
            PortfolioAnalysisContext invalidContext = new PortfolioAnalysisContext(
                "",
                sampleHoldings,
                currentPrices,
                dayChanges,
                null
            );
            riskAnalyzer.analyze(invalidContext);
        }, "Blank user ID must throw InvalidAnalyticsRequestException");
    }
}
