package com.bullrun.security.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class TradingStatisticsDto {

    private String userId;
    private long totalOrders;
    private long buyCount;
    private long sellCount;
    private long completedTrades;
    private long winningTrades;
    private long losingTrades;
    private BigDecimal winRate; // %
    private BigDecimal averageProfit;
    private BigDecimal averageLoss;
    private BigDecimal largestWinningTrade;
    private BigDecimal largestLosingTrade;
    private BigDecimal averageTradeValue;
    private Instant calculatedAt;

    public TradingStatisticsDto() {
        this.calculatedAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public long getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(long totalOrders) {
        this.totalOrders = totalOrders;
    }

    public long getBuyCount() {
        return buyCount;
    }

    public void setBuyCount(long buyCount) {
        this.buyCount = buyCount;
    }

    public long getSellCount() {
        return sellCount;
    }

    public void setSellCount(long sellCount) {
        this.sellCount = sellCount;
    }

    public long getCompletedTrades() {
        return completedTrades;
    }

    public void setCompletedTrades(long completedTrades) {
        this.completedTrades = completedTrades;
    }

    public long getWinningTrades() {
        return winningTrades;
    }

    public void setWinningTrades(long winningTrades) {
        this.winningTrades = winningTrades;
    }

    public long getLosingTrades() {
        return losingTrades;
    }

    public void setLosingTrades(long losingTrades) {
        this.losingTrades = losingTrades;
    }

    public BigDecimal getWinRate() {
        return winRate;
    }

    public void setWinRate(BigDecimal winRate) {
        this.winRate = winRate;
    }

    public BigDecimal getAverageProfit() {
        return averageProfit;
    }

    public void setAverageProfit(BigDecimal averageProfit) {
        this.averageProfit = averageProfit;
    }

    public BigDecimal getAverageLoss() {
        return averageLoss;
    }

    public void setAverageLoss(BigDecimal averageLoss) {
        this.averageLoss = averageLoss;
    }

    public BigDecimal getLargestWinningTrade() {
        return largestWinningTrade;
    }

    public void setLargestWinningTrade(BigDecimal largestWinningTrade) {
        this.largestWinningTrade = largestWinningTrade;
    }

    public BigDecimal getLargestLosingTrade() {
        return largestLosingTrade;
    }

    public void setLargestLosingTrade(BigDecimal largestLosingTrade) {
        this.largestLosingTrade = largestLosingTrade;
    }

    public BigDecimal getAverageTradeValue() {
        return averageTradeValue;
    }

    public void setAverageTradeValue(BigDecimal averageTradeValue) {
        this.averageTradeValue = averageTradeValue;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(Instant calculatedAt) {
        this.calculatedAt = calculatedAt;
    }
}
