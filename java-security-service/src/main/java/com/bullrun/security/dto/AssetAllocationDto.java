package com.bullrun.security.dto;

import java.math.BigDecimal;

public class AssetAllocationDto {

    private String symbol;
    private String name;
    private String sector;
    private BigDecimal currentAmount;
    private BigDecimal allocationPercentage;

    public AssetAllocationDto() {}

    public AssetAllocationDto(String symbol, String name, String sector, BigDecimal currentAmount, BigDecimal allocationPercentage) {
        this.symbol = symbol;
        this.name = name;
        this.sector = sector;
        this.currentAmount = currentAmount;
        this.allocationPercentage = allocationPercentage;
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

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public BigDecimal getAllocationPercentage() {
        return allocationPercentage;
    }

    public void setAllocationPercentage(BigDecimal allocationPercentage) {
        this.allocationPercentage = allocationPercentage;
    }
}
