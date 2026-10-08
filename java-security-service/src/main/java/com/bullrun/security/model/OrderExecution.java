package com.bullrun.security.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "order_executions", indexes = {
    @Index(name = "ix_order_executions_order_id", columnList = "order_id"),
    @Index(name = "ix_order_executions_executed_at", columnList = "executed_at")
})
public class OrderExecution {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "order_id", length = 36, nullable = false)
    private String orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", insertable = false, updatable = false)
    private Order order;

    @Column(name = "execution_price", precision = 18, scale = 4, nullable = false)
    private BigDecimal executionPrice;

    @Column(name = "executed_quantity", precision = 14, scale = 4, nullable = false)
    private BigDecimal executedQuantity;

    @Column(name = "trade_charges", precision = 18, scale = 4, nullable = false)
    private BigDecimal tradeCharges = BigDecimal.ZERO;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @Column(name = "exchange_trade_id", length = 100)
    private String exchangeTradeId;

    public OrderExecution() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public BigDecimal getExecutionPrice() {
        return executionPrice;
    }

    public void setExecutionPrice(BigDecimal executionPrice) {
        this.executionPrice = executionPrice;
    }

    public BigDecimal getExecutedQuantity() {
        return executedQuantity;
    }

    public void setExecutedQuantity(BigDecimal executedQuantity) {
        this.executedQuantity = executedQuantity;
    }

    public BigDecimal getTradeCharges() {
        return tradeCharges;
    }

    public void setTradeCharges(BigDecimal tradeCharges) {
        this.tradeCharges = tradeCharges;
    }

    public Instant getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(Instant executedAt) {
        this.executedAt = executedAt;
    }

    public String getExchangeTradeId() {
        return exchangeTradeId;
    }

    public void setExchangeTradeId(String exchangeTradeId) {
        this.exchangeTradeId = exchangeTradeId;
    }
}
