package com.bullrun.security.service.analytics;

import com.bullrun.security.exception.InvalidAnalyticsRequestException;
import com.bullrun.security.model.Holding;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Abstract Base Class for portfolio analytics calculations (OOP Inheritance & Template Method Pattern).
 * Encapsulates reusable financial mathematics, BigDecimal precision standards,
 * and collection stream transformations.
 */
public abstract class AbstractPortfolioAnalyzer {

    protected static final int CURRENCY_SCALE = 4;
    protected static final int PERCENT_SCALE = 2;
    protected static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    /**
     * Template Method defining the standard execution algorithm for portfolio analytics.
     * Enforces context validation, calculates standard portfolio valuation,
     * extracts unique symbol sets, executes subclass-specific analytics,
     * and compiles the final AnalyticsResult.
     */
    public final AnalyticsResult analyze(PortfolioAnalysisContext context) {
        if (context == null) {
            throw new InvalidAnalyticsRequestException("Portfolio analysis context cannot be null");
        }
        if (context.getUserId() == null || context.getUserId().trim().isEmpty()) {
            throw new InvalidAnalyticsRequestException("User identifier is required for portfolio analysis");
        }

        List<Holding> holdings = context.getHoldings();
        Set<String> uniqueSymbols = extractUniqueSymbols(holdings);

        if (holdings.isEmpty()) {
            return buildEmptyPortfolioResult(context.getUserId(), uniqueSymbols);
        }

        Map<String, BigDecimal> currentPrices = context.getCurrentPrices();
        BigDecimal totalInvested = calculateTotalInvested(holdings);
        Map<String, BigDecimal> positionValues = calculatePositionValues(holdings, currentPrices);
        BigDecimal totalMarketValue = positionValues.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);

        BigDecimal unrealizedPnl = totalMarketValue.subtract(totalInvested)
            .setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        BigDecimal profitPct = safeDivide(
            unrealizedPnl.multiply(ONE_HUNDRED),
            totalInvested,
            PERCENT_SCALE
        );

        // Execute concrete polymorphic calculations
        Map<String, Object> specificMetrics = computeSpecificMetrics(
            context,
            totalInvested,
            totalMarketValue,
            positionValues
        );

        Map<String, Object> combinedMetrics = new HashMap<>(specificMetrics);
        combinedMetrics.put("totalInvested", totalInvested);
        combinedMetrics.put("totalMarketValue", totalMarketValue);
        combinedMetrics.put("unrealizedPnl", unrealizedPnl);
        combinedMetrics.put("profitPercentage", profitPct);
        combinedMetrics.put("holdingsCount", holdings.size());
        combinedMetrics.put("uniqueSymbolsCount", uniqueSymbols.size());

        return AnalyticsResult.builder()
            .strategyName(getAnalyzerName())
            .category(getCategory())
            .metrics(combinedMetrics)
            .symbolWiseValues(positionValues)
            .uniqueSymbols(uniqueSymbols)
            .success(true)
            .message("Analysis completed successfully")
            .build();
    }

    /**
     * Abstract hook for concrete subclasses to supply their domain-specific calculations.
     */
    protected abstract Map<String, Object> computeSpecificMetrics(
        PortfolioAnalysisContext context,
        BigDecimal totalInvested,
        BigDecimal totalMarketValue,
        Map<String, BigDecimal> positionValues
    );

    public abstract String getAnalyzerName();

    public abstract AnalyticsCategory getCategory();

    /**
     * Extracts unique stock symbols using Streams and Collections Set (PART B).
     */
    public Set<String> extractUniqueSymbols(List<Holding> holdings) {
        if (holdings == null || holdings.isEmpty()) {
            return Collections.emptySet();
        }
        return holdings.stream()
            .map(h -> h.getStock() != null ? h.getStock().getSymbol() : h.getStockId())
            .filter(Objects::nonNull)
            .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * Aggregates total invested amount across holdings using Streams and BigDecimal.
     */
    protected BigDecimal calculateTotalInvested(List<Holding> holdings) {
        if (holdings == null || holdings.isEmpty()) {
            return BigDecimal.ZERO.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        }
        return holdings.stream()
            .map(h -> {
                BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
                BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
                return qty.multiply(avgBuy);
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Calculates symbol-to-market-value mapping using Streams and Collectors.toMap (PART B).
     */
    protected Map<String, BigDecimal> calculatePositionValues(
        List<Holding> holdings,
        Map<String, BigDecimal> currentPrices
    ) {
        if (holdings == null || holdings.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, BigDecimal> values = new HashMap<>();
        for (Holding h : holdings) {
            String symbol = h.getStock() != null ? h.getStock().getSymbol() : h.getStockId();
            if (symbol == null) {
                symbol = "UNKNOWN";
            }
            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
            BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
            BigDecimal price = currentPrices.getOrDefault(h.getStockId(),
                currentPrices.getOrDefault(symbol, avgBuy));

            BigDecimal val = qty.multiply(price).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            values.merge(symbol, val, BigDecimal::add);
        }
        return Collections.unmodifiableMap(values);
    }

    /**
     * Calculates portfolio allocation weights as percentage for each symbol.
     */
    protected Map<String, BigDecimal> calculatePositionWeights(
        Map<String, BigDecimal> positionValues,
        BigDecimal totalMarketValue
    ) {
        if (positionValues == null || positionValues.isEmpty() || totalMarketValue == null || totalMarketValue.compareTo(BigDecimal.ZERO) <= 0) {
            return Collections.emptyMap();
        }

        Map<String, BigDecimal> weights = new HashMap<>();
        for (Map.Entry<String, BigDecimal> entry : positionValues.entrySet()) {
            BigDecimal weight = safeDivide(
                entry.getValue().multiply(ONE_HUNDRED),
                totalMarketValue,
                PERCENT_SCALE
            );
            weights.put(entry.getKey(), weight);
        }
        return Collections.unmodifiableMap(weights);
    }

    /**
     * Safe BigDecimal division avoiding ArithmeticException (divide by zero).
     */
    protected BigDecimal safeDivide(BigDecimal numerator, BigDecimal denominator, int scale) {
        if (numerator == null || denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO.setScale(scale, RoundingMode.HALF_UP);
        }
        return numerator.divide(denominator, scale, RoundingMode.HALF_UP);
    }

    private AnalyticsResult buildEmptyPortfolioResult(String userId, Set<String> uniqueSymbols) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalInvested", BigDecimal.ZERO.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP));
        metrics.put("totalMarketValue", BigDecimal.ZERO.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP));
        metrics.put("unrealizedPnl", BigDecimal.ZERO.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP));
        metrics.put("profitPercentage", BigDecimal.ZERO.setScale(PERCENT_SCALE, RoundingMode.HALF_UP));
        metrics.put("holdingsCount", 0);
        metrics.put("uniqueSymbolsCount", 0);
        metrics.put("notice", "Portfolio has no active holdings");

        return AnalyticsResult.builder()
            .strategyName(getAnalyzerName())
            .category(getCategory())
            .metrics(metrics)
            .symbolWiseValues(Collections.emptyMap())
            .uniqueSymbols(uniqueSymbols)
            .success(true)
            .message("Empty portfolio analyzed")
            .build();
    }
}
