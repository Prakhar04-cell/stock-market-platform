package com.bullrun.security.dto;

import java.math.BigDecimal;

public class HoldingAnalyticsDto {

    private String holdingId;
    private String stockId;
    private String symbol;
    private String name;
    private String sector;
    private BigDecimal quantity;
    private BigDecimal averageBuyPrice;
    private BigDecimal currentPrice;
    private BigDecimal investedValue;
    private BigDecimal currentValue;
    private BigDecimal unrealizedPnl;
    private BigDecimal pnlPercentage;
    private BigDecimal dayChange;
    private BigDecimal dayPnl;
    private BigDecimal portfolioWeight;

    public HoldingAnalyticsDto() {}

    public String getHoldingId() {
        return holdingId;
    }

    public void setHoldingId(String holdingId) {
        this.holdingId = holdingId;
    }

    public String getStockId() {
        return stockId;
    }

    public void setStockId(String stockId) {
        this.stockId = stockId;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAverageBuyPrice() {
        return averageBuyPrice;
    }

    public void setAverageBuyPrice(BigDecimal averageBuyPrice) {
        this.averageBuyPrice = averageBuyPrice;
    }

    public BigDecimal getCurrentPrice() {
        return currentPrice;
    }

    public void setCurrentPrice(BigDecimal currentPrice) {
        this.currentPrice = currentPrice;
    }

    public BigDecimal getInvestedValue() {
        return investedValue;
    }

    public void setInvestedValue(BigDecimal investedValue) {
        this.investedValue = investedValue;
    }

    public BigDecimal getCurrentValue() {
        return currentValue;
    }

    public void setCurrentValue(BigDecimal currentValue) {
        this.currentValue = currentValue;
    }

    public BigDecimal getUnrealizedPnl() {
        return unrealizedPnl;
    }

    public void setUnrealizedPnl(BigDecimal unrealizedPnl) {
        this.unrealizedPnl = unrealizedPnl;
    }

    public BigDecimal getPnlPercentage() {
        return pnlPercentage;
    }

    public void setPnlPercentage(BigDecimal pnlPercentage) {
        this.pnlPercentage = pnlPercentage;
    }

    public BigDecimal getDayChange() {
        return dayChange;
    }

    public void setDayChange(BigDecimal dayChange) {
        this.dayChange = dayChange;
    }

    public BigDecimal getDayPnl() {
        return dayPnl;
    }

    public void setDayPnl(BigDecimal dayPnl) {
        this.dayPnl = dayPnl;
    }

    public BigDecimal getPortfolioWeight() {
        return portfolioWeight;
    }

    public void setPortfolioWeight(BigDecimal portfolioWeight) {
        this.portfolioWeight = portfolioWeight;
    }
}
