package com.bullrun.security.dto;

import java.time.Instant;
import java.util.List;

public class SecuritySummaryResponse {

    private long totalEvents;
    private long activeAlerts;
    private long failedAuthAttempts;
    private long blockedRequests;
    private long rateLimitViolations;
    private int riskScore; // 0-100
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    private List<String> riskFactors;
    private Instant evaluatedAt;

    public SecuritySummaryResponse() {
        this.evaluatedAt = Instant.now();
    }

    public long getTotalEvents() {
        return totalEvents;
    }

    public void setTotalEvents(long totalEvents) {
        this.totalEvents = totalEvents;
    }

    public long getActiveAlerts() {
        return activeAlerts;
    }

    public void setActiveAlerts(long activeAlerts) {
        this.activeAlerts = activeAlerts;
    }

    public long getFailedAuthAttempts() {
        return failedAuthAttempts;
    }

    public void setFailedAuthAttempts(long failedAuthAttempts) {
        this.failedAuthAttempts = failedAuthAttempts;
    }

    public long getBlockedRequests() {
        return blockedRequests;
    }

    public void setBlockedRequests(long blockedRequests) {
        this.blockedRequests = blockedRequests;
    }

    public long getRateLimitViolations() {
        return rateLimitViolations;
    }

    public void setRateLimitViolations(long rateLimitViolations) {
        this.rateLimitViolations = rateLimitViolations;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(int riskScore) {
        this.riskScore = riskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public List<String> getRiskFactors() {
        return riskFactors;
    }

    public void setRiskFactors(List<String> riskFactors) {
        this.riskFactors = riskFactors;
    }

    public Instant getEvaluatedAt() {
        return evaluatedAt;
    }

    public void setEvaluatedAt(Instant evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }
}
