package com.bullrun.security.service;

import com.bullrun.security.dto.RiskMetricsDto;
import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Wallet;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import com.bullrun.security.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiskAnalyzerTest {

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private MarketPriceRepository marketPriceRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TradingStatisticsService tradingStatisticsService;

    private RiskAnalyzer riskAnalyzer;

    @BeforeEach
    void setUp() {
        riskAnalyzer = new RiskAnalyzer(holdingRepository, marketPriceRepository, walletRepository, tradingStatisticsService);
    }

    @Test
    void testEmptyHoldingsReturnsTruthfulNotApplicable() {
        String userId = "usr-empty";
        when(holdingRepository.findActiveHoldingsByUserId(userId)).thenReturn(Collections.emptyList());

        RiskMetricsDto risk = riskAnalyzer.analyzeRisk(userId);

        assertNotNull(risk);
        assertFalse(risk.isCalculable());
        assertEquals("N/A", risk.getRiskLevel());
        assertNotNull(risk.getNote());
    }

    @Test
    void testSingleHoldingEvaluatesHighConcentration() {
        String userId = "usr-single";

        Holding h = new Holding("hld-1", userId, "stk-1", new BigDecimal("10"), new BigDecimal("100.00"));
        MarketPrice mp = new MarketPrice();
        mp.setLtp(new BigDecimal("100.00"));

        Wallet w = new Wallet();
        w.setBalance(new BigDecimal("50000.00"));
        w.setLockedBalance(BigDecimal.ZERO);

        when(holdingRepository.findActiveHoldingsByUserId(userId)).thenReturn(List.of(h));
        when(marketPriceRepository.findLatestByStockId("stk-1")).thenReturn(Optional.of(mp));
        when(walletRepository.findByUserId(userId)).thenReturn(Optional.of(w));
        when(tradingStatisticsService.calculateStatistics(userId)).thenReturn(new TradingStatisticsDto());

        RiskMetricsDto risk = riskAnalyzer.analyzeRisk(userId);

        assertNotNull(risk);
        assertTrue(risk.isCalculable());
        assertEquals(new BigDecimal("100.00"), risk.getLargestPositionPercentage());
        assertEquals(new BigDecimal("100.00"), risk.getConcentration());
        assertEquals("HIGH CONCENTRATION", risk.getDiversificationIndicator());
        assertNotNull(risk.getOverallPortfolioRiskScore());
    }
}
