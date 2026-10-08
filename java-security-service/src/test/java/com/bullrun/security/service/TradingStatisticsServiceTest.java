package com.bullrun.security.service;

import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Order;
import com.bullrun.security.model.Stock;
import com.bullrun.security.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradingStatisticsServiceTest {

    @Mock
    private OrderRepository orderRepository;

    private TradingStatisticsService tradingStatisticsService;

    @BeforeEach
    void setUp() {
        tradingStatisticsService = new TradingStatisticsService(orderRepository);
    }

    @Test
    void testEmptyOrdersReturnsZeroMetrics() {
        String userId = "usr-no-orders";
        when(orderRepository.findByUserIdWithDetails(userId)).thenReturn(Collections.emptyList());

        TradingStatisticsDto stats = tradingStatisticsService.calculateStatistics(userId);

        assertNotNull(stats);
        assertEquals(0, stats.getTotalOrders());
        assertEquals(BigDecimal.ZERO, stats.getWinRate());
        assertEquals(BigDecimal.ZERO, stats.getAverageProfit());
    }

    @Test
    void testOrdersWithTradesComputesAccurateWinRate() {
        String userId = "usr-active";
        Stock stock = new Stock("stk-1", "INFY", "Infosys");

        // Buy order
        Order buyOrder = new Order();
        buyOrder.setId("ord-1");
        buyOrder.setSide("BUY");
        buyOrder.setStatus("FILLED");
        buyOrder.setQuantity(new BigDecimal("10"));
        buyOrder.setPrice(new BigDecimal("1500.00"));
        buyOrder.setAverageExecutionPrice(new BigDecimal("1500.00"));
        buyOrder.setStock(stock);

        // Winning Sell order: sold at 1600 (bought at 1500)
        Order sellWin = new Order();
        sellWin.setId("ord-2");
        sellWin.setSide("SELL");
        sellWin.setStatus("FILLED");
        sellWin.setQuantity(new BigDecimal("10"));
        sellWin.setPrice(new BigDecimal("1500.00")); // cost reference
        sellWin.setAverageExecutionPrice(new BigDecimal("1600.00"));
        sellWin.setStock(stock);

        // Losing Sell order: sold at 1400 (bought at 1500)
        Order sellLoss = new Order();
        sellLoss.setId("ord-3");
        sellLoss.setSide("SELL");
        sellLoss.setStatus("FILLED");
        sellLoss.setQuantity(new BigDecimal("10"));
        sellLoss.setPrice(new BigDecimal("1500.00"));
        sellLoss.setAverageExecutionPrice(new BigDecimal("1400.00"));
        sellLoss.setStock(stock);

        when(orderRepository.findByUserIdWithDetails(userId)).thenReturn(List.of(buyOrder, sellWin, sellLoss));

        TradingStatisticsDto stats = tradingStatisticsService.calculateStatistics(userId);

        assertEquals(3, stats.getTotalOrders());
        assertEquals(1, stats.getBuyCount());
        assertEquals(2, stats.getSellCount());
        assertEquals(1, stats.getWinningTrades());
        assertEquals(1, stats.getLosingTrades());
        assertEquals(new BigDecimal("50.00"), stats.getWinRate()); // 1/2 = 50%
        assertEquals(new BigDecimal("1000.00"), stats.getLargestWinningTrade()); // (1600-1500)*10
        assertEquals(new BigDecimal("1000.00"), stats.getLargestLosingTrade());  // |(1400-1500)*10|
    }
}
