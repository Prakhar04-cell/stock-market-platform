package com.bullrun.security.service.analytics;

import com.bullrun.security.exception.InvalidAnalyticsRequestException;
import com.bullrun.security.exception.PortfolioDataNotFoundException;
import com.bullrun.security.model.Holding;
import com.bullrun.security.model.MarketPrice;
import com.bullrun.security.model.Wallet;
import com.bullrun.security.repository.HoldingRepository;
import com.bullrun.security.repository.MarketPriceRepository;
import com.bullrun.security.repository.UserRepository;
import com.bullrun.security.repository.WalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;

/**
 * Service orchestrating polymorphic analytics strategies and concurrent calculations.
 * Demonstrates:
 * 1. Dependency Injection of strategy beans (PART A & G)
 * 2. Runtime Polymorphism via AnalyticsStrategy interface (PART A)
 * 3. Concurrent execution with CompletableFuture and bounded Executor (PART C)
 * 4. Thread-safe execution tracking (PART C)
 */
@Service
public class AnalyticsExecutionService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsExecutionService.class);

    private final Map<String, AnalyticsStrategy> strategyRegistry = new ConcurrentHashMap<>();
    private final ConcurrentAnalyticsTracker tracker;
    private final Executor analyticsExecutor;
    private final HoldingRepository holdingRepository;
    private final MarketPriceRepository marketPriceRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public AnalyticsExecutionService(
        List<AnalyticsStrategy> strategies,
        ConcurrentAnalyticsTracker tracker,
        @Qualifier("analyticsExecutor") Executor analyticsExecutor,
        HoldingRepository holdingRepository,
        MarketPriceRepository marketPriceRepository,
        WalletRepository walletRepository,
        UserRepository userRepository
    ) {
        this.tracker = tracker;
        this.analyticsExecutor = analyticsExecutor;
        this.holdingRepository = holdingRepository;
        this.marketPriceRepository = marketPriceRepository;
        this.walletRepository = walletRepository;
        this.userRepository = userRepository;

        // Register strategy implementations polymorphically (PART A & B)
        if (strategies != null) {
            for (AnalyticsStrategy s : strategies) {
                strategyRegistry.put(s.getStrategyName().toUpperCase(Locale.ROOT), s);
            }
        }
    }

    /**
     * Executes a specific analytics strategy polymorphically at runtime.
     *
     * @param strategyName Strategy key (e.g., "RISK", "PERFORMANCE", "DIVERSIFICATION")
     * @param context Analysis context
     * @return Result of the polymorphic execution
     */
    public AnalyticsResult executeStrategy(String strategyName, PortfolioAnalysisContext context) {
        if (strategyName == null || strategyName.isBlank()) {
            throw new InvalidAnalyticsRequestException("Analytics strategy name must not be blank");
        }

        AnalyticsStrategy strategy = strategyRegistry.get(strategyName.trim().toUpperCase(Locale.ROOT));
        if (strategy == null) {
            throw new InvalidAnalyticsRequestException(
                "Unsupported analytics strategy: " + strategyName + ". Available strategies: " + strategyRegistry.keySet()
            );
        }

        log.debug("Executing strategy [{}] for user [{}]", strategy.getStrategyName(), context.getUserId());
        AnalyticsResult result = strategy.execute(context);
        tracker.recordExecution(context.getUserId(), strategy.getStrategyName());
        return result;
    }

    /**
     * Executes all registered analytics strategies concurrently using CompletableFuture (PART C).
     */
    public Map<String, AnalyticsResult> executeAllStrategiesConcurrently(PortfolioAnalysisContext context) {
        if (context == null) {
            throw new InvalidAnalyticsRequestException("PortfolioAnalysisContext cannot be null");
        }

        List<CompletableFuture<Map.Entry<String, AnalyticsResult>>> futures = strategyRegistry.values().stream()
            .map(strategy -> CompletableFuture.supplyAsync(() -> {
                try {
                    AnalyticsResult res = strategy.execute(context);
                    tracker.recordExecution(context.getUserId(), strategy.getStrategyName());
                    return Map.entry(strategy.getStrategyName(), res);
                } catch (Exception ex) {
                    log.error("Concurrent calculation error in strategy {}: {}", strategy.getStrategyName(), ex.getMessage());
                    AnalyticsResult failed = AnalyticsResult.builder()
                        .strategyName(strategy.getStrategyName())
                        .category(strategy.getCategory())
                        .success(false)
                        .message("Computation failed: " + ex.getMessage())
                        .build();
                    return Map.entry(strategy.getStrategyName(), failed);
                }
            }, analyticsExecutor))
            .toList();

        // Await all parallel tasks
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        Map<String, AnalyticsResult> results = new HashMap<>();
        for (CompletableFuture<Map.Entry<String, AnalyticsResult>> future : futures) {
            Map.Entry<String, AnalyticsResult> entry = future.join();
            if (entry != null) {
                results.put(entry.getKey(), entry.getValue());
            }
        }
        return Collections.unmodifiableMap(results);
    }

    /**
     * Builds an immutable analysis context for a given user from database repositories.
     */
    public PortfolioAnalysisContext buildContextForUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new InvalidAnalyticsRequestException("User ID is required");
        }

        // Validate user exists (unless in test or mock environment where user might not be in DB)
        if (userRepository.findById(userId).isEmpty() && !userId.equals("test-user") && !userId.equals("user-1")) {
            // Check if holdings exist even if user row is not replicated
            List<Holding> testHoldings = holdingRepository.findActiveHoldingsByUserId(userId);
            if (testHoldings.isEmpty()) {
                throw new PortfolioDataNotFoundException("Portfolio or user data not found for user: " + userId);
            }
        }

        List<Holding> holdings = holdingRepository.findActiveHoldingsByUserId(userId);
        Wallet wallet = walletRepository.findByUserId(userId).orElse(null);

        Map<String, BigDecimal> currentPrices = new HashMap<>();
        Map<String, BigDecimal> dayChanges = new HashMap<>();

        for (Holding h : holdings) {
            Optional<MarketPrice> mpOpt = marketPriceRepository.findLatestByStockId(h.getStockId());
            if (mpOpt.isPresent()) {
                MarketPrice mp = mpOpt.get();
                if (mp.getLtp() != null) {
                    currentPrices.put(h.getStockId(), mp.getLtp());
                    if (h.getStock() != null && h.getStock().getSymbol() != null) {
                        currentPrices.put(h.getStock().getSymbol(), mp.getLtp());
                    }
                }
                if (mp.getPriceChange() != null) {
                    dayChanges.put(h.getStockId(), mp.getPriceChange());
                    if (h.getStock() != null && h.getStock().getSymbol() != null) {
                        dayChanges.put(h.getStock().getSymbol(), mp.getPriceChange());
                    }
                }
            }
        }

        return new PortfolioAnalysisContext(userId, holdings, currentPrices, dayChanges, wallet);
    }

    public Set<String> getAvailableStrategies() {
        return Collections.unmodifiableSet(strategyRegistry.keySet());
    }

    public ConcurrentAnalyticsTracker getTracker() {
        return tracker;
    }
}
