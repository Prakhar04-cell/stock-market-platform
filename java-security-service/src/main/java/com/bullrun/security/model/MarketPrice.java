package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "market_prices", indexes = {
    @Index(name = "ix_market_prices_stock_id", columnList = "stock_id"),
    @Index(name = "ix_market_prices_timestamp", columnList = "timestamp")
})
public class MarketPrice {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "stock_id", length = 36, nullable = false)
    private String stockId;

    @Column(name = "instrument_key", length = 100)
    private String instrumentKey;

    @Column(name = "ltp", precision = 18, scale = 4)
    private BigDecimal ltp;

    @Column(name = "open", precision = 18, scale = 4)
    private BigDecimal openPrice;

    @Column(name = "high", precision = 18, scale = 4)
    private BigDecimal highPrice;

    @Column(name = "low", precision = 18, scale = 4)
    private BigDecimal lowPrice;

    @Column(name = "close", precision = 18, scale = 4)
    private BigDecimal closePrice;

    @Column(name = "volume")
    private Integer volume;

    @Column(name = "change", precision = 18, scale = 4)
    private BigDecimal priceChange;

    @Column(name = "change_percent", precision = 10, scale = 4)
    private BigDecimal changePercent;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    public MarketPrice() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getStockId() {
        return stockId;
    }

    public void setStockId(String stockId) {
        this.stockId = stockId;
    }

    public String getInstrumentKey() {
        return instrumentKey;
    }

    public void setInstrumentKey(String instrumentKey) {
        this.instrumentKey = instrumentKey;
    }

    public BigDecimal getLtp() {
        return ltp;
    }

    public void setLtp(BigDecimal ltp) {
        this.ltp = ltp;
    }

    public BigDecimal getOpenPrice() {
        return openPrice;
    }

    public void setOpenPrice(BigDecimal openPrice) {
        this.openPrice = openPrice;
    }

    public BigDecimal getHighPrice() {
        return highPrice;
    }

    public void setHighPrice(BigDecimal highPrice) {
        this.highPrice = highPrice;
    }

    public BigDecimal getLowPrice() {
        return lowPrice;
    }

    public void setLowPrice(BigDecimal lowPrice) {
        this.lowPrice = lowPrice;
    }

    public BigDecimal getClosePrice() {
        return closePrice;
    }

    public void setClosePrice(BigDecimal closePrice) {
        this.closePrice = closePrice;
    }

    public Integer getVolume() {
        return volume;
    }

    public void setVolume(Integer volume) {
        this.volume = volume;
    }

    public BigDecimal getPriceChange() {
        return priceChange;
    }

    public void setPriceChange(BigDecimal priceChange) {
        this.priceChange = priceChange;
    }

    public BigDecimal getChangePercent() {
        return changePercent;
    }

    public void setChangePercent(BigDecimal changePercent) {
        this.changePercent = changePercent;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
}
