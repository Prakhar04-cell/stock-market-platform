package com.bullrun.security.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class RateLimiterService {

    private final boolean enabled;
    private final int generalLimit;
    private final int securityLimit;
    private final int analyticsLimit;

    // In-memory sliding window stores for client requests: key -> timestamps
    private final Map<String, ConcurrentLinkedQueue<Long>> requestWindows = new ConcurrentHashMap<>();

    public RateLimiterService(
        @Value("${bullrun.security.rate-limit.enabled:true}") boolean enabled,
        @Value("${bullrun.security.rate-limit.general-requests-per-minute:120}") int generalLimit,
        @Value("${bullrun.security.rate-limit.security-requests-per-minute:30}") int securityLimit,
        @Value("${bullrun.security.rate-limit.analytics-requests-per-minute:60}") int analyticsLimit
    ) {
        this.enabled = enabled;
        this.generalLimit = generalLimit;
        this.securityLimit = securityLimit;
        this.analyticsLimit = analyticsLimit;
    }

    /**
     * Checks rate limit for a client key and endpoint category.
     * @return true if request is allowed, false if rate limit exceeded.
     */
    public boolean allowRequest(String clientKey, EndpointCategory category) {
        if (!enabled) {
            return true;
        }

        int maxAllowed = switch (category) {
            case SECURITY -> securityLimit;
            case ANALYTICS -> analyticsLimit;
            case GENERAL -> generalLimit;
        };

        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1-minute window

        String compositeKey = category.name() + ":" + clientKey;
        ConcurrentLinkedQueue<Long> timestamps = requestWindows.computeIfAbsent(compositeKey, k -> new ConcurrentLinkedQueue<>());

        // Evict expired timestamps
        while (!timestamps.isEmpty()) {
            Long head = timestamps.peek();
            if (head != null && head < windowStart) {
                timestamps.poll();
            } else {
                break;
            }
        }

        if (timestamps.size() >= maxAllowed) {
            return false;
        }

        timestamps.offer(now);
        return true;
    }

    public long getRetryAfterSeconds(String clientKey, EndpointCategory category) {
        String compositeKey = category.name() + ":" + clientKey;
        ConcurrentLinkedQueue<Long> timestamps = requestWindows.get(compositeKey);
        if (timestamps == null || timestamps.isEmpty()) {
            return 1;
        }
        Long oldest = timestamps.peek();
        if (oldest == null) {
            return 1;
        }
        long waitMillis = Math.max(0, (oldest + 60_000L) - System.currentTimeMillis());
        return Math.max(1, waitMillis / 1000L);
    }

    public void reset() {
        requestWindows.clear();
    }

    public enum EndpointCategory {
        SECURITY,
        ANALYTICS,
        GENERAL
    }
}
