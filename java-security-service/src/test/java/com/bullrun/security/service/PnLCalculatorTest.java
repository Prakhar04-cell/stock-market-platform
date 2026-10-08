package com.bullrun.security.service;

import com.bullrun.security.dto.PnLReportDto;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Stock;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import com.bullrun.security.repository.OrderRepository;
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
class PnLCalculatorTest {

    @Mock
    private HoldingRepository holdingRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private MarketPriceRepository marketPriceRepository;

    private PnLCalculator pnLCalculator;

    @BeforeEach
    void setUp() {
        pnLCalculator = new PnLCalculator(holdingRepository, orderRepository, marketPriceRepository);
    }

    @Test
    void testCalculatePnLWithActiveHolding() {
        String userId = "usr-1";
        Stock stock = new Stock("stk-1", "RELIANCE", "Reliance Industries");

        Holding holding = new Holding("hld-1", userId, "stk-1", new BigDecimal("10"), new BigDecimal("2500.00"));
        holding.setStock(stock);

        MarketPrice mp = new MarketPrice();
        mp.setStockId("stk-1");
        mp.setLtp(new BigDecimal("2800.00"));
        mp.setPriceChange(new BigDecimal("50.00"));

        when(holdingRepository.findActiveHoldingsByUserId(userId)).thenReturn(List.of(holding));
        when(orderRepository.findByUserIdWithDetails(userId)).thenReturn(Collections.emptyList());
        when(marketPriceRepository.findLatestByStockId("stk-1")).thenReturn(Optional.of(mp));

        PnLReportDto pnl = pnLCalculator.calculatePnL(userId);

        assertNotNull(pnl);
        assertEquals(new BigDecimal("25000.0000"), pnl.getTotalInvested());
        assertEquals(new BigDecimal("28000.0000"), pnl.getTotalPortfolioValue());
        assertEquals(new BigDecimal("3000.0000"), pnl.getUnrealizedPnl());
        assertEquals(new BigDecimal("12.00"), pnl.getProfitPercentage());
        assertEquals(new BigDecimal("500.0000"), pnl.getDayPnl());
        assertEquals(1, pnl.getPositionPnL().size());
        assertEquals("RELIANCE", pnl.getPositionPnL().get(0).getSymbol());
    }

    @Test
    void testCalculatePnLWithEmptyHoldings() {
        String userId = "usr-empty";
        when(holdingRepository.findActiveHoldingsByUserId(userId)).thenReturn(Collections.emptyList());
        when(orderRepository.findByUserIdWithDetails(userId)).thenReturn(Collections.emptyList());

        PnLReportDto pnl = pnLCalculator.calculatePnL(userId);

        assertNotNull(pnl);
        assertEquals(0, pnl.getTotalInvested().compareTo(BigDecimal.ZERO));
        assertEquals(0, pnl.getTotalPortfolioValue().compareTo(BigDecimal.ZERO));
        assertEquals(0, pnl.getTotalPnl().compareTo(BigDecimal.ZERO));
        assertTrue(pnl.getPositionPnL().isEmpty());
    }
}
