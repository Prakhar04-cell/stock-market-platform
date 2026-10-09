package com.bullrun.security.repository.jdbc;

import com.bullrun.security.model.EventSeverity;
import com.bullrun.security.model.SecurityEvent;
import com.bullrun.security.model.SecurityEventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("PART D & E: JDBC Connectivity & Database Operation Classes (CRUD via PreparedStatement)")
class SecurityEventJdbcDaoTest {

    @Autowired
    private DataSource dataSource;

    private SecurityEventJdbcDao jdbcDao;

    @BeforeEach
    void setUp() {
        jdbcDao = new SecurityEventJdbcDaoImpl(dataSource);
    }

    @Test
    @DisplayName("JDBC INSERT & SELECT: Parameterized PreparedStatement successfully persists and retrieves an event")
    void testJdbcInsertAndSelectById() {
        String eventId = UUID.randomUUID().toString();
        SecurityEvent event = new SecurityEvent();
        event.setId(eventId);
        event.setUserId("test-user-jdbc");
        event.setEventType(SecurityEventType.ORDER_SECURITY_EVENT);
        event.setEndpoint("/api/v1/orders/paper");
        event.setHttpMethod("POST");
        event.setStatus("AUTHORIZED");
        event.setTimestamp(Instant.now());
        event.setSeverity(EventSeverity.MEDIUM);
        event.setReason("Paper trading order placed via JDBC test");
        event.setIpAddress("192.168.1.100");
        event.setUserAgent("BullrunJdbcTestRunner/1.0");
        event.setMetadata("{\"orderType\":\"MARKET\",\"symbol\":\"TATAMOTORS\"}");

        // 1. Parameterized INSERT
        SecurityEvent saved = jdbcDao.save(event);
        assertNotNull(saved);
        assertEquals(eventId, saved.getId());

        // 2. Parameterized SELECT by Primary Key
        Optional<SecurityEvent> retrievedOpt = jdbcDao.findById(eventId);
        assertTrue(retrievedOpt.isPresent(), "Event must be retrieved via parameterized SELECT query");

        SecurityEvent retrieved = retrievedOpt.get();
        assertEquals(eventId, retrieved.getId());
        assertEquals("test-user-jdbc", retrieved.getUserId());
        assertEquals(SecurityEventType.ORDER_SECURITY_EVENT, retrieved.getEventType());
        assertEquals("/api/v1/orders/paper", retrieved.getEndpoint());
        assertEquals(EventSeverity.MEDIUM, retrieved.getSeverity());
        assertEquals("192.168.1.100", retrieved.getIpAddress());
    }

    @Test
    @DisplayName("JDBC UPDATE: Parameterized PreparedStatement successfully updates status and reason")
    void testJdbcUpdateStatus() {
        String eventId = UUID.randomUUID().toString();
        SecurityEvent event = new SecurityEvent();
        event.setId(eventId);
        event.setUserId("user-update-test");
        event.setEventType(SecurityEventType.RATE_LIMIT_EXCEEDED);
        event.setEndpoint("/api/java/portfolio/me");
        event.setHttpMethod("GET");
        event.setStatus("PENDING_REVIEW");
        event.setTimestamp(Instant.now());
        event.setSeverity(EventSeverity.HIGH);
        event.setReason("Initial rate limit alert");

        jdbcDao.save(event);

        // Parameterized UPDATE
        boolean updated = jdbcDao.updateStatus(eventId, "RESOLVED_AUTO", "Rate limit window cleared");
        assertTrue(updated, "PreparedStatement UPDATE must affect at least 1 row");

        Optional<SecurityEvent> reloaded = jdbcDao.findById(eventId);
        assertTrue(reloaded.isPresent());
        assertEquals("RESOLVED_AUTO", reloaded.get().getStatus());
        assertEquals("Rate limit window cleared", reloaded.get().getReason());
    }

    @Test
    @DisplayName("JDBC DELETE: Parameterized PreparedStatement successfully removes row by ID")
    void testJdbcDeleteById() {
        String eventId = UUID.randomUUID().toString();
        SecurityEvent event = new SecurityEvent();
        event.setId(eventId);
        event.setUserId("user-del-test");
        event.setEventType(SecurityEventType.LOGIN_SUCCESS);
        event.setEndpoint("/api/v1/auth/login");
        event.setHttpMethod("POST");
        event.setStatus("PROCESSED");
        event.setTimestamp(Instant.now());
        event.setSeverity(EventSeverity.LOW);

        jdbcDao.save(event);
        assertTrue(jdbcDao.findById(eventId).isPresent());

        // Parameterized DELETE
        boolean deleted = jdbcDao.deleteById(eventId);
        assertTrue(deleted, "PreparedStatement DELETE must succeed");

        Optional<SecurityEvent> afterDelete = jdbcDao.findById(eventId);
        assertTrue(afterDelete.isEmpty(), "Row must no longer exist after JDBC DELETE");
    }

    @Test
    @DisplayName("JDBC Query Pagination & Aggregate COUNT: SELECT with LIMIT/OFFSET and COUNT(*) functions properly")
    void testJdbcPaginationAndCount() {
        long initialCount = jdbcDao.countEvents();

        for (int i = 0; i < 3; i++) {
            SecurityEvent event = new SecurityEvent();
            event.setId(UUID.randomUUID().toString());
            event.setUserId("batch-user-" + i);
            event.setEventType(SecurityEventType.ADMIN_ACCESS);
            event.setEndpoint("/api/java/security/events");
            event.setHttpMethod("GET");
            event.setStatus("AUTHORIZED");
            event.setTimestamp(Instant.now());
            event.setSeverity(EventSeverity.CRITICAL);
            jdbcDao.save(event);
        }

        long countAfter = jdbcDao.countEvents();
        assertEquals(initialCount + 3, countAfter);

        long criticalCount = jdbcDao.countBySeverity(EventSeverity.CRITICAL);
        assertTrue(criticalCount >= 3, "Aggregate COUNT by severity must reflect saved critical events");

        List<SecurityEvent> page = jdbcDao.findAll(2, 0);
        assertEquals(2, page.size(), "LIMIT 2 must return exactly 2 rows");
    }
}
