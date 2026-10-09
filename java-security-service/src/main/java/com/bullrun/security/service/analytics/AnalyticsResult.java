package com.bullrun.security.service.analytics;

import java.time.Instant;
import java.util.*;

/**
 * Standardized analytics result returned by analytics analyzers and strategies.
 * Utilizes Collections (Map, Set) and Generics to represent calculation outputs.
 */
public class AnalyticsResult {

    private final String strategyName;
    private final AnalyticsCategory category;
    private final Instant timestamp;
    private final Map<String, Object> metrics;
    private final Map<String, java.math.BigDecimal> symbolWiseValues;
    private final Set<String> uniqueSymbols;
    private final boolean success;
    private final String message;

    private AnalyticsResult(Builder builder) {
        this.strategyName = builder.strategyName;
        this.category = builder.category;
        this.timestamp = builder.timestamp != null ? builder.timestamp : Instant.now();
        this.metrics = Collections.unmodifiableMap(builder.metrics);
        this.symbolWiseValues = Collections.unmodifiableMap(builder.symbolWiseValues);
        this.uniqueSymbols = Collections.unmodifiableSet(builder.uniqueSymbols);
        this.success = builder.success;
        this.message = builder.message;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getStrategyName() {
        return strategyName;
    }

    public AnalyticsCategory getCategory() {
        return category;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public Map<String, java.math.BigDecimal> getSymbolWiseValues() {
        return symbolWiseValues;
    }

    public Set<String> getUniqueSymbols() {
        return uniqueSymbols;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public static class Builder {
        private String strategyName;
        private AnalyticsCategory category;
        private Instant timestamp;
        private Map<String, Object> metrics = new HashMap<>();
        private Map<String, java.math.BigDecimal> symbolWiseValues = new HashMap<>();
        private Set<String> uniqueSymbols = new HashSet<>();
        private boolean success = true;
        private String message = "Success";

        public Builder strategyName(String strategyName) {
            this.strategyName = strategyName;
            return this;
        }

        public Builder category(AnalyticsCategory category) {
            this.category = category;
            return this;
        }

        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public Builder metrics(Map<String, Object> metrics) {
            if (metrics != null) {
                this.metrics.putAll(metrics);
            }
            return this;
        }

        public Builder metric(String key, Object value) {
            this.metrics.put(key, value);
            return this;
        }

        public Builder symbolWiseValues(Map<String, java.math.BigDecimal> values) {
            if (values != null) {
                this.symbolWiseValues.putAll(values);
            }
            return this;
        }

        public Builder uniqueSymbols(Set<String> symbols) {
            if (symbols != null) {
                this.uniqueSymbols.addAll(symbols);
            }
            return this;
        }

        public Builder success(boolean success) {
            this.success = success;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public AnalyticsResult build() {
            return new AnalyticsResult(this);
        }
    }
}
