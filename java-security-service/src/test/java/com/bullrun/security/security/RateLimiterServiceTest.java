package com.bullrun.security.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        // Limits: 10 general, 3 security, 5 analytics
        rateLimiterService = new RateLimiterService(true, 10, 3, 5);
        rateLimiterService.reset();
    }

    @Test
    void testAllowRequestsWithinLimit() {
        String clientIp = "192.168.1.10";

        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));
        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));
        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));
    }

    @Test
    void testBlockRequestsExceedingLimit() {
        String clientIp = "192.168.1.20";

        // Security limit is 3
        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));
        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));
        assertTrue(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));

        // 4th request must be rejected
        assertFalse(rateLimiterService.allowRequest(clientIp, RateLimiterService.EndpointCategory.SECURITY));

        long retryAfter = rateLimiterService.getRetryAfterSeconds(clientIp, RateLimiterService.EndpointCategory.SECURITY);
        assertTrue(retryAfter > 0);
    }

    @Test
    void testSeparateClientsHaveIndependentLimits() {
        String client1 = "10.0.0.1";
        String client2 = "10.0.0.2";

        for (int i = 0; i < 3; i++) {
            assertTrue(rateLimiterService.allowRequest(client1, RateLimiterService.EndpointCategory.SECURITY));
        }
        assertFalse(rateLimiterService.allowRequest(client1, RateLimiterService.EndpointCategory.SECURITY));

        // Client 2 should still be allowed
        assertTrue(rateLimiterService.allowRequest(client2, RateLimiterService.EndpointCategory.SECURITY));
    }
}
