package com.bullrun.security.service.analytics;

import com.bullrun.security.model.Holding;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Strategy implementation focusing on sector diversification, asset concentration, and collection streams.
 * Heavily utilizes Collections (List, Map, Set) and Java Streams for real business aggregation.
 */
@Component("diversificationAnalyticsStrategy")
public class DiversificationAnalyticsStrategy implements AnalyticsStrategy {

    private static final int SCALE = 4;
    private static final int PERCENT_SCALE = 2;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    @Override
    public String getStrategyName() {
        return "DIVERSIFICATION";
    }

    @Override
    public AnalyticsCategory getCategory() {
        return AnalyticsCategory.DIVERSIFICATION;
    }

    @Override
    public AnalyticsResult execute(PortfolioAnalysisContext context) {
        List<Holding> holdings = context.getHoldings();

        if (holdings.isEmpty()) {
            return AnalyticsResult.builder()
                .strategyName(getStrategyName())
                .category(getCategory())
                .metrics(Map.of("diversificationRating", "NO_HOLDINGS", "sectorsCount", 0))
                .symbolWiseValues(Collections.emptyMap())
                .uniqueSymbols(Collections.emptySet())
                .success(true)
                .message("No holdings available for diversification analysis")
                .build();
        }

        // 1. Group positions by sector using Streams & Collectors (PART B)
        Map<String, List<Holding>> holdingsBySector = holdings.stream()
            .collect(Collectors.groupingBy(h -> {
                if (h.getStock() != null && h.getStock().getSector() != null && !h.getStock().getSector().isBlank()) {
                    return h.getStock().getSector();
                }
                return "Unclassified";
            }));

        // 2. Calculate sector-wise total valuation Map<String, BigDecimal> (PART B)
        Map<String, BigDecimal> sectorValues = new HashMap<>();
        Map<String, BigDecimal> symbolValues = new HashMap<>();
        BigDecimal totalPortfolioValue = BigDecimal.ZERO;

        for (Map.Entry<String, List<Holding>> entry : holdingsBySector.entrySet()) {
            String sector = entry.getKey();
            List<Holding> sectorHoldings = entry.getValue();

            BigDecimal sectorSum = sectorHoldings.stream()
                .map(h -> {
                    String symbol = h.getStock() != null ? h.getStock().getSymbol() : h.getStockId();
                    BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
                    BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
                    BigDecimal price = context.getCurrentPrices().getOrDefault(h.getStockId(),
                        context.getCurrentPrices().getOrDefault(symbol, avgBuy));
                    BigDecimal val = qty.multiply(price).setScale(SCALE, RoundingMode.HALF_UP);
                    symbolValues.merge(symbol, val, (a, b) -> a.add(b));
                    return val;
                })
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

            sectorValues.put(sector, sectorSum);
            totalPortfolioValue = totalPortfolioValue.add(sectorSum);
        }

        // 3. Calculate sector percentages Map<String, BigDecimal>
        Map<String, BigDecimal> sectorPercentages = new HashMap<>();
        for (Map.Entry<String, BigDecimal> entry : sectorValues.entrySet()) {
            BigDecimal pct = BigDecimal.ZERO;
            if (totalPortfolioValue.compareTo(BigDecimal.ZERO) > 0) {
                pct = entry.getValue().multiply(ONE_HUNDRED)
                    .divide(totalPortfolioValue, PERCENT_SCALE, RoundingMode.HALF_UP);
            }
            sectorPercentages.put(entry.getKey(), pct);
        }

        // 4. Extract unique sectors Set<String> and unique symbols Set<String> (PART B)
        Set<String> uniqueSectors = Set.copyOf(holdingsBySector.keySet());
        Set<String> uniqueSymbols = holdings.stream()
            .map(h -> h.getStock() != null ? h.getStock().getSymbol() : h.getStockId())
            .filter(Objects::nonNull)
            .collect(Collectors.toUnmodifiableSet());

        // Find dominant sector
        String dominantSector = "None";
        BigDecimal maxSectorVal = BigDecimal.ZERO;
        for (Map.Entry<String, BigDecimal> entry : sectorPercentages.entrySet()) {
            if (entry.getValue().compareTo(maxSectorVal) > 0) {
                maxSectorVal = entry.getValue();
                dominantSector = entry.getKey();
            }
        }

        BigDecimal dominantSectorPct = sectorPercentages.getOrDefault(dominantSector, BigDecimal.ZERO);

        String rating;
        if (uniqueSectors.size() >= 4 && dominantSectorPct.compareTo(new BigDecimal("40.00")) <= 0) {
            rating = "HIGHLY_DIVERSIFIED";
        } else if (uniqueSectors.size() >= 2 && dominantSectorPct.compareTo(new BigDecimal("60.00")) <= 0) {
            rating = "MODERATELY_DIVERSIFIED";
        } else {
            rating = "SECTOR_CONCENTRATED";
        }

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalMarketValue", totalPortfolioValue);
        metrics.put("sectorsCount", uniqueSectors.size());
        metrics.put("uniqueSectors", uniqueSectors);
        metrics.put("sectorAllocations", sectorPercentages);
        metrics.put("dominantSector", dominantSector);
        metrics.put("dominantSectorPercentage", dominantSectorPct);
        metrics.put("diversificationRating", rating);

        return AnalyticsResult.builder()
            .strategyName(getStrategyName())
            .category(getCategory())
            .metrics(metrics)
            .symbolWiseValues(symbolValues)
            .uniqueSymbols(uniqueSymbols)
            .success(true)
            .message("Diversification analysis complete")
            .build();
    }
}
