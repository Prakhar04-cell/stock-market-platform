package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "holdings", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_holding_stock", columnNames = {"user_id", "stock_id"})
})
public class Holding {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "stock_id", length = 36, nullable = false)
    private String stockId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stock_id", insertable = false, updatable = false)
    private Stock stock;

    @Column(name = "quantity", precision = 14, scale = 4, nullable = false)
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "average_buy_price", precision = 18, scale = 4, nullable = false)
    private BigDecimal averageBuyPrice = BigDecimal.ZERO;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Holding() {}

    public Holding(String id, String userId, String stockId, BigDecimal quantity, BigDecimal averageBuyPrice) {
        this.id = id;
        this.userId = userId;
        this.stockId = stockId;
        this.quantity = quantity;
        this.averageBuyPrice = averageBuyPrice;
    }

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

    public String getStockId() {
        return stockId;
    }

    public void setStockId(String stockId) {
        this.stockId = stockId;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAverageBuyPrice() {
        return averageBuyPrice;
    }

    public void setAverageBuyPrice(BigDecimal averageBuyPrice) {
        this.averageBuyPrice = averageBuyPrice;
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

    public BigDecimal getInvestedValue() {
        if (quantity == null || averageBuyPrice == null) return BigDecimal.ZERO;
        return quantity.multiply(averageBuyPrice);
    }
}
