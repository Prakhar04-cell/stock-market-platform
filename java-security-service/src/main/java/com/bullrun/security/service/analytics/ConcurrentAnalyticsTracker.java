package com.bullrun.security.service.analytics;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Thread-safe analytics execution tracker demonstrating Synchronization and Atomic Operations (PART C).
 * Employs ConcurrentHashMap, AtomicLong, and AtomicReference to manage shared mutable state
 * safely across concurrent request threads without coarse-grained locking bottlenecks.
 */
@Component
public class ConcurrentAnalyticsTracker {

    private final ConcurrentHashMap<String, AtomicLong> userExecutionCounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> strategyExecutionCounts = new ConcurrentHashMap<>();
    private final AtomicLong totalCalculationsCount = new AtomicLong(0);
    private final AtomicReference<Instant> lastExecutionTimestamp = new AtomicReference<>(Instant.now());

    /**
     * Atomically records an analytics execution for a user and strategy.
     */
    public void recordExecution(String userId, String strategyName) {
        if (userId != null && !userId.isBlank()) {
            userExecutionCounts.computeIfAbsent(userId, k -> new AtomicLong(0)).incrementAndGet();
        }
        if (strategyName != null && !strategyName.isBlank()) {
            strategyExecutionCounts.computeIfAbsent(strategyName, k -> new AtomicLong(0)).incrementAndGet();
        }
        totalCalculationsCount.incrementAndGet();
        lastExecutionTimestamp.set(Instant.now());
    }

    public long getUserExecutionCount(String userId) {
        AtomicLong counter = userExecutionCounts.get(userId);
        return counter != null ? counter.get() : 0L;
    }

    public long getStrategyExecutionCount(String strategyName) {
        AtomicLong counter = strategyExecutionCounts.get(strategyName);
        return counter != null ? counter.get() : 0L;
    }

    public long getTotalCalculationsCount() {
        return totalCalculationsCount.get();
    }

    public Instant getLastExecutionTimestamp() {
        return lastExecutionTimestamp.get();
    }

    public Map<String, Object> getSnapshotStatistics() {
        Map<String, Long> strategies = new HashMap<>();
        strategyExecutionCounts.forEach((k, v) -> strategies.put(k, v.get()));

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("totalCalculations", totalCalculationsCount.get());
        snapshot.put("lastExecutionTimestamp", lastExecutionTimestamp.get());
        snapshot.put("activeTrackedUsersCount", userExecutionCounts.size());
        snapshot.put("strategyBreakdown", Collections.unmodifiableMap(strategies));
        return Collections.unmodifiableMap(snapshot);
    }

    public void reset() {
        userExecutionCounts.clear();
        strategyExecutionCounts.clear();
        totalCalculationsCount.set(0);
        lastExecutionTimestamp.set(Instant.now());
    }
}
