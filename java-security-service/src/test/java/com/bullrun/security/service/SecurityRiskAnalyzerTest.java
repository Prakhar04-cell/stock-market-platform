package com.bullrun.security.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SecurityRiskAnalyzerTest {

    private SecurityRiskAnalyzer riskAnalyzer;

    @BeforeEach
    void setUp() {
        riskAnalyzer = new SecurityRiskAnalyzer();
    }

    @Test
    void testLowRiskWhenNominal() {
        var eval = riskAnalyzer.evaluateRisk(0, 0, 0, 0);
        assertEquals(0, eval.score());
        assertEquals("LOW", eval.level());
        assertFalse(eval.factors().isEmpty());
    }

    @Test
    void testMediumRisk() {
        // 4 failed auth (20 pts) + 2 blocked (16 pts) = 36 pts
        var eval = riskAnalyzer.evaluateRisk(4, 2, 0, 0);
        assertEquals(36, eval.score());
        assertEquals("MEDIUM", eval.level());
        assertEquals(2, eval.factors().size());
    }

    @Test
    void testHighRisk() {
        // 6 failed auth (30 pts cap) + 3 blocked (24 pts) + 1 rate limit (10 pts) = 64 pts
        var eval = riskAnalyzer.evaluateRisk(6, 3, 1, 0);
        assertEquals(64, eval.score());
        assertEquals("HIGH", eval.level());
    }

    @Test
    void testCriticalRiskCapsAt100() {
        // 10 failed auth (30 pts cap) + 5 blocked (25 pts cap) + 5 rate (25 pts cap) + 3 alerts (30 pts cap) = 110 -> 100
        var eval = riskAnalyzer.evaluateRisk(10, 5, 5, 3);
        assertEquals(100, eval.score());
        assertEquals("CRITICAL", eval.level());
    }
}
