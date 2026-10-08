package com.bullrun.security.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class PnLReportDto {

    private String userId;
    private BigDecimal totalPnl;
    private BigDecimal realizedPnl;
    private BigDecimal unrealizedPnl;
    private BigDecimal profitPercentage;
    private BigDecimal dayPnl;
    private BigDecimal totalInvested;
    private BigDecimal totalPortfolioValue;
    private List<HoldingAnalyticsDto> positionPnL = new ArrayList<>();
    private Instant calculatedAt;

    public PnLReportDto() {
        this.calculatedAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getTotalPnl() {
        return totalPnl;
    }

    public void setTotalPnl(BigDecimal totalPnl) {
        this.totalPnl = totalPnl;
    }

    public BigDecimal getRealizedPnl() {
        return realizedPnl;
    }

    public void setRealizedPnl(BigDecimal realizedPnl) {
        this.realizedPnl = realizedPnl;
    }

    public BigDecimal getUnrealizedPnl() {
        return unrealizedPnl;
    }

    public void setUnrealizedPnl(BigDecimal unrealizedPnl) {
        this.unrealizedPnl = unrealizedPnl;
    }

    public BigDecimal getProfitPercentage() {
        return profitPercentage;
    }

    public void setProfitPercentage(BigDecimal profitPercentage) {
        this.profitPercentage = profitPercentage;
    }

    public BigDecimal getDayPnl() {
        return dayPnl;
    }

    public void setDayPnl(BigDecimal dayPnl) {
        this.dayPnl = dayPnl;
    }

    public BigDecimal getTotalInvested() {
        return totalInvested;
    }

    public void setTotalInvested(BigDecimal totalInvested) {
        this.totalInvested = totalInvested;
    }

    public BigDecimal getTotalPortfolioValue() {
        return totalPortfolioValue;
    }

    public void setTotalPortfolioValue(BigDecimal totalPortfolioValue) {
        this.totalPortfolioValue = totalPortfolioValue;
    }

    public List<HoldingAnalyticsDto> getPositionPnL() {
        return positionPnL;
    }

    public void setPositionPnL(List<HoldingAnalyticsDto> positionPnL) {
        this.positionPnL = positionPnL;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(Instant calculatedAt) {
        this.calculatedAt = calculatedAt;
    }
}
