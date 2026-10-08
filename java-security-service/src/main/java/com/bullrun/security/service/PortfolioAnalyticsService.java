package com.bullrun.security.service;

import com.bullrun.security.dto.AssetAllocationDto;
import com.bullrun.security.dto.HoldingAnalyticsDto;
import com.bullrun.security.dto.PnLReportDto;
import com.bullrun.security.dto.PortfolioSummaryDto;
import com.bullrun.security.dto.RiskMetricsDto;
import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
public class PortfolioAnalyticsService {

    private final HoldingRepository holdingRepository;
    private final MarketPriceRepository marketPriceRepository;
    private final PnLCalculator pnLCalculator;
    private final TradingStatisticsService tradingStatisticsService;
    private final RiskAnalyzer riskAnalyzer;
    private final Executor analyticsExecutor;

    public PortfolioAnalyticsService(
        HoldingRepository holdingRepository,
        MarketPriceRepository marketPriceRepository,
        PnLCalculator pnLCalculator,
        TradingStatisticsService tradingStatisticsService,
        RiskAnalyzer riskAnalyzer,
        @Qualifier("analyticsExecutor") Executor analyticsExecutor
    ) {
        this.holdingRepository = holdingRepository;
        this.marketPriceRepository = marketPriceRepository;
        this.pnLCalculator = pnLCalculator;
        this.tradingStatisticsService = tradingStatisticsService;
        this.riskAnalyzer = riskAnalyzer;
        this.analyticsExecutor = analyticsExecutor;
    }

    /**
     * Calculates complete portfolio summary and analytics using parallel CompletableFutures
     * for independent valuation, P&L, trading stats, and risk metrics.
     */
    @Transactional(readOnly = true)
    public PortfolioSummaryDto getPortfolioAnalytics(String userId) {
        // Concurrently run independent calculations
        CompletableFuture<PortfolioValuation> valuationFuture = CompletableFuture.supplyAsync(
            () -> computeValuation(userId), analyticsExecutor
        );

        CompletableFuture<PnLReportDto> pnlFuture = CompletableFuture.supplyAsync(
            () -> pnLCalculator.calculatePnL(userId), analyticsExecutor
        );

        CompletableFuture<RiskMetricsDto> riskFuture = CompletableFuture.supplyAsync(
            () -> riskAnalyzer.analyzeRisk(userId), analyticsExecutor
        );

        CompletableFuture<TradingStatisticsDto> statsFuture = CompletableFuture.supplyAsync(
            () -> tradingStatisticsService.calculateStatistics(userId), analyticsExecutor
        );

        // Await all independent calculations
        CompletableFuture.allOf(valuationFuture, pnlFuture, riskFuture, statsFuture).join();

        PortfolioValuation valuation = valuationFuture.join();
        PnLReportDto pnl = pnlFuture.join();
        RiskMetricsDto risk = riskFuture.join();

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setUserId(userId);
        summary.setTotalInvestedAmount(valuation.totalInvested);
        summary.setCurrentPortfolioValue(valuation.totalMarketValue);
        summary.setTotalUnrealizedPnl(pnl.getUnrealizedPnl());
        summary.setTotalPnlPercentage(pnl.getProfitPercentage());
        summary.setNumberOfHoldings(valuation.holdings.size());
        summary.setAssetAllocation(valuation.allocations);
        summary.setLargestHolding(valuation.largestHolding);
        summary.setLargestHoldingPercentage(valuation.largestHoldingPercentage);
        summary.setTopThreeConcentration(valuation.topThreeConcentration);
        summary.setDiversificationIndicator(risk.getDiversificationIndicator());
        summary.setHoldings(valuation.holdings);

        return summary;
    }

