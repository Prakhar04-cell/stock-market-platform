package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders", indexes = {
    @Index(name = "ix_orders_user_id", columnList = "user_id"),
    @Index(name = "ix_orders_status", columnList = "status"),
    @Index(name = "ix_orders_stock_id", columnList = "stock_id")
})
public class Order {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "wallet_id", length = 36, nullable = false)
    private String walletId;

    @Column(name = "stock_id", length = 36, nullable = false)
    private String stockId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stock_id", insertable = false, updatable = false)
    private Stock stock;

    @Column(name = "order_type", length = 20, nullable = false)
    private String orderType; // MARKET, LIMIT, STOP, STOP_LIMIT

    @Column(name = "side", length = 10, nullable = false)
    private String side; // BUY, SELL

    @Column(name = "quantity", precision = 14, scale = 4, nullable = false)
    private BigDecimal quantity;

    @Column(name = "price", precision = 18, scale = 4)
    private BigDecimal price;

    @Column(name = "stop_price", precision = 18, scale = 4)
    private BigDecimal stopPrice;

    @Column(name = "status", length = 30, nullable = false)
    private String status; // PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED

    @Column(name = "filled_quantity", precision = 14, scale = 4, nullable = false)
    private BigDecimal filledQuantity = BigDecimal.ZERO;

    @Column(name = "average_execution_price", precision = 18, scale = 4)
    private BigDecimal averageExecutionPrice;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderExecution> executions = new ArrayList<>();

    public Order() {}

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

    public String getWalletId() {
        return walletId;
    }

    public void setWalletId(String walletId) {
        this.walletId = walletId;
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

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public String getSide() {
        return side;
    }

    public void setSide(String side) {
        this.side = side;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getStopPrice() {
        return stopPrice;
    }

    public void setStopPrice(BigDecimal stopPrice) {
        this.stopPrice = stopPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getFilledQuantity() {
        return filledQuantity;
    }

    public void setFilledQuantity(BigDecimal filledQuantity) {
        this.filledQuantity = filledQuantity;
    }

    public BigDecimal getAverageExecutionPrice() {
        return averageExecutionPrice;
    }

    public void setAverageExecutionPrice(BigDecimal averageExecutionPrice) {
        this.averageExecutionPrice = averageExecutionPrice;
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

    public List<OrderExecution> getExecutions() {
        return executions;
    }

    public void setExecutions(List<OrderExecution> executions) {
        this.executions = executions;
    }
}
