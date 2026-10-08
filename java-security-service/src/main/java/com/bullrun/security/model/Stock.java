package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "stocks")
public class Stock {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "symbol", length = 30, nullable = false)
    private String symbol;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "instrument_key", length = 100)
    private String instrumentKey;

    @Column(name = "isin", length = 30)
    private String isin;

    @Column(name = "sector", length = 100)
    private String sector;

    @Column(name = "is_tradable", nullable = false)
    private Boolean isTradable = true;

    @Column(name = "lot_size", nullable = false)
    private Integer lotSize = 1;

    @Column(name = "tick_size", precision = 10, scale = 4, nullable = false)
    private BigDecimal tickSize = new BigDecimal("0.05");

    public Stock() {}

    public Stock(String id, String symbol, String name) {
        this.id = id;
        this.symbol = symbol;
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getInstrumentKey() {
        return instrumentKey;
    }

    public void setInstrumentKey(String instrumentKey) {
        this.instrumentKey = instrumentKey;
    }

    public String getIsin() {
        return isin;
    }

    public void setIsin(String isin) {
        this.isin = isin;
    }

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public Boolean getIsTradable() {
        return isTradable;
    }

    public void setIsTradable(Boolean tradable) {
        isTradable = tradable;
    }

    public Integer getLotSize() {
        return lotSize;
    }

    public void setLotSize(Integer lotSize) {
        this.lotSize = lotSize;
    }

    public BigDecimal getTickSize() {
        return tickSize;
    }

    public void setTickSize(BigDecimal tickSize) {
        this.tickSize = tickSize;
    }
}
