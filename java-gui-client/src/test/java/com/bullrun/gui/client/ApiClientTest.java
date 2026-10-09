package com.bullrun.gui.client;

import com.bullrun.gui.model.HoldingItem;
import com.bullrun.gui.model.SecurityEventItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PART I: JavaFX GUI Client Models & API Client Tests")
class ApiClientTest {

    @Test
    @DisplayName("ApiClient normalizes URLs and handles trailing slashes")
    void testUrlNormalization() {
        ApiClient client1 = new ApiClient("http://localhost:8081/");
        assertEquals("http://localhost:8081", client1.getBaseUrl());

        ApiClient client2 = new ApiClient("   http://127.0.0.1:8081/   ");
        assertEquals("http://127.0.0.1:8081", client2.getBaseUrl());

        ApiClient client3 = new ApiClient(null);
        assertEquals("http://localhost:8081", client3.getBaseUrl());
    }

    @Test
    @DisplayName("HoldingItem model correctly holds monetary metrics")
    void testHoldingItemModel() {
        HoldingItem item = new HoldingItem(
            "TCS", "Tata Consultancy Services", "IT",
            new BigDecimal("10"), new BigDecimal("3500.00"), new BigDecimal("3800.00"),
            new BigDecimal("35000.00"), new BigDecimal("38000.00"),
            new BigDecimal("3000.00"), new BigDecimal("8.57"), new BigDecimal("50.00")
        );

        assertEquals("TCS", item.getSymbol());
        assertEquals("IT", item.getSector());
        assertEquals(new BigDecimal("10"), item.getQuantity());
        assertEquals(new BigDecimal("38000.00"), item.getCurrentValue());
        assertEquals(new BigDecimal("3000.00"), item.getUnrealizedPnl());
    }

    @Test
    @DisplayName("SecurityEventItem model correctly holds audit trail attributes")
    void testSecurityEventItemModel() {
        SecurityEventItem item = new SecurityEventItem(
            "evt-123", "2026-10-09T12:00:00Z", "ADMIN_ACCESS",
            "/api/java/security/events", "GET", "AUTHORIZED", "HIGH",
            "10.0.0.1", "Admin access verified"
        );

        assertEquals("evt-123", item.getId());
        assertEquals("ADMIN_ACCESS", item.getEventType());
        assertEquals("HIGH", item.getSeverity());
        assertEquals("10.0.0.1", item.getIpAddress());
    }
}
