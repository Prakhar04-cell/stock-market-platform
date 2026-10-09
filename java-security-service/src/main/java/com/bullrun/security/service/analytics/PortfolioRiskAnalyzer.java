package com.bullrun.security.service.analytics;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Concrete implementation of AbstractPortfolioAnalyzer specializing in Risk & Exposure analysis.
 * Implements OOP Inheritance by extending AbstractPortfolioAnalyzer.
 */
@Component
public class PortfolioRiskAnalyzer extends AbstractPortfolioAnalyzer {

    public static final String ANALYZER_NAME = "PORTFOLIO_RISK_ANALYZER";
    private static final BigDecimal DEFAULT_DAILY_VOLATILITY = new BigDecimal("0.015"); // 1.5% daily volatility baseline
    private static final BigDecimal VAR_95_Z_SCORE = new BigDecimal("1.645"); // 95% confidence Z-score

    @Override
    public String getAnalyzerName() {
        return ANALYZER_NAME;
    }

    @Override
    public AnalyticsCategory getCategory() {
        return AnalyticsCategory.RISK;
    }

    @Override
    protected Map<String, Object> computeSpecificMetrics(
        PortfolioAnalysisContext context,
        BigDecimal totalInvested,
        BigDecimal totalMarketValue,
        Map<String, BigDecimal> positionValues
    ) {
        Map<String, Object> metrics = new HashMap<>();

        if (positionValues.isEmpty() || totalMarketValue.compareTo(BigDecimal.ZERO) <= 0) {
            metrics.put("riskScore", 0);
            metrics.put("riskRating", "NONE");
            metrics.put("var95DailyAmount", BigDecimal.ZERO);
            metrics.put("var95Percentage", BigDecimal.ZERO);
            metrics.put("topHoldingSymbol", "NONE");
            metrics.put("topHoldingPercentage", BigDecimal.ZERO);
            metrics.put("top3ConcentrationPercentage", BigDecimal.ZERO);
            metrics.put("hhiConcentrationIndex", BigDecimal.ZERO);
            metrics.put("diversificationIndicator", "EMPTY");
            return metrics;
        }

        Map<String, BigDecimal> weights = calculatePositionWeights(positionValues, totalMarketValue);

        // Sort weights descending
        List<Map.Entry<String, BigDecimal>> sortedHoldings = new ArrayList<>(weights.entrySet());
        sortedHoldings.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        String topSymbol = sortedHoldings.get(0).getKey();
        BigDecimal topHoldingPct = sortedHoldings.get(0).getValue();

        // Top 3 concentration
        BigDecimal top3Pct = BigDecimal.ZERO;
        for (int i = 0; i < Math.min(3, sortedHoldings.size()); i++) {
            top3Pct = top3Pct.add(sortedHoldings.get(i).getValue());
        }

        // Herfindahl-Hirschman Index (HHI): sum of squared market share percentages (0 to 10,000)
        BigDecimal hhi = BigDecimal.ZERO;
        for (BigDecimal weight : weights.values()) {
            hhi = hhi.add(weight.multiply(weight));
        }
        hhi = hhi.setScale(2, RoundingMode.HALF_UP);

        // Parametric Value-at-Risk (95% 1-day)
        BigDecimal var95DailyAmount = totalMarketValue
            .multiply(DEFAULT_DAILY_VOLATILITY)
            .multiply(VAR_95_Z_SCORE)
            .setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);

        BigDecimal var95Pct = safeDivide(
            var95DailyAmount.multiply(ONE_HUNDRED),
            totalMarketValue,
            PERCENT_SCALE
        );

        // Compute composite risk score (0-100)
        int riskScore = calculateCompositeRiskScore(topHoldingPct, top3Pct, weights.size(), var95Pct);
        String riskRating = determineRiskRating(riskScore);
        String diversificationIndicator = determineDiversification(weights.size(), topHoldingPct);

        metrics.put("riskScore", riskScore);
        metrics.put("riskRating", riskRating);
        metrics.put("var95DailyAmount", var95DailyAmount);
        metrics.put("var95Percentage", var95Pct);
        metrics.put("topHoldingSymbol", topSymbol);
        metrics.put("topHoldingPercentage", topHoldingPct);
        metrics.put("top3ConcentrationPercentage", top3Pct);
        metrics.put("hhiConcentrationIndex", hhi);
        metrics.put("diversificationIndicator", diversificationIndicator);
        metrics.put("positionWeights", weights);

        return metrics;
    }

    private int calculateCompositeRiskScore(
        BigDecimal topHoldingPct,
        BigDecimal top3Pct,
        int distinctAssets,
        BigDecimal varPct
    ) {
        int score = 20; // base score

        // Concentration penalty
        if (topHoldingPct.compareTo(new BigDecimal("50")) > 0) {
            score += 35;
        } else if (topHoldingPct.compareTo(new BigDecimal("30")) > 0) {
            score += 20;
        } else if (topHoldingPct.compareTo(new BigDecimal("15")) > 0) {
            score += 10;
        }

        if (top3Pct.compareTo(new BigDecimal("80")) > 0) {
            score += 25;
        } else if (top3Pct.compareTo(new BigDecimal("60")) > 0) {
            score += 15;
        }

        // Diversification bonus
        if (distinctAssets >= 10) {
            score -= 15;
        } else if (distinctAssets >= 5) {
            score -= 8;
        } else if (distinctAssets <= 2) {
            score += 15;
        }

        // VaR factor
        if (varPct.compareTo(new BigDecimal("3.0")) > 0) {
            score += 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    private String determineRiskRating(int score) {
        if (score >= 75) return "VERY_HIGH";
        if (score >= 55) return "HIGH";
        if (score >= 35) return "MODERATE";
        return "CONSERVATIVE";
    }

    private String determineDiversification(int distinctAssets, BigDecimal topHoldingPct) {
        if (distinctAssets >= 8 && topHoldingPct.compareTo(new BigDecimal("25")) <= 0) {
            return "WELL_DIVERSIFIED";
        }
        if (distinctAssets >= 4 && topHoldingPct.compareTo(new BigDecimal("40")) <= 0) {
            return "MODERATELY_DIVERSIFIED";
        }
        return "HIGHLY_CONCENTRATED";
    }
}
