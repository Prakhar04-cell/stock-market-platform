package com.bullrun.security.service;

import com.bullrun.security.dto.RiskMetricsDto;
import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Wallet;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import com.bullrun.security.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class RiskAnalyzer {

    private final HoldingRepository holdingRepository;
    private final MarketPriceRepository marketPriceRepository;
    private final WalletRepository walletRepository;
    private final TradingStatisticsService tradingStatisticsService;

    public RiskAnalyzer(
        HoldingRepository holdingRepository,
        MarketPriceRepository marketPriceRepository,
        WalletRepository walletRepository,
        TradingStatisticsService tradingStatisticsService
    ) {
        this.holdingRepository = holdingRepository;
        this.marketPriceRepository = marketPriceRepository;
        this.walletRepository = walletRepository;
        this.tradingStatisticsService = tradingStatisticsService;
    }

    @Transactional(readOnly = true)
    public RiskMetricsDto analyzeRisk(String userId) {
        List<Holding> holdings = holdingRepository.findActiveHoldingsByUserId(userId);
        Optional<Wallet> walletOpt = walletRepository.findByUserId(userId);

        if (holdings.isEmpty()) {
            return RiskMetricsDto.notApplicable(
                userId,
                "No active holdings or open positions found to evaluate portfolio risk."
            );
        }

        BigDecimal totalMarketValue = BigDecimal.ZERO;
        List<BigDecimal> positionValues = new ArrayList<>();

        for (Holding h : holdings) {
            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
            BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;

            Optional<MarketPrice> mpOpt = marketPriceRepository.findLatestByStockId(h.getStockId());
            BigDecimal price = mpOpt.map(MarketPrice::getLtp).filter(p -> p != null && p.compareTo(BigDecimal.ZERO) > 0).orElse(avgBuy);

            BigDecimal val = qty.multiply(price);
            positionValues.add(val);
            totalMarketValue = totalMarketValue.add(val);
        }

        if (totalMarketValue.compareTo(BigDecimal.ZERO) <= 0) {
            return RiskMetricsDto.notApplicable(
                userId,
                "Total portfolio valuation is zero. Risk metrics cannot be computed reliably."
            );
        }

        // Sort descending to find largest and top-3
        positionValues.sort((a, b) -> b.compareTo(a));

        BigDecimal largestVal = positionValues.get(0);
        BigDecimal largestPct = largestVal
            .multiply(new BigDecimal("100"))
            .divide(totalMarketValue, 2, RoundingMode.HALF_UP);

        BigDecimal top3Val = BigDecimal.ZERO;
        for (int i = 0; i < Math.min(3, positionValues.size()); i++) {
            top3Val = top3Val.add(positionValues.get(i));
        }
        BigDecimal concentration = top3Val
            .multiply(new BigDecimal("100"))
            .divide(totalMarketValue, 2, RoundingMode.HALF_UP);

        // Portfolio Exposure = Market Value / (Market Value + Available Cash)
        BigDecimal cash = walletOpt.map(Wallet::getAvailableCash).orElse(BigDecimal.ZERO);
        BigDecimal totalAssets = totalMarketValue.add(cash);
        BigDecimal exposure = BigDecimal.ONE;
        if (totalAssets.compareTo(BigDecimal.ZERO) > 0) {
            exposure = totalMarketValue.divide(totalAssets, 4, RoundingMode.HALF_UP);
        }

        // Diversification indicator
        String diversificationIndicator;
        if (holdings.size() == 1) {
            diversificationIndicator = "HIGH CONCENTRATION";
        } else if (holdings.size() <= 4) {
            diversificationIndicator = "MODERATE DIVERSIFICATION";
        } else {
            diversificationIndicator = "WELL DIVERSIFIED";
        }

        // Parametric 1-day 95% Value at Risk (3.5% volatility buffer)
        BigDecimal maxLossEstimate = totalMarketValue.multiply(new BigDecimal("0.035")).setScale(2, RoundingMode.HALF_UP);

        // Profit/Loss ratio from trading statistics
        TradingStatisticsDto stats = tradingStatisticsService.calculateStatistics(userId);
        BigDecimal plRatio = null;
        if (stats.getAverageLoss() != null && stats.getAverageLoss().compareTo(BigDecimal.ZERO) > 0) {
            plRatio = stats.getAverageProfit().divide(stats.getAverageLoss(), 2, RoundingMode.HALF_UP);
        }

        // Calculate Overall Portfolio Risk Score (0-100)
        // 1. Concentration contribution (max 40 pts)
        int concScore = (int) Math.round(concentration.doubleValue() * 0.40);
        // 2. Exposure contribution (max 40 pts)
        int expoScore = (int) Math.round(exposure.doubleValue() * 40.0);
        // 3. Size buffer (20 pts if single asset, less if multiple)
        int sizeScore = holdings.size() == 1 ? 20 : (holdings.size() <= 3 ? 10 : 5);

        int totalRiskScore = Math.min(100, Math.max(0, concScore + expoScore + sizeScore));

        String riskLevel;
        if (totalRiskScore <= 35) {
            riskLevel = "LOW";
        } else if (totalRiskScore <= 65) {
            riskLevel = "MODERATE";
        } else {
            riskLevel = "HIGH";
        }

        RiskMetricsDto dto = new RiskMetricsDto();
        dto.setUserId(userId);
        dto.setPortfolioExposure(exposure);
        dto.setLargestPositionPercentage(largestPct);
        dto.setConcentration(concentration);
        dto.setMaximumLossEstimate(maxLossEstimate);
        dto.setProfitLossRatio(plRatio);
        dto.setDiversificationIndicator(diversificationIndicator);
        dto.setOverallPortfolioRiskScore(totalRiskScore);
        dto.setRiskLevel(riskLevel);
        dto.setNote("Based on verified holdings and market valuation.");

        return dto;
    }
}
