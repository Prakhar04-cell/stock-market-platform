package com.bullrun.security.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SecurityRiskAnalyzer {

    public record RiskEvaluation(int score, String level, List<String> factors) {}

    /**
     * Calculates an objective risk score (0-100) and risk level (LOW, MEDIUM, HIGH, CRITICAL)
     * strictly grounded in verified security event counts over the last 24-hour period.
     */
    public RiskEvaluation evaluateRisk(long failedAuth, long blockedRequests, long rateLimitViolations, long criticalAlerts) {
        int score = 0;
        List<String> factors = new ArrayList<>();

        // Signal 1: Failed Auth attempts (each adds 5 points, max 30)
        if (failedAuth > 0) {
            int authScore = (int) Math.min(30, failedAuth * 5);
            score += authScore;
            factors.add(failedAuth + " failed authentication attempts in the past 24 hours (+" + authScore + " pts)");
        }

        // Signal 2: Blocked / Access Denied requests (each adds 8 points, max 25)
        if (blockedRequests > 0) {
            int blockScore = (int) Math.min(25, blockedRequests * 8);
            score += blockScore;
            factors.add(blockedRequests + " access denied / unauthorized attempts (+" + blockScore + " pts)");
        }

        // Signal 3: Rate Limit violations (each adds 10 points, max 25)
        if (rateLimitViolations > 0) {
            int rateScore = (int) Math.min(25, rateLimitViolations * 10);
            score += rateScore;
            factors.add(rateLimitViolations + " rate limit threshold violations (+" + rateScore + " pts)");
        }

        // Signal 4: Active High/Critical alerts (each adds 15 points, max 30)
        if (criticalAlerts > 0) {
            int alertScore = (int) Math.min(30, criticalAlerts * 15);
            score += alertScore;
            factors.add(criticalAlerts + " active high/critical security alerts (+" + alertScore + " pts)");
        }

        // Cap at 100
        int finalScore = Math.min(100, Math.max(0, score));

        String level;
        if (finalScore <= 30) {
            level = "LOW";
        } else if (finalScore <= 60) {
            level = "MEDIUM";
        } else if (finalScore <= 80) {
            level = "HIGH";
        } else {
            level = "CRITICAL";
        }

        if (factors.isEmpty()) {
            factors.add("All perimeter security metrics nominal. No active anomalies detected.");
        }

        return new RiskEvaluation(finalScore, level, factors);
    }
}
