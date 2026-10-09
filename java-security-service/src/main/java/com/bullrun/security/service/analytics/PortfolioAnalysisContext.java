package com.bullrun.security.service.analytics;

import com.bullrun.security.model.Holding;
import com.bullrun.security.model.Wallet;

import java.math.BigDecimal;
import java.util.*;

/**
 * Context container for portfolio analytics execution.
 * Encapsulates collections, price maps, and user metadata for analysis pipelines.
 */
public class PortfolioAnalysisContext {

    private final String userId;
    private final List<Holding> holdings;
    private final Map<String, BigDecimal> currentPrices;
    private final Map<String, BigDecimal> dayPriceChanges;
    private final Wallet wallet;

    public PortfolioAnalysisContext(
        String userId,
        List<Holding> holdings,
        Map<String, BigDecimal> currentPrices,
        Map<String, BigDecimal> dayPriceChanges,
        Wallet wallet
    ) {
        this.userId = Objects.requireNonNull(userId, "userId must not be null");
        this.holdings = holdings != null ? Collections.unmodifiableList(new ArrayList<>(holdings)) : Collections.emptyList();
        this.currentPrices = currentPrices != null ? Collections.unmodifiableMap(new HashMap<>(currentPrices)) : Collections.emptyMap();
        this.dayPriceChanges = dayPriceChanges != null ? Collections.unmodifiableMap(new HashMap<>(dayPriceChanges)) : Collections.emptyMap();
        this.wallet = wallet;
    }

    public String getUserId() {
        return userId;
    }

    public List<Holding> getHoldings() {
        return holdings;
    }

    public Map<String, BigDecimal> getCurrentPrices() {
        return currentPrices;
    }

    public Map<String, BigDecimal> getDayPriceChanges() {
        return dayPriceChanges;
    }

    public Optional<Wallet> getWallet() {
        return Optional.ofNullable(wallet);
    }

    public boolean hasHoldings() {
        return !holdings.isEmpty();
    }
}
