package com.bullrun.security.service;

import com.bullrun.security.dto.TradingStatisticsDto;
import com.bullrun.security.model.Order;
import com.bullrun.security.model.OrderExecution;
import com.bullrun.security.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class TradingStatisticsService {

    private final OrderRepository orderRepository;

    public TradingStatisticsService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public TradingStatisticsDto calculateStatistics(String userId) {
        List<Order> orders = orderRepository.findByUserIdWithDetails(userId);

        TradingStatisticsDto stats = new TradingStatisticsDto();
        stats.setUserId(userId);
        stats.setTotalOrders(orders.size());

        if (orders.isEmpty()) {
            stats.setBuyCount(0);
            stats.setSellCount(0);
            stats.setCompletedTrades(0);
            stats.setWinningTrades(0);
            stats.setLosingTrades(0);
            stats.setWinRate(BigDecimal.ZERO);
            stats.setAverageProfit(BigDecimal.ZERO);
            stats.setAverageLoss(BigDecimal.ZERO);
            stats.setLargestWinningTrade(BigDecimal.ZERO);
            stats.setLargestLosingTrade(BigDecimal.ZERO);
            stats.setAverageTradeValue(BigDecimal.ZERO);
            return stats;
        }

        long buyCount = 0;
        long sellCount = 0;
        long completedTrades = 0;
        long winningTrades = 0;
        long losingTrades = 0;

        BigDecimal totalProfit = BigDecimal.ZERO;
        BigDecimal totalLoss = BigDecimal.ZERO;
        BigDecimal largestWinningTrade = BigDecimal.ZERO;
        BigDecimal largestLosingTrade = BigDecimal.ZERO;
        BigDecimal totalTradeValue = BigDecimal.ZERO;
        long executedOrdersCount = 0;

        for (Order o : orders) {
            if ("BUY".equalsIgnoreCase(o.getSide())) {
                buyCount++;
            } else if ("SELL".equalsIgnoreCase(o.getSide())) {
                sellCount++;
            }

            BigDecimal avgExecPrice = o.getAverageExecutionPrice() != null ? o.getAverageExecutionPrice() : o.getPrice();
            BigDecimal qty = o.getFilledQuantity() != null && o.getFilledQuantity().compareTo(BigDecimal.ZERO) > 0
                ? o.getFilledQuantity()
                : o.getQuantity();

            if (avgExecPrice != null && qty != null && qty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal orderValue = avgExecPrice.multiply(qty);
                totalTradeValue = totalTradeValue.add(orderValue);
                executedOrdersCount++;
            }

            // Completed trades analysis for SELL orders
            if ("SELL".equalsIgnoreCase(o.getSide()) && "FILLED".equalsIgnoreCase(o.getStatus())) {
                completedTrades++;

                BigDecimal sellPrice = o.getAverageExecutionPrice() != null ? o.getAverageExecutionPrice() : o.getPrice();
                BigDecimal limitPrice = o.getPrice() != null ? o.getPrice() : sellPrice;

                if (sellPrice != null && qty != null) {
                    BigDecimal charges = BigDecimal.ZERO;
                    if (o.getExecutions() != null) {
                        for (OrderExecution exec : o.getExecutions()) {
                            if (exec.getTradeCharges() != null) {
                                charges = charges.add(exec.getTradeCharges());
                            }
                        }
                    }

                    BigDecimal tradePnl = sellPrice.subtract(limitPrice).multiply(qty).subtract(charges);

                    if (tradePnl.compareTo(BigDecimal.ZERO) > 0) {
                        winningTrades++;
                        totalProfit = totalProfit.add(tradePnl);
                        if (tradePnl.compareTo(largestWinningTrade) > 0) {
                            largestWinningTrade = tradePnl;
                        }
                    } else if (tradePnl.compareTo(BigDecimal.ZERO) < 0) {
                        losingTrades++;
                        totalLoss = totalLoss.add(tradePnl.abs());
                        if (tradePnl.abs().compareTo(largestLosingTrade) > 0) {
                            largestLosingTrade = tradePnl.abs();
                        }
                    }
                }
            }
        }

        stats.setBuyCount(buyCount);
        stats.setSellCount(sellCount);
        stats.setCompletedTrades(completedTrades);
        stats.setWinningTrades(winningTrades);
        stats.setLosingTrades(losingTrades);

        // Win Rate = (winningTrades / (winningTrades + losingTrades)) * 100
        long totalDecisive = winningTrades + losingTrades;
        if (totalDecisive > 0) {
            BigDecimal winRate = new BigDecimal(winningTrades)
                .multiply(new BigDecimal("100"))
                .divide(new BigDecimal(totalDecisive), 2, RoundingMode.HALF_UP);
            stats.setWinRate(winRate);
        } else {
            stats.setWinRate(BigDecimal.ZERO);
        }

        // Average Profit
        if (winningTrades > 0) {
            stats.setAverageProfit(totalProfit.divide(new BigDecimal(winningTrades), 2, RoundingMode.HALF_UP));
        } else {
            stats.setAverageProfit(BigDecimal.ZERO);
        }

        // Average Loss
        if (losingTrades > 0) {
            stats.setAverageLoss(totalLoss.divide(new BigDecimal(losingTrades), 2, RoundingMode.HALF_UP));
        } else {
            stats.setAverageLoss(BigDecimal.ZERO);
        }

        stats.setLargestWinningTrade(largestWinningTrade.setScale(2, RoundingMode.HALF_UP));
        stats.setLargestLosingTrade(largestLosingTrade.setScale(2, RoundingMode.HALF_UP));

        // Average Trade Value
        if (executedOrdersCount > 0) {
            stats.setAverageTradeValue(totalTradeValue.divide(new BigDecimal(executedOrdersCount), 2, RoundingMode.HALF_UP));
        } else {
            stats.setAverageTradeValue(BigDecimal.ZERO);
        }

        return stats;
    }
}
