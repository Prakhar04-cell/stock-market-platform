package com.bullrun.security.service.analytics;

import com.bullrun.security.model.Holding;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Concrete implementation of AbstractPortfolioAnalyzer specializing in Returns, PnL, and Performance attribution.
 * Implements OOP Inheritance by extending AbstractPortfolioAnalyzer.
 */
@Component
public class PortfolioPerformanceAnalyzer extends AbstractPortfolioAnalyzer {

    public static final String ANALYZER_NAME = "PORTFOLIO_PERFORMANCE_ANALYZER";
    private static final BigDecimal NIFTY_BENCHMARK_RETURN_PCT = new BigDecimal("12.50"); // 12.5% annualized baseline

    @Override
    public String getAnalyzerName() {
        return ANALYZER_NAME;
    }

    @Override
    public AnalyticsCategory getCategory() {
        return AnalyticsCategory.PERFORMANCE;
    }

    @Override
    protected Map<String, Object> computeSpecificMetrics(
        PortfolioAnalysisContext context,
        BigDecimal totalInvested,
        BigDecimal totalMarketValue,
        Map<String, BigDecimal> positionValues
    ) {
        Map<String, Object> metrics = new HashMap<>();

        List<Holding> holdings = context.getHoldings();
        Map<String, BigDecimal> dayChanges = context.getDayPriceChanges();

        BigDecimal totalDayPnl = BigDecimal.ZERO;
        int winnersCount = 0;
        int losersCount = 0;
        int breakEvenCount = 0;

        String bestPerformerSymbol = "NONE";
        BigDecimal bestPerformerGainPct = new BigDecimal("-999999");

        String worstPerformerSymbol = "NONE";
        BigDecimal worstPerformerGainPct = new BigDecimal("999999");

        for (Holding h : holdings) {
            String symbol = h.getStock() != null ? h.getStock().getSymbol() : h.getStockId();
            if (symbol == null) symbol = "UNKNOWN";

            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
            BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
            BigDecimal invested = qty.multiply(avgBuy).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);

            BigDecimal currentPrice = context.getCurrentPrices().getOrDefault(
                h.getStockId(),
                context.getCurrentPrices().getOrDefault(symbol, avgBuy)
            );
            BigDecimal currentValue = qty.multiply(currentPrice).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            BigDecimal positionPnl = currentValue.subtract(invested).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);

            BigDecimal gainPct = safeDivide(
                positionPnl.multiply(ONE_HUNDRED),
                invested,
                PERCENT_SCALE
            );

            if (positionPnl.compareTo(BigDecimal.ZERO) > 0) {
                winnersCount++;
            } else if (positionPnl.compareTo(BigDecimal.ZERO) < 0) {
                losersCount++;
            } else {
                breakEvenCount++;
            }

            if (gainPct.compareTo(bestPerformerGainPct) > 0) {
                bestPerformerGainPct = gainPct;
                bestPerformerSymbol = symbol;
            }

            if (gainPct.compareTo(worstPerformerGainPct) < 0) {
                worstPerformerGainPct = gainPct;
                worstPerformerSymbol = symbol;
            }

            // Day PnL
            BigDecimal dayChange = dayChanges.getOrDefault(h.getStockId(), dayChanges.getOrDefault(symbol, BigDecimal.ZERO));
            BigDecimal posDayPnl = dayChange.multiply(qty).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            totalDayPnl = totalDayPnl.add(posDayPnl);
        }

        BigDecimal totalPnl = totalMarketValue.subtract(totalInvested).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        BigDecimal totalReturnPct = safeDivide(
            totalPnl.multiply(ONE_HUNDRED),
            totalInvested,
            PERCENT_SCALE
        );

        BigDecimal dayReturnPct = safeDivide(
            totalDayPnl.multiply(ONE_HUNDRED),
            totalMarketValue,
            PERCENT_SCALE
        );

        // Alpha proxy vs NIFTY benchmark
        BigDecimal alphaSpread = totalReturnPct.subtract(NIFTY_BENCHMARK_RETURN_PCT)
            .setScale(PERCENT_SCALE, RoundingMode.HALF_UP);

        BigDecimal winLossRatio = losersCount > 0
            ? new BigDecimal(winnersCount).divide(new BigDecimal(losersCount), 2, RoundingMode.HALF_UP)
            : new BigDecimal(winnersCount).setScale(2, RoundingMode.HALF_UP);

        metrics.put("dayPnl", totalDayPnl);
        metrics.put("dayReturnPercentage", dayReturnPct);
        metrics.put("winningPositionsCount", winnersCount);
        metrics.put("losingPositionsCount", losersCount);
        metrics.put("breakEvenPositionsCount", breakEvenCount);
        metrics.put("winLossRatio", winLossRatio);
        metrics.put("bestPerformerSymbol", bestPerformerSymbol);
        metrics.put("bestPerformerGainPercentage", bestPerformerGainPct.compareTo(new BigDecimal("-999999")) == 0 ? BigDecimal.ZERO : bestPerformerGainPct);
        metrics.put("worstPerformerSymbol", worstPerformerSymbol);
        metrics.put("worstPerformerGainPercentage", worstPerformerGainPct.compareTo(new BigDecimal("999999")) == 0 ? BigDecimal.ZERO : worstPerformerGainPct);
        metrics.put("benchmarkReturnPercentage", NIFTY_BENCHMARK_RETURN_PCT);
        metrics.put("alphaSpreadPercentage", alphaSpread);
        metrics.put("performanceStatus", totalPnl.compareTo(BigDecimal.ZERO) >= 0 ? "PROFITABLE" : "DRAWDOWN");

        return metrics;
    }
}
