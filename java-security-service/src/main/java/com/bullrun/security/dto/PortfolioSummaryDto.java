package com.bullrun.security.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class PortfolioSummaryDto {

    private String userId;
    private BigDecimal totalInvestedAmount;
    private BigDecimal currentPortfolioValue;
    private BigDecimal totalUnrealizedPnl;
    private BigDecimal totalPnlPercentage;
    private int numberOfHoldings;
    private List<AssetAllocationDto> assetAllocation = new ArrayList<>();
    private String largestHolding;
    private BigDecimal largestHoldingPercentage;
    private BigDecimal topThreeConcentration;
    private String diversificationIndicator; // WELL DIVERSIFIED, MODERATE DIVERSIFICATION, HIGH CONCENTRATION
    private List<HoldingAnalyticsDto> holdings = new ArrayList<>();
    private Instant calculatedAt;

    public PortfolioSummaryDto() {
        this.calculatedAt = Instant.now();
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getTotalInvestedAmount() {
        return totalInvestedAmount;
    }

    public void setTotalInvestedAmount(BigDecimal totalInvestedAmount) {
        this.totalInvestedAmount = totalInvestedAmount;
    }

    public BigDecimal getCurrentPortfolioValue() {
        return currentPortfolioValue;
    }

    public void setCurrentPortfolioValue(BigDecimal currentPortfolioValue) {
        this.currentPortfolioValue = currentPortfolioValue;
    }

    public BigDecimal getTotalUnrealizedPnl() {
        return totalUnrealizedPnl;
    }

    public void setTotalUnrealizedPnl(BigDecimal totalUnrealizedPnl) {
        this.totalUnrealizedPnl = totalUnrealizedPnl;
    }

    public BigDecimal getTotalPnlPercentage() {
        return totalPnlPercentage;
    }

    public void setTotalPnlPercentage(BigDecimal totalPnlPercentage) {
        this.totalPnlPercentage = totalPnlPercentage;
    }

    public int getNumberOfHoldings() {
        return numberOfHoldings;
    }

    public void setNumberOfHoldings(int numberOfHoldings) {
        this.numberOfHoldings = numberOfHoldings;
    }

    public List<AssetAllocationDto> getAssetAllocation() {
        return assetAllocation;
    }

    public void setAssetAllocation(List<AssetAllocationDto> assetAllocation) {
        this.assetAllocation = assetAllocation;
    }

    public String getLargestHolding() {
        return largestHolding;
    }

    public void setLargestHolding(String largestHolding) {
        this.largestHolding = largestHolding;
    }

    public BigDecimal getLargestHoldingPercentage() {
        return largestHoldingPercentage;
    }

    public void setLargestHoldingPercentage(BigDecimal largestHoldingPercentage) {
        this.largestHoldingPercentage = largestHoldingPercentage;
    }

    public BigDecimal getTopThreeConcentration() {
        return topThreeConcentration;
    }

    public void setTopThreeConcentration(BigDecimal topThreeConcentration) {
        this.topThreeConcentration = topThreeConcentration;
    }

    public String getDiversificationIndicator() {
        return diversificationIndicator;
    }

    public void setDiversificationIndicator(String diversificationIndicator) {
        this.diversificationIndicator = diversificationIndicator;
    }

    public List<HoldingAnalyticsDto> getHoldings() {
        return holdings;
    }

    public void setHoldings(List<HoldingAnalyticsDto> holdings) {
        this.holdings = holdings;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(Instant calculatedAt) {
        this.calculatedAt = calculatedAt;
    }
}
