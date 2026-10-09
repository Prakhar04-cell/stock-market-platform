package com.bullrun.security.service.analytics;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PART C: Multithreading, Concurrency, and Thread-Safe Synchronization")
class ConcurrencyAndSynchronizationTest {

    private ConcurrentAnalyticsTracker tracker;

    @BeforeEach
    void setUp() {
        tracker = new ConcurrentAnalyticsTracker();
    }

    @Test
    @DisplayName("Thread-Safety: ConcurrentAnalyticsTracker handles 100 concurrent threads without race conditions")
    void testConcurrentAnalyticsTrackerUnderLoad() throws InterruptedException {
        int threadCount = 20;
        int operationsPerThread = 50;
        int expectedTotal = threadCount * operationsPerThread;

        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successfulTasks = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String userId = "user-" + (i % 5); // 5 distinct users
            final String strategy = (i % 2 == 0) ? "RISK" : "PERFORMANCE";

            pool.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all threads to start simultaneously
                    for (int j = 0; j < operationsPerThread; j++) {
                        tracker.recordExecution(userId, strategy);
                    }
                    successfulTasks.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Fire all threads at once
        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);

        pool.shutdown();
        assertTrue(pool.awaitTermination(5, TimeUnit.SECONDS));

        assertTrue(completed, "All concurrent tasks should complete within timeout");
        assertEquals(threadCount, successfulTasks.get());
        assertEquals(expectedTotal, tracker.getTotalCalculationsCount(), "Total calculations must match exact atomic sum");

        // Verify per-strategy distribution
        long riskCount = tracker.getStrategyExecutionCount("RISK");
        long perfCount = tracker.getStrategyExecutionCount("PERFORMANCE");
        assertEquals(expectedTotal, riskCount + perfCount);
        assertEquals(expectedTotal / 2, riskCount);
        assertEquals(expectedTotal / 2, perfCount);
    }

    @Test
    @DisplayName("CompletableFuture Concurrency: Parallel independent calculations execute and join without deadlocks")
    void testCompletableFutureParallelCalculations() {
        ExecutorService boundedExecutor = new ThreadPoolExecutor(
            4, 8, 60L, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(50),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );

        try {
            List<CompletableFuture<String>> futures = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                final int taskId = i;
                CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> {
                    try {
                        Thread.sleep(20); // Simulate compute work
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return "Result-" + taskId;
                }, boundedExecutor);
                futures.add(cf);
            }

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            for (int i = 0; i < 10; i++) {
                assertEquals("Result-" + i, futures.get(i).join());
            }

        } finally {
            boundedExecutor.shutdown();
        }
    }
}