    private PortfolioValuation computeValuation(String userId) {
        List<Holding> rawHoldings = holdingRepository.findActiveHoldingsByUserId(userId);

        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalMarketValue = BigDecimal.ZERO;
        List<HoldingAnalyticsDto> holdingDtos = new ArrayList<>();
        List<AssetAllocationDto> allocations = new ArrayList<>();

        for (Holding h : rawHoldings) {
            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
            BigDecimal avgBuy = h.getAverageBuyPrice() != null ? h.getAverageBuyPrice() : BigDecimal.ZERO;
            BigDecimal invested = qty.multiply(avgBuy).setScale(4, RoundingMode.HALF_UP);

            Optional<MarketPrice> mpOpt = marketPriceRepository.findLatestByStockId(h.getStockId());
            BigDecimal curPrice = avgBuy;
            BigDecimal dayChange = BigDecimal.ZERO;

            if (mpOpt.isPresent()) {
                MarketPrice mp = mpOpt.get();
                if (mp.getLtp() != null && mp.getLtp().compareTo(BigDecimal.ZERO) > 0) {
                    curPrice = mp.getLtp();
                }
                if (mp.getPriceChange() != null) {
                    dayChange = mp.getPriceChange();
                }
            }

            BigDecimal curValue = qty.multiply(curPrice).setScale(4, RoundingMode.HALF_UP);
            BigDecimal unrealizedPnl = curValue.subtract(invested).setScale(4, RoundingMode.HALF_UP);

            BigDecimal pnlPct = BigDecimal.ZERO;
            if (invested.compareTo(BigDecimal.ZERO) > 0) {
                pnlPct = unrealizedPnl
                    .multiply(new BigDecimal("100"))
                    .divide(invested, 2, RoundingMode.HALF_UP);
            }

            BigDecimal dayPnl = dayChange.multiply(qty).setScale(4, RoundingMode.HALF_UP);

            totalInvested = totalInvested.add(invested);
            totalMarketValue = totalMarketValue.add(curValue);

            HoldingAnalyticsDto dto = new HoldingAnalyticsDto();
            dto.setHoldingId(h.getId());
            dto.setStockId(h.getStockId());
            dto.setSymbol(h.getStock() != null ? h.getStock().getSymbol() : "UNKNOWN");
            dto.setName(h.getStock() != null ? h.getStock().getName() : "");
            dto.setSector(h.getStock() != null ? h.getStock().getSector() : "Equities");
            dto.setQuantity(qty);
            dto.setAverageBuyPrice(avgBuy);
            dto.setCurrentPrice(curPrice);
            dto.setInvestedValue(invested);
            dto.setCurrentValue(curValue);
            dto.setUnrealizedPnl(unrealizedPnl);
            dto.setPnlPercentage(pnlPct);
            dto.setDayChange(dayChange);
            dto.setDayPnl(dayPnl);

            holdingDtos.add(dto);
        }

        // Calculate portfolio weights and asset allocations
        for (HoldingAnalyticsDto dto : holdingDtos) {
            BigDecimal weight = BigDecimal.ZERO;
            if (totalMarketValue.compareTo(BigDecimal.ZERO) > 0) {
                weight = dto.getCurrentValue()
                    .multiply(new BigDecimal("100"))
                    .divide(totalMarketValue, 2, RoundingMode.HALF_UP);
            }
            dto.setPortfolioWeight(weight);

            allocations.add(new AssetAllocationDto(
                dto.getSymbol(),
                dto.getName(),
                dto.getSector(),
                dto.getCurrentValue(),
                weight
            ));
        }

        // Sort allocations descending
        allocations.sort(Comparator.comparing(AssetAllocationDto::getAllocationPercentage).reversed());

        String largestHolding = "None";
        BigDecimal largestPct = BigDecimal.ZERO;
        BigDecimal top3Concentration = BigDecimal.ZERO;

        if (!allocations.isEmpty()) {
            largestHolding = allocations.get(0).getSymbol();
            largestPct = allocations.get(0).getAllocationPercentage();

            for (int i = 0; i < Math.min(3, allocations.size()); i++) {
                top3Concentration = top3Concentration.add(allocations.get(i).getAllocationPercentage());
            }
        }

        return new PortfolioValuation(
            totalInvested,
            totalMarketValue,
            holdingDtos,
            allocations,
            largestHolding,
            largestPct,
            top3Concentration
        );
    }

    private record PortfolioValuation(
        BigDecimal totalInvested,
        BigDecimal totalMarketValue,
        List<HoldingAnalyticsDto> holdings,
        List<AssetAllocationDto> allocations,
        String largestHolding,
        BigDecimal largestHoldingPercentage,
        BigDecimal topThreeConcentration
    ) {}
}
