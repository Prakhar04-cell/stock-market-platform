package com.bullrun.security.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class RiskMetricsDto {

    private String userId;
    private BigDecimal portfolioExposure; // exposure ratio
    private BigDecimal largestPositionPercentage;
    private BigDecimal concentration; // top 3 holdings %
    private BigDecimal maximumLossEstimate; // VaR / 1-day max loss estimate
    private BigDecimal profitLossRatio;
    private String diversificationIndicator;
    private Integer overallPortfolioRiskScore; // 0-100
    private String riskLevel; // LOW, MODERATE, HIGH
    private String note;
    private boolean calculable;
    private Instant calculatedAt;

    public RiskMetricsDto() {
        this.calculatedAt = Instant.now();
        this.calculable = true;
    }

    public static RiskMetricsDto notApplicable(String userId, String reason) {
        RiskMetricsDto dto = new RiskMetricsDto();
        dto.setUserId(userId);
        dto.setCalculable(false);
        dto.setNote(reason);
        dto.setDiversificationIndicator("N/A");
        dto.setRiskLevel("N/A");
        return dto;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public BigDecimal getPortfolioExposure() {
        return portfolioExposure;
    }

    public void setPortfolioExposure(BigDecimal portfolioExposure) {
        this.portfolioExposure = portfolioExposure;
    }

    public BigDecimal getLargestPositionPercentage() {
        return largestPositionPercentage;
    }

    public void setLargestPositionPercentage(BigDecimal largestPositionPercentage) {
        this.largestPositionPercentage = largestPositionPercentage;
    }

    public BigDecimal getConcentration() {
        return concentration;
    }

    public void setConcentration(BigDecimal concentration) {
        this.concentration = concentration;
    }

    public BigDecimal getMaximumLossEstimate() {
        return maximumLossEstimate;
    }

    public void setMaximumLossEstimate(BigDecimal maximumLossEstimate) {
        this.maximumLossEstimate = maximumLossEstimate;
    }

    public BigDecimal getProfitLossRatio() {
        return profitLossRatio;
    }

    public void setProfitLossRatio(BigDecimal profitLossRatio) {
        this.profitLossRatio = profitLossRatio;
    }

    public String getDiversificationIndicator() {
        return diversificationIndicator;
    }

    public void setDiversificationIndicator(String diversificationIndicator) {
        this.diversificationIndicator = diversificationIndicator;
    }

    public Integer getOverallPortfolioRiskScore() {
        return overallPortfolioRiskScore;
    }

    public void setOverallPortfolioRiskScore(Integer overallPortfolioRiskScore) {
        this.overallPortfolioRiskScore = overallPortfolioRiskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public boolean isCalculable() {
        return calculable;
    }

    public void setCalculable(boolean calculable) {
        this.calculable = calculable;
    }

    public Instant getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(Instant calculatedAt) {
        this.calculatedAt = calculatedAt;
    }
}
