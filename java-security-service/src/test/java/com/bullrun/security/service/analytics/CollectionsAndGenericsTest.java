package com.bullrun.security.service.analytics;

import com.bullrun.security.dto.ApiResponse;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.Stock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PART B: Collections, Generics, Streams & BigDecimal Precision")
class CollectionsAndGenericsTest {

    private final PortfolioRiskAnalyzer riskAnalyzer = new PortfolioRiskAnalyzer();
    private final DiversificationAnalyticsStrategy diversificationStrategy = new DiversificationAnalyticsStrategy();

    @Test
    @DisplayName("Collections & Streams: Correct aggregation with List, Map, Set and BigDecimal")
    void testCollectionsAndStreamsAggregation() {
        Stock s1 = new Stock();
        s1.setId("stk-infy");
        s1.setSymbol("INFY");
        s1.setSector("Technology");

        Stock s2 = new Stock();
        s2.setId("stk-wipro");
        s2.setSymbol("WIPRO");
        s2.setSector("Technology");

        Stock s3 = new Stock();
        s3.setId("stk-sbi");
        s3.setSymbol("SBIN");
        s3.setSector("Banking");

        Holding h1 = new Holding();
        h1.setId("h-1");
        h1.setStockId("stk-infy");
        h1.setStock(s1);
        h1.setQuantity(new BigDecimal("100"));
        h1.setAverageBuyPrice(new BigDecimal("1500.0000"));

        Holding h2 = new Holding();
        h2.setId("h-2");
        h2.setStockId("stk-wipro");
        h2.setStock(s2);
        h2.setQuantity(new BigDecimal("200"));
        h2.setAverageBuyPrice(new BigDecimal("450.0000"));

        Holding h3 = new Holding();
        h3.setId("h-3");
        h3.setStockId("stk-sbi");
        h3.setStock(s3);
        h3.setQuantity(new BigDecimal("50"));
        h3.setAverageBuyPrice(new BigDecimal("600.0000"));

        List<Holding> holdingsList = List.of(h1, h2, h3);

        Map<String, BigDecimal> currentPrices = Map.of(
            "stk-infy", new BigDecimal("1600.0000"),
            "INFY", new BigDecimal("1600.0000"),
            "stk-wipro", new BigDecimal("480.0000"),
            "WIPRO", new BigDecimal("480.0000"),
            "stk-sbi", new BigDecimal("650.0000"),
            "SBIN", new BigDecimal("650.0000")
        );

        PortfolioAnalysisContext context = new PortfolioAnalysisContext(
            "user-1",
            holdingsList,
            currentPrices,
            Collections.emptyMap(),
            null
        );

        AnalyticsResult result = diversificationStrategy.execute(context);
        assertNotNull(result);

        // Check Set<String> of unique symbols
        Set<String> symbols = result.getUniqueSymbols();
        assertEquals(3, symbols.size());
        assertTrue(symbols.contains("INFY"));
        assertTrue(symbols.contains("WIPRO"));
        assertTrue(symbols.contains("SBIN"));

        // Check Map<String, BigDecimal> symbol-wise values
        Map<String, BigDecimal> values = result.getSymbolWiseValues();
        assertEquals(3, values.size());
        assertEquals(new BigDecimal("160000.0000"), values.get("INFY"));
        assertEquals(new BigDecimal("96000.0000"), values.get("WIPRO"));
        assertEquals(new BigDecimal("32500.0000"), values.get("SBIN"));

        // Check sector allocations aggregation Map<String, BigDecimal>
        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> sectorAllocations = (Map<String, BigDecimal>) result.getMetrics().get("sectorAllocations");
        assertNotNull(sectorAllocations);
        assertTrue(sectorAllocations.containsKey("Technology"));
        assertTrue(sectorAllocations.containsKey("Banking"));
    }

    @Test
    @DisplayName("Edge Case: Empty collections produce safe zero metrics without throwing exception")
    void testEmptyCollectionsHandling() {
        PortfolioAnalysisContext emptyContext = new PortfolioAnalysisContext(
            "user-empty",
            Collections.emptyList(),
            Collections.emptyMap(),
            Collections.emptyMap(),
            null
        );

        AnalyticsResult riskResult = riskAnalyzer.analyze(emptyContext);
        assertNotNull(riskResult);
        assertTrue(riskResult.isSuccess());
        assertEquals(0, riskResult.getUniqueSymbols().size());
        assertEquals(0, riskResult.getSymbolWiseValues().size());
        assertEquals(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP), riskResult.getMetrics().get("totalInvested"));

        AnalyticsResult divResult = diversificationStrategy.execute(emptyContext);
        assertNotNull(divResult);
        assertTrue(divResult.isSuccess());
        assertEquals(0, divResult.getUniqueSymbols().size());
    }

    @Test
    @DisplayName("Duplicate Symbols: Multiple holdings for the same symbol are merged gracefully into Map")
    void testDuplicateSymbolsInHoldings() {
        Stock s1 = new Stock();
        s1.setId("stk-rel");
        s1.setSymbol("RELIANCE");

        Holding h1 = new Holding();
        h1.setId("h-1");
        h1.setStockId("stk-rel");
        h1.setStock(s1);
        h1.setQuantity(new BigDecimal("10"));
        h1.setAverageBuyPrice(new BigDecimal("2500.0000"));

        Holding h2 = new Holding();
        h2.setId("h-2");
        h2.setStockId("stk-rel");
        h2.setStock(s1);
        h2.setQuantity(new BigDecimal("5"));
        h2.setAverageBuyPrice(new BigDecimal("2600.0000"));

        List<Holding> duplicateHoldings = List.of(h1, h2);
        Map<String, BigDecimal> prices = Map.of("stk-rel", new BigDecimal("2700.0000"), "RELIANCE", new BigDecimal("2700.0000"));

        PortfolioAnalysisContext context = new PortfolioAnalysisContext(
            "user-dup",
            duplicateHoldings,
            prices,
            Collections.emptyMap(),
            null
        );

        AnalyticsResult result = riskAnalyzer.analyze(context);
        assertEquals(1, result.getUniqueSymbols().size());
        assertTrue(result.getUniqueSymbols().contains("RELIANCE"));

        // Position value should be (10 + 5) * 2700 = 40,500
        BigDecimal mergedVal = result.getSymbolWiseValues().get("RELIANCE");
        assertEquals(new BigDecimal("40500.0000"), mergedVal);
    }

    @Test
    @DisplayName("Generics: ApiResponse<T> wraps heterogeneous data types with type safety")
    void testGenericApiResponseWrapper() {
        ApiResponse<String> stringResp = ApiResponse.success("Operation success");
        assertTrue(stringResp.isSuccess());
        assertEquals("Operation success", stringResp.getData());

        Map<String, BigDecimal> testMap = Map.of("NIFTY50", new BigDecimal("24500.50"));
        ApiResponse<Map<String, BigDecimal>> mapResp = ApiResponse.success("Map metrics", testMap);
        assertTrue(mapResp.isSuccess());
        assertEquals(new BigDecimal("24500.50"), mapResp.getData().get("NIFTY50"));

        ApiResponse<Void> errResp = ApiResponse.error("Something went wrong");
        assertFalse(errResp.isSuccess());
        assertNull(errResp.getData());
        assertEquals("Something went wrong", errResp.getMessage());
    }
}
