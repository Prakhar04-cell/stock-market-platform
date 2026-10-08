package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "wallets", indexes = {
    @Index(name = "ix_wallets_user_id", columnList = "user_id")
})
public class Wallet {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false, unique = true)
    private String userId;

    @Column(name = "currency", length = 10, nullable = false)
    private String currency = "INR";

    @Column(name = "balance", precision = 18, scale = 4, nullable = false)
    private BigDecimal balance = new BigDecimal("100000.0000");

    @Column(name = "locked_balance", precision = 18, scale = 4, nullable = false)
    private BigDecimal lockedBalance = BigDecimal.ZERO;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Wallet() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public BigDecimal getLockedBalance() {
        return lockedBalance;
    }

    public void setLockedBalance(BigDecimal lockedBalance) {
        this.lockedBalance = lockedBalance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public BigDecimal getAvailableCash() {
        if (balance == null) return BigDecimal.ZERO;
        if (lockedBalance == null) return balance;
        return balance.subtract(lockedBalance);
    }
}
