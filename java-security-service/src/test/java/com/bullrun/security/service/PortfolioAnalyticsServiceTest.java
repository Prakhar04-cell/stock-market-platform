package com.bullrun.security.service;

import com.bullrun.security.dto.PnLReportDto;
import com.bullrun.security.dto.PortfolioSummaryDto;
import com.bullrun.security.dto.RiskMetricsDto;
import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Stock;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ForkJoinPool;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioAnalyticsServiceTest {

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private MarketPriceRepository marketPriceRepository;

    @Mock
    private PnLCalculator pnLCalculator;

    @Mock
    private TradingStatisticsService tradingStatisticsService;

    @Mock
    private RiskAnalyzer riskAnalyzer;

    private PortfolioAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioAnalyticsService(
            holdingRepository,
            marketPriceRepository,
            pnLCalculator,
            tradingStatisticsService,
            riskAnalyzer,
            ForkJoinPool.commonPool()
        );
    }

    @Test
    void testParallelPortfolioAnalyticsExecution() {
        String userId = "usr-test";
        Stock stock = new Stock("stk-tcs", "TCS", "Tata Consultancy Services");

        Holding h = new Holding("h-1", userId, "stk-tcs", new BigDecimal("5"), new BigDecimal("3500.00"));
        h.setStock(stock);

        MarketPrice mp = new MarketPrice();
        mp.setLtp(new BigDecimal("3800.00"));

        when(holdingRepository.findActiveHoldingsByUserId(userId)).thenReturn(List.of(h));
        when(marketPriceRepository.findLatestByStockId("stk-tcs")).thenReturn(Optional.of(mp));

        PnLReportDto pnlMock = new PnLReportDto();
        pnlMock.setUnrealizedPnl(new BigDecimal("1500.00"));
        pnlMock.setProfitPercentage(new BigDecimal("8.57"));
        when(pnLCalculator.calculatePnL(userId)).thenReturn(pnlMock);

        RiskMetricsDto riskMock = new RiskMetricsDto();
        riskMock.setDiversificationIndicator("HIGH CONCENTRATION");
        when(riskAnalyzer.analyzeRisk(userId)).thenReturn(riskMock);

        when(tradingStatisticsService.calculateStatistics(userId)).thenReturn(new TradingStatisticsDto());

        PortfolioSummaryDto summary = service.getPortfolioAnalytics(userId);

        assertNotNull(summary);
        assertEquals(userId, summary.getUserId());
        assertEquals(new BigDecimal("17500.0000"), summary.getTotalInvestedAmount());
        assertEquals(new BigDecimal("19000.0000"), summary.getCurrentPortfolioValue());
        assertEquals(1, summary.getNumberOfHoldings());
        assertEquals("TCS", summary.getLargestHolding());
        assertEquals("HIGH CONCENTRATION", summary.getDiversificationIndicator());
    }
}
